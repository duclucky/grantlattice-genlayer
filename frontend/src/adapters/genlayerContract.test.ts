import { describe, expect, it, vi } from "vitest";

import {
  createGenLayerAdapter,
  type GenLayerReadClient,
} from "./genlayerContract";
import type { Address, CreateRootInput } from "../domain/types";


const contractAddress = "0x9999999999999999999999999999999999999999" as Address;
const account = "0x1111111111111111111111111111111111111111" as Address;
const grantee = "0x2222222222222222222222222222222222222222" as Address;

const rawGrant = {
  grant_id: "root-1",
  parent_id: "",
  root_principal: account,
  grantor: account,
  grantee,
  capabilities_csv: "READ,SUMMARIZE",
  resources_csv: "case-1,case-2",
  clauses_json: '[{"id":"purpose","kind":"RESTRICTION","text":"Support only"}]',
  depth: 0,
  max_depth: 3,
  expires_at: 1_900_000_000,
  parent_version: 0,
  version: 1,
  status: "ACTIVE",
};

const config = {
  contractAddress,
  icRpcPath: "/api/genlayer",
  network: "studionet" as const,
};

function fixture() {
  const events: string[] = [];
  const readContract = vi.fn(async ({ functionName }: { functionName: string }) => {
    events.push(`read:${functionName}`);
    if (functionName === "get_grant") return rawGrant;
    if (functionName === "is_effective") return true;
    if (functionName === "get_review") throw new Error("unknown review");
    if (functionName === "list_grant_ids") return ["root-1"];
    if (functionName === "can_invoke") return "ALLOWED";
    throw new Error(`unexpected read ${functionName}`);
  });
  const readClient: GenLayerReadClient = {
    readContract,
    async waitForTransactionReceipt({ status }: { status: string }) {
      events.push(`wait:${status}`);
      return status === "FINALIZED"
        ? { statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN" }
        : { statusName: "ACCEPTED" };
    },
  };
  const writeContract = vi.fn(async () => {
    events.push("write");
    return "0xpublic-transaction-hash";
  });
  const walletSession = {
    account,
    provider: { request: vi.fn() },
    networkState: "ready" as const,
    writeClient: { writeContract },
  };
  return { events, readClient, readContract, walletSession, writeContract };
}

const rootInput: CreateRootInput = {
  grantId: "root-1",
  grantee,
  capabilities: ["SUMMARIZE", "READ"],
  resources: ["case-2", "case-1"],
  clauses: [{ id: "purpose", kind: "RESTRICTION", text: "Support only" }],
  expiresAt: 1_900_000_000,
  maxDepth: 3,
  nonce: "root-nonce",
};


describe("createGenLayerAdapter", () => {
  it("maps canonical grant fields without changing raw status meaning", async () => {
    const { readClient, walletSession } = fixture();
    const adapter = createGenLayerAdapter(readClient, walletSession, config);

    const grant = await adapter.getGrant("root-1");

    expect(grant).toEqual({
      grantId: "root-1",
      parentId: "",
      rootPrincipal: account,
      grantor: account,
      grantee,
      capabilities: ["READ", "SUMMARIZE"],
      resources: ["case-1", "case-2"],
      clauses: [{ id: "purpose", kind: "RESTRICTION", text: "Support only" }],
      depth: 0,
      maxDepth: 3,
      expiresAt: 1_900_000_000,
      status: "ACTIVE",
      effective: true,
    });
  });

  it("uses paginated canonical IDs and resolves each grant through get_grant", async () => {
    const { readClient, readContract, walletSession } = fixture();
    const adapter = createGenLayerAdapter(readClient, walletSession, config);

    expect((await adapter.listGrants()).map((grant) => grant.grantId)).toEqual(["root-1"]);
    expect(readContract.mock.calls.map(([args]) => args.functionName)).toEqual([
      "list_grant_ids",
      "get_grant",
      "is_effective",
    ]);
  });

  it("passes the authenticated actor in the canonical can_invoke ABI order", async () => {
    const { readClient, readContract, walletSession } = fixture();
    const adapter = createGenLayerAdapter(readClient, walletSession, config);

    await adapter.canInvoke("root-1", grantee, "READ", "case-1");

    expect(readContract).toHaveBeenCalledWith({
      address: contractAddress,
      functionName: "can_invoke",
      args: ["root-1", grantee, "READ", "case-1"],
      jsonSafeReturn: true,
    });
  });

  it("encodes exact sorted arguments, sends 0 GEN, and reloads only after finalized", async () => {
    const { events, readClient, walletSession, writeContract } = fixture();
    const adapter = createGenLayerAdapter(readClient, walletSession, config);

    const transaction = await adapter.createRoot(rootInput);
    expect(events).toEqual(["write"]);
    expect(writeContract).toHaveBeenCalledWith({
      address: contractAddress,
      functionName: "create_root_grant",
      args: [
        "root-1",
        grantee,
        "READ,SUMMARIZE",
        "case-1,case-2",
        '[{"id":"purpose","kind":"RESTRICTION","text":"Support only"}]',
        1_900_000_000,
        3,
        "root-nonce",
      ],
      value: 0n,
    });

    const stages: string[] = [];
    expect(await transaction.wait((stage) => stages.push(stage))).toBe("FINALIZED");
    expect(stages).toEqual(["ACCEPTED", "FINALIZED"]);
    expect(events).toEqual([
      "write",
      "wait:ACCEPTED",
      "wait:FINALIZED",
      "read:get_grant",
      "read:is_effective",
    ]);
  });

  it("accepts the raw Studio finalized receipt shape before canonical reload", async () => {
    const { events, readClient, walletSession } = fixture();
    readClient.waitForTransactionReceipt = vi.fn(async ({ status }: { status: string }) => {
      events.push(`wait:${status}`);
      return status === "FINALIZED"
        ? {
          status: 7,
          result: 6,
          consensus_data: {
            leader_receipt: [{ execution_result: "SUCCESS" }],
          },
        }
        : { status: 5 };
    });
    const adapter = createGenLayerAdapter(readClient, walletSession, config);

    const transaction = await adapter.createRoot(rootInput);

    expect(await transaction.wait()).toBe("FINALIZED");
    expect(events).toContain("read:get_grant");
  });

  it("fails closed on unavailable reads and disconnected or wrong-network writes", async () => {
    const { readClient, walletSession } = fixture();
    readClient.readContract = vi.fn(async () => { throw new Error("Failed to fetch"); });
    const unavailable = createGenLayerAdapter(readClient, walletSession, config);
    await expect(unavailable.canInvoke("root-1", grantee, "READ", "case-1")).rejects.toThrow("Failed to fetch");

    const disconnected = createGenLayerAdapter(
      readClient,
      { account: null, provider: null, networkState: "idle" },
      config,
    );
    await expect(disconnected.createRoot(rootInput)).rejects.toThrow("Connect a Studionet wallet");
  });
});
