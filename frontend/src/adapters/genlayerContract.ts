import type {
  AccessDecision,
  AccessReason,
  Address,
  CreateRootInput,
  GrantClause,
  GrantRecord,
  GrantStatus,
  ProposeChildInput,
  ReviewRecord,
  ReviewVerdict,
  TransactionStage,
  WriteRequest,
} from "../domain/types";
import type { Eip1193Provider } from "../wallet/types";
import type { WalletNetworkState } from "../wallet/WalletProvider";
import type { GrantLatticeAdapter } from "./contract";


interface ReadContractRequest {
  address: Address;
  functionName: string;
  args?: unknown[];
  jsonSafeReturn?: boolean;
}

interface ReceiptRequest {
  hash: string;
  status: string;
  interval?: number;
  retries?: number;
}

export interface GenLayerReadClient {
  readContract(request: ReadContractRequest): Promise<unknown>;
  waitForTransactionReceipt(request: ReceiptRequest): Promise<unknown>;
}

interface WriteContractRequest {
  address: Address;
  functionName: string;
  args: unknown[];
  value: bigint;
}

export interface GenLayerWriteClient {
  writeContract(request: WriteContractRequest): Promise<unknown>;
}

export interface BrowserWalletSession {
  account: Address | null;
  provider: Eip1193Provider | null;
  networkState: WalletNetworkState;
  writeClient?: GenLayerWriteClient;
}

export interface GenLayerAdapterConfig {
  contractAddress: Address;
  icRpcPath: string;
  network: "studionet";
}

const GRANT_STATUSES = new Set<GrantStatus>([
  "ACTIVE",
  "PROPOSED",
  "RETRYABLE",
  "DENIED",
  "REVOKED",
]);
const REVIEW_VERDICTS = new Set<ReviewVerdict>([
  "ATTENUATED",
  "EXPANSION",
  "AMBIGUOUS",
  "UNVERIFIABLE",
]);
const ACCESS_REASONS = new Set<AccessReason>([
  "ALLOWED",
  "GRANT_INACTIVE",
  "ANCESTOR_INACTIVE",
  "EXPIRED",
  "CAPABILITY_MISSING",
  "RESOURCE_MISSING",
]);
const ACCEPTED_STATUS = "ACCEPTED";
const FINALIZED_STATUS = "FINALIZED";

function record(value: unknown): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error("Canonical contract response has an invalid object shape.");
}

function field(source: Record<string, unknown>, snake: string, camel: string): unknown {
  return source[snake] ?? source[camel];
}

function stringField(source: Record<string, unknown>, snake: string, camel: string): string {
  const value = field(source, snake, camel);
  if (typeof value !== "string") throw new Error(`Canonical field ${snake} is invalid.`);
  return value;
}

function numberField(source: Record<string, unknown>, snake: string, camel: string): number {
  const value = field(source, snake, camel);
  const parsed = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Canonical field ${snake} is invalid.`);
  }
  return parsed;
}

function addressField(source: Record<string, unknown>, snake: string, camel: string): Address {
  const value = stringField(source, snake, camel);
  if (!/^0x[a-fA-F0-9]{40}$/u.test(value)) {
    throw new Error(`Canonical field ${snake} is not an address.`);
  }
  return value as Address;
}

function csv(value: string): string[] {
  return value === "" ? [] : value.split(",");
}

function parseClauses(value: string): GrantClause[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Canonical clauses JSON is invalid.");
  }
  if (!Array.isArray(parsed)) throw new Error("Canonical clauses JSON is not an array.");
  return parsed.map((item) => {
    const clause = record(item);
    if (
      typeof clause.id !== "string"
      || typeof clause.text !== "string"
      || (clause.kind !== "RESTRICTION" && clause.kind !== "PROHIBITION")
    ) {
      throw new Error("Canonical clause shape is invalid.");
    }
    return { id: clause.id, kind: clause.kind, text: clause.text };
  });
}

function mapGrant(value: unknown, effective: boolean): GrantRecord {
  const raw = record(value);
  const status = stringField(raw, "status", "status") as GrantStatus;
  if (!GRANT_STATUSES.has(status)) throw new Error("Canonical grant status is invalid.");
  return {
    grantId: stringField(raw, "grant_id", "grantId"),
    parentId: stringField(raw, "parent_id", "parentId"),
    rootPrincipal: addressField(raw, "root_principal", "rootPrincipal"),
    grantor: addressField(raw, "grantor", "grantor"),
    grantee: addressField(raw, "grantee", "grantee"),
    capabilities: csv(stringField(raw, "capabilities_csv", "capabilitiesCsv")),
    resources: csv(stringField(raw, "resources_csv", "resourcesCsv")),
    clauses: parseClauses(stringField(raw, "clauses_json", "clausesJson")),
    depth: numberField(raw, "depth", "depth"),
    maxDepth: numberField(raw, "max_depth", "maxDepth"),
    expiresAt: numberField(raw, "expires_at", "expiresAt"),
    status,
    effective,
  };
}

function mapReview(value: unknown): ReviewRecord {
  const raw = record(value);
  const verdict = stringField(raw, "verdict", "verdict") as ReviewVerdict;
  if (!REVIEW_VERDICTS.has(verdict)) throw new Error("Canonical review verdict is invalid.");
  return {
    childGrantId: stringField(raw, "child_id", "childId"),
    attempt: numberField(raw, "attempt", "attempt"),
    verdict,
    expansionClauseIds: csv(stringField(raw, "expansion_clause_ids_csv", "expansionClauseIdsCsv")),
    ambiguousClauseIds: csv(stringField(raw, "ambiguous_clause_ids_csv", "ambiguousClauseIdsCsv")),
    reason: stringField(raw, "reason_code", "reasonCode"),
  };
}

function isKnownAbsence(error: unknown, entity: "grant" | "review"): boolean {
  return error instanceof Error
    && error.message.toLowerCase().includes(`unknown ${entity}`);
}

function canonicalCsv(values: string[], label: string): string {
  if (new Set(values).size !== values.length) throw new Error(`${label} contain duplicates.`);
  return [...values].sort((left, right) => left.localeCompare(right)).join(",");
}

function canonicalClauses(clauses: GrantClause[]): string {
  return JSON.stringify(clauses.map((clause) => ({
    id: clause.id,
    kind: clause.kind,
    text: clause.text,
  })));
}

function normalizedReceipt(receipt: unknown): Record<string, unknown> {
  try {
    return record(receipt);
  } catch {
    return {};
  }
}

function successfulFinalized(receipt: unknown): boolean {
  const raw = normalizedReceipt(receipt);
  const status = raw.statusName ?? raw.status_name ?? raw.status;
  const leaders = recordOrEmpty(raw.consensus_data).leader_receipt;
  const leader = Array.isArray(leaders) ? recordOrEmpty(leaders[0]) : {};
  const execution = raw.txExecutionResultName
    ?? raw.executionResultName
    ?? recordOrEmpty(raw.execution_result).result
    ?? recordOrEmpty(raw.execution_result).status
    ?? leader.execution_result;
  const consensus = raw.resultName ?? raw.result_name ?? raw.result;
  if (status !== "FINALIZED" && status !== 7) return false;
  if (execution === "FINISHED_WITH_RETURN") return true;
  return execution === "SUCCESS"
    && (consensus === "MAJORITY_AGREE" || consensus === 6);
}

function recordOrEmpty(value: unknown): Record<string, unknown> {
  try {
    return record(value);
  } catch {
    return {};
  }
}

function retryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /retry|timeout|undetermined|no majority/iu.test(error.message);
}

async function createWalletWriteClient(
  wallet: BrowserWalletSession,
): Promise<GenLayerWriteClient> {
  const [{ createClient }, { studionet }] = await Promise.all([
    import("genlayer-js"),
    import("genlayer-js/chains"),
  ]);
  return createClient({
    chain: studionet,
    account: wallet.account as Address,
    provider: wallet.provider as never,
  }) as unknown as GenLayerWriteClient;
}

export function createGenLayerAdapter(
  readClient: GenLayerReadClient,
  wallet: BrowserWalletSession,
  config: GenLayerAdapterConfig,
): GrantLatticeAdapter {
  const read = async (functionName: string, args: unknown[] = []) => readClient.readContract({
    address: config.contractAddress,
    functionName,
    args,
    jsonSafeReturn: true,
  });

  const getGrant = async (grantId: string): Promise<GrantRecord | null> => {
    try {
      const raw = await read("get_grant", [grantId]);
      const effective = await read("is_effective", [grantId]);
      if (typeof effective !== "boolean") {
        throw new Error("Canonical effective result is invalid.");
      }
      return mapGrant(raw, effective);
    } catch (error) {
      if (isKnownAbsence(error, "grant")) return null;
      throw error;
    }
  };

  const getReview = async (grantId: string): Promise<ReviewRecord | null> => {
    try {
      return mapReview(await read("get_review", [grantId]));
    } catch (error) {
      if (isKnownAbsence(error, "review")) return null;
      throw error;
    }
  };

  const canonicalReload = async (grantId: string, includeReview: boolean) => {
    await getGrant(grantId);
    if (includeReview) await getReview(grantId);
  };

  const write = async (
    functionName: string,
    args: unknown[],
    grantId: string,
    includeReview = false,
  ): Promise<WriteRequest> => {
    if (!wallet.account || !wallet.provider || wallet.networkState !== "ready") {
      throw new Error("Connect a Studionet wallet before submitting this action.");
    }
    const writeClient = wallet.writeClient ?? await createWalletWriteClient(wallet);
    const hash = await writeClient.writeContract({
      address: config.contractAddress,
      functionName,
      args,
      value: 0n,
    });
    if (typeof hash !== "string") throw new Error("Wallet did not return a transaction hash.");

    return {
      hash,
      async wait(onStage) {
        try {
          await readClient.waitForTransactionReceipt({
            hash,
            status: ACCEPTED_STATUS,
            interval: 3_000,
            retries: 200,
          });
          onStage?.("ACCEPTED");
          const finalized = await readClient.waitForTransactionReceipt({
            hash,
            status: FINALIZED_STATUS,
            interval: 3_000,
            retries: 400,
          });
          if (!successfulFinalized(finalized)) return "FAILED";
          await canonicalReload(grantId, includeReview);
          onStage?.("FINALIZED");
          return "FINALIZED";
        } catch (error) {
          const stage: TransactionStage = retryableError(error) ? "RETRYABLE" : "FAILED";
          onStage?.(stage);
          return stage;
        }
      },
    };
  };

  return {
    async listGrants(account) {
      const ids: string[] = [];
      let offset = 0;
      while (true) {
        const page = await read("list_grant_ids", [offset, 25]);
        if (!Array.isArray(page) || !page.every((item) => typeof item === "string")) {
          throw new Error("Canonical grant index is invalid.");
        }
        ids.push(...page);
        if (page.length < 25) break;
        offset += page.length;
      }
      const resolved = await Promise.all(ids.map((grantId) => getGrant(grantId)));
      const grants = resolved.filter((grant): grant is GrantRecord => grant !== null);
      if (!account) return grants;
      const needle = account.toLowerCase();
      return grants.filter((grant) => [grant.rootPrincipal, grant.grantor, grant.grantee]
        .some((candidate) => candidate.toLowerCase() === needle));
    },
    getGrant,
    getReview,
    async canInvoke(grantId, capabilityId, resourceId): Promise<AccessDecision> {
      const value = await read("can_invoke", [grantId, capabilityId, resourceId]);
      if (typeof value !== "string" || !ACCESS_REASONS.has(value as AccessReason)) {
        throw new Error("Canonical access result is invalid.");
      }
      const reason = value as AccessReason;
      return { allowed: reason === "ALLOWED", reason };
    },
    createRoot(input: CreateRootInput) {
      return write("create_root_grant", [
        input.grantId,
        input.grantee,
        canonicalCsv(input.capabilities, "Capabilities"),
        canonicalCsv(input.resources, "Resources"),
        canonicalClauses(input.clauses),
        input.expiresAt,
        input.maxDepth,
        input.nonce,
      ], input.grantId);
    },
    proposeChild(input: ProposeChildInput) {
      return write("propose_child_grant", [
        input.parentId,
        input.childId,
        input.childGrantee,
        canonicalCsv(input.capabilities, "Capabilities"),
        canonicalCsv(input.resources, "Resources"),
        canonicalClauses(input.clauses),
        input.expiresAt,
        input.nonce,
      ], input.childId);
    },
    reviewChild(grantId: string) {
      return write("review_child_grant", [grantId], grantId, true);
    },
    revokeGrant(grantId: string, nonce: string) {
      return write("revoke_grant", [grantId, nonce], grantId);
    },
  };
}

type StudionetChain = typeof import("genlayer-js/chains").studionet;

function cloneStudionet(chain: StudionetChain): StudionetChain {
  return {
    ...chain,
    rpcUrls: {
      ...chain.rpcUrls,
      default: {
        ...chain.rpcUrls.default,
        http: [...chain.rpcUrls.default.http],
      },
    },
  };
}

export function createBrowserGenLayerAdapter(
  wallet: BrowserWalletSession,
  config: GenLayerAdapterConfig,
): GrantLatticeAdapter {
  let clientPromise: Promise<GenLayerReadClient> | undefined;
  const getClient = () => {
    clientPromise ??= Promise.all([
      import("genlayer-js"),
      import("genlayer-js/chains"),
    ]).then(([{ createClient }, { studionet }]) => createClient({
      chain: cloneStudionet(studionet),
      endpoint: config.icRpcPath,
    }) as unknown as GenLayerReadClient);
    return clientPromise;
  };
  const lazyReadClient: GenLayerReadClient = {
    async readContract(request) {
      return (await getClient()).readContract(request);
    },
    async waitForTransactionReceipt(request) {
      return (await getClient()).waitForTransactionReceipt(request);
    },
  };
  return createGenLayerAdapter(lazyReadClient, wallet, config);
}
