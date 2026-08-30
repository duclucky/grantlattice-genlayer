import type { GrantLatticeAdapter } from "../adapters/contract";
import type {
  AccessDecision,
  CreateRootInput,
  GrantRecord,
  ProposeChildInput,
  ReviewRecord,
  WriteRequest,
} from "../domain/types";

export const principal =
  "0x1111111111111111111111111111111111111111" as const;
export const parentGrantee =
  "0x2222222222222222222222222222222222222222" as const;
export const childGrantee =
  "0x3333333333333333333333333333333333333333" as const;

const rootGrant: GrantRecord = {
  grantId: "root-1",
  parentId: "",
  rootPrincipal: principal,
  grantor: principal,
  grantee: parentGrantee,
  capabilities: ["READ", "SUMMARIZE"],
  resources: ["case-1", "case-2"],
  clauses: [
    {
      id: "purpose",
      text: "Customer support only",
      kind: "RESTRICTION",
    },
    {
      id: "no-marketing",
      text: "Never use customer data for marketing",
      kind: "PROHIBITION",
    },
  ],
  depth: 0,
  maxDepth: 3,
  expiresAt: 1_900_000_000,
  status: "ACTIVE",
  effective: true,
};

const childGrant: GrantRecord = {
  grantId: "child-1",
  parentId: "root-1",
  rootPrincipal: principal,
  grantor: parentGrantee,
  grantee: childGrantee,
  capabilities: ["READ"],
  resources: ["case-1"],
  clauses: [
    {
      id: "purpose",
      text: "Customer support for case 1 only",
      kind: "RESTRICTION",
    },
    {
      id: "no-marketing",
      text: "Never use customer data for marketing",
      kind: "PROHIBITION",
    },
  ],
  depth: 1,
  maxDepth: 3,
  expiresAt: 1_800_000_000,
  status: "PROPOSED",
  effective: false,
};

const grants: GrantRecord[] = [rootGrant, childGrant];

const childReview: ReviewRecord = {
  childGrantId: "child-1",
  attempt: 0,
  verdict: "UNVERIFIABLE",
  expansionClauseIds: [],
  ambiguousClauseIds: [],
  reason: "Review has not finalized",
};

function finalizedWrite(hash: string): WriteRequest {
  return {
    hash,
    async wait() {
      return "FINALIZED";
    },
  };
}

export const canonicalTestAdapter: GrantLatticeAdapter = {
  async listGrants() {
    return grants.map((grant) => ({ ...grant }));
  },
  async getGrant(grantId) {
    const grant = grants.find((item) => item.grantId === grantId);
    return grant ? { ...grant } : null;
  },
  async getReview(grantId) {
    return grantId === childReview.childGrantId ? { ...childReview } : null;
  },
  async canInvoke(grantId, actor, capabilityId, resourceId): Promise<AccessDecision> {
    const grant = grants.find((item) => item.grantId === grantId);
    if (!grant?.effective) {
      return { allowed: false, reason: "GRANT_INACTIVE" };
    }
    if (actor.toLowerCase() !== grant.grantee.toLowerCase()) {
      return { allowed: false, reason: "ACTOR_MISMATCH" };
    }
    if (!grant.capabilities.includes(capabilityId)) {
      return { allowed: false, reason: "CAPABILITY_MISSING" };
    }
    if (!grant.resources.includes(resourceId)) {
      return { allowed: false, reason: "RESOURCE_MISSING" };
    }
    return { allowed: true, reason: "ALLOWED" };
  },
  async createRoot(_input: CreateRootInput) {
    return finalizedWrite("0xcreate-root");
  },
  async proposeChild(_input: ProposeChildInput) {
    return finalizedWrite("0xpropose-child");
  },
  async reviewChild(_grantId: string) {
    return finalizedWrite("0xreview-child");
  },
  async revokeGrant(_grantId: string, _nonce: string) {
    return finalizedWrite("0xrevoke-grant");
  },
};
