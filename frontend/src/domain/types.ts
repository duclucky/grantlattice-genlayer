export type Address = `0x${string}`;

export type GrantStatus =
  | "ACTIVE"
  | "PROPOSED"
  | "RETRYABLE"
  | "DENIED"
  | "REVOKED";

export type ReviewVerdict =
  | "ATTENUATED"
  | "EXPANSION"
  | "AMBIGUOUS"
  | "UNVERIFIABLE";

export type TransactionStage =
  | "SUBMITTED"
  | "ACCEPTED"
  | "FINALIZED"
  | "FAILED"
  | "RETRYABLE";

export type ClauseKind = "RESTRICTION" | "PROHIBITION";

export interface GrantClause {
  id: string;
  text: string;
  kind: ClauseKind;
}

export interface GrantRecord {
  grantId: string;
  parentId: string;
  rootPrincipal: Address;
  grantor: Address;
  grantee: Address;
  capabilities: string[];
  resources: string[];
  clauses: GrantClause[];
  depth: number;
  maxDepth: number;
  expiresAt: number;
  status: GrantStatus;
  effective: boolean;
}

export interface ReviewRecord {
  childGrantId: string;
  attempt: number;
  verdict: ReviewVerdict;
  expansionClauseIds: string[];
  ambiguousClauseIds: string[];
  reason: string;
}

export type AccessReason =
  | "ALLOWED"
  | "GRANT_INACTIVE"
  | "ACTOR_MISMATCH"
  | "ANCESTOR_INACTIVE"
  | "EXPIRED"
  | "CAPABILITY_MISSING"
  | "RESOURCE_MISSING"
  | "READ_UNAVAILABLE";

export interface AccessDecision {
  allowed: boolean;
  reason: AccessReason;
}

export interface CreateRootInput {
  grantId: string;
  grantee: Address;
  capabilities: string[];
  resources: string[];
  clauses: GrantClause[];
  expiresAt: number;
  maxDepth: number;
  nonce: string;
}

export interface ProposeChildInput {
  parentId: string;
  childId: string;
  childGrantee: Address;
  capabilities: string[];
  resources: string[];
  clauses: GrantClause[];
  expiresAt: number;
  nonce: string;
}

export interface WriteRequest {
  hash: string;
  wait(onStage?: (stage: TransactionStage) => void): Promise<TransactionStage>;
}
