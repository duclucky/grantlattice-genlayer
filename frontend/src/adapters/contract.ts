import type {
  AccessDecision,
  Address,
  CreateRootInput,
  GrantRecord,
  ProposeChildInput,
  ReviewRecord,
  WriteRequest,
} from "../domain/types";

export interface GrantLatticeAdapter {
  listGrants(account?: Address): Promise<GrantRecord[]>;
  getGrant(grantId: string): Promise<GrantRecord | null>;
  getReview(grantId: string): Promise<ReviewRecord | null>;
  canInvoke(
    grantId: string,
    actor: Address,
    capabilityId: string,
    resourceId: string,
  ): Promise<AccessDecision>;
  createRoot(input: CreateRootInput): Promise<WriteRequest>;
  proposeChild(input: ProposeChildInput): Promise<WriteRequest>;
  reviewChild(grantId: string): Promise<WriteRequest>;
  revokeGrant(grantId: string, nonce: string): Promise<WriteRequest>;
}
