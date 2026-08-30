import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App";
import { ContractAdapterProvider } from "../adapters/ContractAdapterProvider";
import type { GrantLatticeAdapter } from "../adapters/contract";
import { RuntimeTransactionProvider } from "../transactions/RuntimeTransactionProvider";
import {
  canonicalTestAdapter,
  parentGrantee,
  principal,
} from "../test/canonicalTestAdapter";
import { WalletProvider } from "../wallet/WalletProvider";
import type { Address } from "../domain/types";
import type { Eip1193Provider, WalletProviderInfo } from "../wallet/types";


function finalized(hash: string) {
  return {
    hash,
    async wait(onStage?: (stage: "ACCEPTED" | "FINALIZED") => void) {
      onStage?.("ACCEPTED");
      onStage?.("FINALIZED");
      return "FINALIZED" as const;
    },
  };
}

const activityConfig = {
  contractAddress: `0x${"b".repeat(40)}` as Address,
  icRpcPath: "/api/genlayer",
  network: "studionet" as const,
};

function setup(route: string, account: Address, adapter: GrantLatticeAdapter) {
  const request = vi.fn(async ({ method }: { method: string }) =>
    method === "eth_requestAccounts" ? [account] : null,
  );
  const provider: Eip1193Provider = { request };
  const info: WalletProviderInfo = {
    id: "wallet-1",
    name: "Test Wallet",
    rdns: "test.wallet",
    provider,
    selected: false,
  };
  render(
    <MemoryRouter initialEntries={[route]}>
      <WalletProvider discover={async () => [info]}>
        <ContractAdapterProvider adapter={adapter}>
          <RuntimeTransactionProvider config={activityConfig} loadHistory={async () => []}>
            <App />
          </RuntimeTransactionProvider>
        </ContractAdapterProvider>
      </WalletProvider>
    </MemoryRouter>,
  );
  return { request };
}

async function connect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Connect wallet" }));
  await user.click(await screen.findByRole("button", { name: "Test Wallet" }));
}


describe("real write journey controls", () => {
  it("does not read parent authority before wallet connection", async () => {
    const getGrant = vi.fn(canonicalTestAdapter.getGrant);
    const listGrants = vi.fn(canonicalTestAdapter.listGrants);
    setup("/grants/root-1/delegate", parentGrantee, {
      ...canonicalTestAdapter,
      getGrant,
      listGrants,
    });

    expect(await screen.findByRole("heading", { name: "Connect wallet to delegate" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Delegate from root-1" })).not.toBeInTheDocument();
    expect(getGrant).not.toHaveBeenCalled();
    expect(listGrants).not.toHaveBeenCalled();
  });

  it("does not display delegation form outside the connected wallet account", async () => {
    const user = userEvent.setup();
    const getGrant = vi.fn(canonicalTestAdapter.getGrant);
    const listGrants = vi.fn(async () => []);
    setup("/grants/root-1/delegate", parentGrantee, {
      ...canonicalTestAdapter,
      getGrant,
      listGrants,
    });
    await connect(user);

    expect(await screen.findByRole("heading", { name: "Parent authority unavailable for this wallet" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Delegate from root-1" })).not.toBeInTheDocument();
    await waitFor(() => expect(listGrants).toHaveBeenCalledWith(parentGrantee));
    expect(getGrant).not.toHaveBeenCalled();
  });

  it("submits a typed root write and navigates only after finalized", async () => {
    const user = userEvent.setup();
    const createRoot = vi.fn(async () => finalized("0xcreate"));
    setup("/grants/new", principal, { ...canonicalTestAdapter, createRoot });
    await connect(user);

    await user.type(screen.getByLabelText(/Grant ID/i), "root-ui");
    await user.type(screen.getByLabelText(/Grantee address/i), parentGrantee);
    await user.type(screen.getByLabelText(/^Capabilities/i), "SUMMARIZE, READ");
    await user.type(screen.getByLabelText(/^Resources/i), "case-2, case-1");
    await user.clear(screen.getByLabelText(/Maximum delegation depth/i));
    await user.type(screen.getByLabelText(/Maximum delegation depth/i), "3");
    await user.type(screen.getByLabelText(/^Expires at/i), "2030-01-01T12:00");
    await user.type(screen.getByLabelText(/Purpose restriction/i), "Customer support only");
    await user.type(screen.getByLabelText(/Prohibited use/i), "No marketing");
    await user.click(screen.getByRole("button", { name: "Create root grant" }));

    await waitFor(() => expect(createRoot).toHaveBeenCalledOnce());
    expect(createRoot).toHaveBeenCalledWith(expect.objectContaining({
      grantId: "root-ui",
      grantee: parentGrantee,
      capabilities: ["SUMMARIZE", "READ"],
      resources: ["case-2", "case-1"],
      maxDepth: 3,
      nonce: expect.any(String),
    }));
  });

  it("requires the live parent grantee and submits a bounded child write", async () => {
    const user = userEvent.setup();
    const proposeChild = vi.fn(async () => finalized("0xchild"));
    setup("/grants/root-1/delegate", parentGrantee, {
      ...canonicalTestAdapter,
      proposeChild,
    });
    await connect(user);

    await user.type(screen.getByLabelText(/Child grant ID/i), "child-ui");
    await user.type(
      screen.getByLabelText(/Child grantee address/i),
      "0x3333333333333333333333333333333333333333",
    );
    await user.type(screen.getByLabelText(/^Capabilities/i), "READ");
    await user.type(screen.getByLabelText(/^Resources/i), "case-1");
    await user.type(screen.getByLabelText(/^Expires at/i), "2029-01-01T12:00");
    await user.type(screen.getByLabelText(/Purpose restriction/i), "Case 1 support only");
    await user.type(screen.getByLabelText(/Prohibited use/i), "No marketing or resale");
    await user.click(screen.getByRole("button", { name: "Propose child grant" }));

    await waitFor(() => expect(proposeChild).toHaveBeenCalledOnce());
    expect(proposeChild).toHaveBeenCalledWith(expect.objectContaining({
      parentId: "root-1",
      childId: "child-ui",
      capabilities: ["READ"],
      resources: ["case-1"],
    }));
  });

  it("shows review only to the recorded grantor and tracks finality", async () => {
    const user = userEvent.setup();
    const reviewChild = vi.fn(async () => finalized("0xreview"));
    setup("/grants/child-1", parentGrantee, {
      ...canonicalTestAdapter,
      reviewChild,
    });
    await connect(user);

    await user.click(await screen.findByRole("button", { name: "Request semantic review" }));
    await waitFor(() => expect(reviewChild).toHaveBeenCalledWith("child-1"));
  });

  it("shows protective revoke only to canonical authority", async () => {
    const user = userEvent.setup();
    const revokeGrant = vi.fn(async () => finalized("0xrevoke"));
    setup("/grants/root-1", principal, { ...canonicalTestAdapter, revokeGrant });
    await connect(user);

    await user.click(await screen.findByRole("button", { name: "Revoke grant" }));
    await waitFor(() => expect(revokeGrant).toHaveBeenCalledWith("root-1", expect.any(String)));
  });
});
