import { describe, expect, it } from "vitest";

import { unconfiguredContract } from "./unconfiguredContract";
import type {
  CreateRootInput,
  ProposeChildInput,
} from "../domain/types";

const address = "0x1111111111111111111111111111111111111111" as const;

const rootInput: CreateRootInput = {
  grantId: "root-1",
  grantee: address,
  capabilities: ["READ"],
  resources: ["case-1"],
  clauses: [
    { id: "purpose", text: "Customer support only", kind: "RESTRICTION" },
  ],
  expiresAt: 1_800_000_000,
  maxDepth: 3,
  nonce: "root-nonce",
};

const childInput: ProposeChildInput = {
  parentId: "root-1",
  childId: "child-1",
  childGrantee: address,
  capabilities: ["READ"],
  resources: ["case-1"],
  clauses: [
    {
      id: "purpose",
      text: "Customer support for case 1 only",
      kind: "RESTRICTION",
    },
  ],
  expiresAt: 1_700_000_000,
  nonce: "child-nonce",
};

describe("unconfiguredContract", () => {
  it("fails every read and write closed instead of returning fixture state", async () => {
    const operations = [
      unconfiguredContract.listGrants(address),
      unconfiguredContract.getGrant("grant-1"),
      unconfiguredContract.getReview("grant-1"),
      unconfiguredContract.canInvoke("grant-1", "READ", "case-1"),
      unconfiguredContract.createRoot(rootInput),
      unconfiguredContract.proposeChild(childInput),
      unconfiguredContract.reviewChild("child-1"),
      unconfiguredContract.revokeGrant("grant-1", "revoke-nonce"),
    ];

    for (const operation of operations) {
      await expect(operation).rejects.toThrow(
        "GrantLattice contract is not configured",
      );
    }
  });
});
