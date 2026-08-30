import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";


const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT_PATH = join(PROJECT_ROOT, "contracts", "grant_lattice.py");
const PROJECT_ENV_PATH = join(PROJECT_ROOT, ".env");
const PARENT_ENV_PATH = join(PROJECT_ROOT, "..", ".env");
const EVIDENCE_DIR = join(PROJECT_ROOT, "docs", "evidence", "studionet");
const DEPLOYMENT_PATH = join(EVIDENCE_DIR, "deployment.json");
const DEPLOYMENT_ATTEMPTS_PATH = join(EVIDENCE_DIR, "deployment-attempts.json");
const FUNDING_PATH = join(EVIDENCE_DIR, "delegate-funding.json");
const LIFECYCLE_PATH = join(EVIDENCE_DIR, "lifecycle.json");
const RPC_URL = "https://studio.genlayer.com/api";
const EXPLORER_URL = "https://explorer-studio.genlayer.com";
const GEN = 10n ** 18n;
const IDENTITY_KEYS = ["network", "chainId", "sourceCommit", "sourceSha256", "depends", "deployer", "delegate"];


function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}


function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}


function parseEnvironmentText(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[match[1]] = value;
  }
  return parsed;
}


function readEnvironmentFile(path) {
  return existsSync(path) ? parseEnvironmentText(readFileSync(path, "utf8")) : {};
}


export function mergeEnvironment(projectEnvironment, parentEnvironment) {
  return { ...parentEnvironment, ...projectEnvironment };
}


function loadAuthorizedEnvironment() {
  const loaded = mergeEnvironment(readEnvironmentFile(PROJECT_ENV_PATH), readEnvironmentFile(PARENT_ENV_PATH));
  for (const [name, value] of Object.entries(loaded)) {
    if (!process.env[name]) process.env[name] = value;
  }
  if (!process.env.STUDIONET_PRIVATE_KEY) {
    throw new Error("Required authorized variable STUDIONET_PRIVATE_KEY is missing.");
  }
  return {
    hasPrimary: Boolean(process.env.STUDIONET_PRIVATE_KEY),
    hasDelegate: Boolean(process.env.STUDIONET_DELEGATE_PRIVATE_KEY),
  };
}


function privateKey(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Required authorized variable ${name} is missing.`);
  const normalized = value.startsWith("0x") ? value : `0x${value}`;
  if (!/^0x[a-fA-F0-9]{64}$/u.test(normalized)) throw new Error(`Authorized variable ${name} is malformed.`);
  return normalized;
}


function ensureDelegatePrivateKey() {
  const availability = loadAuthorizedEnvironment();
  if (availability.hasDelegate) return false;
  const generated = generatePrivateKey();
  const prefix = existsSync(PROJECT_ENV_PATH) && readFileSync(PROJECT_ENV_PATH, "utf8").length > 0 ? "\n" : "";
  appendFileSync(PROJECT_ENV_PATH, `${prefix}STUDIONET_DELEGATE_PRIVATE_KEY=${generated}\n`, { encoding: "utf8", mode: 0o600 });
  process.env.STUDIONET_DELEGATE_PRIVATE_KEY = generated;
  return true;
}


function formatGen(value) {
  const amount = BigInt(value);
  const whole = amount / GEN;
  const remainder = amount % GEN;
  if (remainder === 0n) return `${whole}`;
  return `${whole}.${remainder.toString().padStart(18, "0").replace(/0+$/u, "")}`;
}


function jsonSafe(value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Map) return Object.fromEntries([...value.entries()].map(([key, item]) => [key, jsonSafe(item)]));
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  }
  return value;
}


function field(value, snake, camel = snake) {
  return value?.[snake] ?? value?.[camel];
}


function leaderExecution(receipt) {
  if (receipt?.execution_result !== undefined) return receipt.execution_result;
  const leaders = receipt?.consensus_data?.leader_receipt;
  return Array.isArray(leaders) && leaders[0] ? leaders[0].execution_result : undefined;
}


function receiptStatus(receipt) {
  if (receipt?.statusName) return receipt.statusName;
  if (receipt?.status_name) return receipt.status_name;
  if (receipt?.status === 7) return "FINALIZED";
  if (receipt?.status === 5) return "ACCEPTED";
  return receipt?.status ?? null;
}


function consensusResult(receipt) {
  if (receipt?.resultName) return receipt.resultName;
  if (receipt?.result_name) return receipt.result_name;
  if (receipt?.result === 6) return "MAJORITY_AGREE";
  return receipt?.result ?? null;
}


function executionResult(receipt) {
  const normalized = receipt?.txExecutionResultName ?? receipt?.executionResultName;
  if (normalized) return normalized;
  const raw = leaderExecution(receipt);
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") return raw.result ?? raw.name ?? raw.status ?? null;
  return null;
}


function contractAddressFromReceipt(receipt) {
  const candidates = [receipt?.contractAddress, receipt?.contract_address, receipt?.data?.contract_address, receipt?.data?.contractAddress, receipt?.txDataDecoded?.contractAddress];
  return candidates.find((value) => typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value));
}


export function safeReceiptProjection(receipt, label, fallbackHash) {
  return {
    label,
    transactionHash: receipt?.hash ?? receipt?.transactionHash ?? fallbackHash ?? null,
    status: receiptStatus(receipt),
    txExecutionResult: executionResult(receipt),
    consensusResult: consensusResult(receipt),
    contractAddress: contractAddressFromReceipt(receipt) ?? null,
  };
}


export function isSuccessfulFinalizedReceipt(receipt) {
  if (receiptStatus(receipt) !== "FINALIZED") return false;
  const execution = executionResult(receipt);
  if (execution === "FINISHED_WITH_RETURN") return true;
  return execution === "SUCCESS" && consensusResult(receipt) === "MAJORITY_AGREE";
}


export function isExpectedRejectedReceipt(receipt) {
  return receiptStatus(receipt) === "FINALIZED"
    && !isSuccessfulFinalizedReceipt(receipt)
    && ["ERROR", "REVERTED", "FAILED", "FINISHED_WITH_ERROR"].includes(executionResult(receipt));
}


export function delegateFundingDecision(balance) {
  return BigInt(balance) >= GEN ? "READY" : "FUND_1_GEN";
}


export function deploymentDecision(existing, current) {
  if (!existing) return "DEPLOY";
  const identical = IDENTITY_KEYS.every((key) => existing[key] === current[key]);
  if (identical && existing.active === true && existing.result === "SUCCESS" && existing.contractAddress) return "RESUME";
  return "REFUSE";
}


export function selectNextLifecycleAction(state) {
  if (!state || !state.rootStatus) return "CREATE_ROOT";
  if (state.rootStatus === "ACTIVE" && !state.objectiveExpansionProved) return "PROVE_OBJECTIVE_REJECTION";
  if (state.rootStatus === "ACTIVE" && state.objectiveExpansionProved && !state.validStatus) return "PROPOSE_VALID";
  if (state.rootStatus === "ACTIVE" && state.validStatus === "PROPOSED") return "REVIEW_VALID";
  if (state.rootStatus === "ACTIVE" && state.validStatus === "ACTIVE" && !state.expansionStatus) return "PROPOSE_EXPANSION";
  if (state.rootStatus === "ACTIVE" && state.expansionStatus === "PROPOSED") return "REVIEW_EXPANSION";
  if (state.rootStatus === "ACTIVE" && state.expansionStatus === "DENIED" && !state.ambiguousStatus) return "PROPOSE_AMBIGUOUS";
  if (state.rootStatus === "ACTIVE" && state.ambiguousStatus === "PROPOSED") return "REVIEW_AMBIGUOUS";
  if (state.rootStatus === "ACTIVE" && state.ambiguousStatus === "RETRYABLE" && state.accessBefore == null) return "CHECK_ACCESS_BEFORE";
  if (state.rootStatus === "ACTIVE" && state.accessBefore === "ALLOWED") return "REVOKE_ROOT";
  if (state.rootStatus === "REVOKED" && state.accessBefore === "ALLOWED" && state.accessAfter == null) return "CHECK_ACCESS_AFTER";
  if (state.rootStatus === "REVOKED" && state.accessAfter === "ANCESTOR_INACTIVE") return "COMPLETE";
  return "STOP_INCONSISTENT";
}


async function chainId() {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
  });
  if (!response.ok) throw new Error("Studionet RPC health check failed.");
  const body = await response.json();
  if (body.result !== "0xf22f") throw new Error("Studionet RPC returned an unexpected chain ID.");
  return 61999;
}


function currentIdentity(deployer, delegate) {
  const source = readFileSync(CONTRACT_PATH);
  const firstLine = source.toString("ascii").split(/\r?\n/u, 1)[0];
  const depends = JSON.parse(firstLine.slice(1).trim()).Depends;
  return {
    network: "studionet",
    chainId: 61999,
    rpc: RPC_URL,
    repositoryCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: PROJECT_ROOT, encoding: "utf8" }).trim(),
    sourceCommit: execFileSync("git", ["log", "-1", "--format=%H", "--", "contracts/grant_lattice.py"], { cwd: PROJECT_ROOT, encoding: "utf8" }).trim(),
    sourceSha256: createHash("sha256").update(source).digest("hex"),
    depends,
    deployer,
    delegate,
  };
}


function roleClients(requireDelegate = true) {
  const availability = loadAuthorizedEnvironment();
  if (requireDelegate && !availability.hasDelegate) throw new Error("Run studionet:prepare-delegate before deployment.");
  const principalAccount = createAccount(privateKey("STUDIONET_PRIVATE_KEY"));
  const delegateAccount = availability.hasDelegate ? createAccount(privateKey("STUDIONET_DELEGATE_PRIVATE_KEY")) : null;
  return {
    availability,
    readClient: createClient({ chain: studionet }),
    principalAccount,
    delegateAccount,
    principalClient: createClient({ chain: studionet, account: principalAccount }),
    delegateClient: delegateAccount ? createClient({ chain: studionet, account: delegateAccount }) : null,
  };
}


async function balance(client, address) {
  return client.getBalance({ address });
}


async function rpc(method, params) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`${method} HTTP request failed.`);
  const body = await response.json();
  if (body.error) throw new Error(`${method} RPC request failed (${body.error.code}).`);
  return body.result;
}


async function waitForEvmReceipt(hash) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const receipt = await rpc("eth_getTransactionReceipt", [hash]);
    if (receipt?.blockNumber) {
      if (receipt.status !== "0x1") throw new Error("Delegate funding transaction reverted.");
      return { transactionHash: hash, blockNumber: Number.parseInt(receipt.blockNumber, 16), status: "CONFIRMED" };
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 3_000));
  }
  throw new Error("Delegate funding transaction timed out.");
}


async function waitForBalanceAtLeast(client, address, minimum) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const current = await balance(client, address);
    if (current >= minimum) return current;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 3_000));
  }
  throw new Error("Confirmed funding was not reflected in the delegate balance before timeout.");
}


async function confirmDelegateFunding(clients, hash, before) {
  const receipt = await waitForEvmReceipt(hash);
  const transaction = await rpc("eth_getTransactionByHash", [hash]);
  const rawReceipt = await rpc("eth_getTransactionReceipt", [hash]);
  if (
    rawReceipt?.from?.toLowerCase() !== clients.principalAccount.address.toLowerCase()
    || rawReceipt?.to?.toLowerCase() !== clients.delegateAccount.address.toLowerCase()
    || BigInt(transaction?.value ?? 0) !== GEN
  ) {
    throw new Error("Delegate funding transaction actor/value binding mismatch.");
  }
  const after = await waitForBalanceAtLeast(clients.readClient, clients.delegateAccount.address, BigInt(before) + GEN);
  const evidence = {
    network: "studionet",
    chainId: 61999,
    source: clients.principalAccount.address,
    destination: clients.delegateAccount.address,
    valueGEN: "1",
    transactionHash: hash,
    explorer: `${EXPLORER_URL}/tx/${hash}`,
    status: receipt.status,
    blockNumber: receipt.blockNumber,
    destinationBalanceBeforeGEN: formatGen(before),
    destinationBalanceAfterGEN: formatGen(after),
    confirmedAt: new Date().toISOString(),
  };
  writeJson(FUNDING_PATH, evidence);
  return evidence;
}


async function prepareDelegate() {
  const generated = ensureDelegatePrivateKey();
  const clients = roleClients(true);
  await chainId();
  const delegateAddress = clients.delegateAccount.address;
  const before = await balance(clients.readClient, delegateAddress);
  const decision = delegateFundingDecision(before);
  const existing = readJson(FUNDING_PATH, undefined);
  if (decision === "READY") {
    if (existing?.status === "SUBMITTED" && existing.transactionHash) {
      const confirmed = await confirmDelegateFunding(clients, existing.transactionHash, BigInt(existing.destinationBalanceBeforeRaw));
      console.log(JSON.stringify({ Result: "SUCCESS", delegate: delegateAddress, valueGEN: "1", balanceGEN: confirmed.destinationBalanceAfterGEN, transactionHash: existing.transactionHash }, null, 2));
      return;
    }
    console.log(JSON.stringify({ Result: "SUCCESS", generated, resumed: Boolean(existing), delegate: delegateAddress, balanceGEN: formatGen(before) }, null, 2));
    return;
  }
  const principalBefore = await balance(clients.readClient, clients.principalAccount.address);
  if (principalBefore <= GEN) throw new Error("Primary wallet does not have enough GEN to fund the delegate safely.");
  const hash = await clients.principalClient.sendTransaction({ account: clients.principalAccount, to: delegateAddress, value: GEN });
  writeJson(FUNDING_PATH, {
    network: "studionet",
    chainId: 61999,
    source: clients.principalAccount.address,
    destination: delegateAddress,
    valueGEN: "1",
    transactionHash: hash,
    explorer: `${EXPLORER_URL}/tx/${hash}`,
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
    destinationBalanceBeforeGEN: formatGen(before),
    destinationBalanceBeforeRaw: before.toString(),
  });
  console.log(JSON.stringify({ stage: "SUBMITTED", action: "FUND_DELEGATE", valueGEN: "1", transactionHash: hash }, null, 2));
  const confirmed = await confirmDelegateFunding(clients, hash, before);
  console.log(JSON.stringify({ Result: "SUCCESS", delegate: delegateAddress, valueGEN: "1", balanceGEN: confirmed.destinationBalanceAfterGEN, transactionHash: hash }, null, 2));
}


async function recoverDelegateFunding(hash) {
  if (!/^0x[a-fA-F0-9]{64}$/u.test(hash ?? "")) throw new Error("A valid public funding transaction hash is required.");
  ensureDelegatePrivateKey();
  const clients = roleClients(true);
  await chainId();
  const current = await balance(clients.readClient, clients.delegateAccount.address);
  const before = current >= GEN ? current - GEN : 0n;
  const confirmed = await confirmDelegateFunding(clients, hash, before);
  console.log(JSON.stringify({ Result: "SUCCESS", recovered: true, delegate: clients.delegateAccount.address, valueGEN: "1", balanceGEN: confirmed.destinationBalanceAfterGEN, transactionHash: hash }, null, 2));
}


async function readView(client, address, functionName, args = []) {
  const value = await client.readContract({ address, functionName, args, jsonSafeReturn: true });
  if (typeof value === "string") {
    try { return jsonSafe(JSON.parse(value)); } catch { return value; }
  }
  return jsonSafe(value);
}


async function grantIdSet(client, address) {
  const ids = await readView(client, address, "list_grant_ids", [0, 25]);
  if (!Array.isArray(ids) || !ids.every((item) => typeof item === "string")) {
    throw new Error("Canonical grant index has an invalid shape.");
  }
  return new Set(ids);
}


async function waitForAcceptedAndFinalized(client, hash, label, expectedResult = "SUCCESS", onAccepted) {
  const accepted = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 200, interval: 3_000 });
  await onAccepted?.(accepted);
  await client.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, retries: 400, interval: 3_000 });
  const finalized = await client.getTransaction({ hash });
  const valid = expectedResult === "SUCCESS" ? isSuccessfulFinalizedReceipt(finalized) : isExpectedRejectedReceipt(finalized);
  if (!valid) {
    const safe = safeReceiptProjection(finalized, label, hash);
    throw new Error(`${label} finalized with unexpected result (${safe.status}/${safe.txExecutionResult}/${safe.consensusResult}).`);
  }
  return { accepted, finalized };
}


function attemptsFile() {
  return readJson(DEPLOYMENT_ATTEMPTS_PATH, { network: "studionet", attempts: [] });
}


function updateAttempt(hash, patch) {
  const file = attemptsFile();
  const index = file.attempts.findIndex((attempt) => attempt.transactionHash === hash);
  if (index < 0) file.attempts.push({ transactionHash: hash, ...patch });
  else file.attempts[index] = { ...file.attempts[index], ...patch };
  writeJson(DEPLOYMENT_ATTEMPTS_PATH, file);
}


async function deploymentInspection(clients) {
  const existing = readJson(DEPLOYMENT_PATH, undefined);
  const delegate = clients.delegateAccount?.address ?? null;
  const identity = currentIdentity(clients.principalAccount.address, delegate);
  const result = {
    observedAt: new Date().toISOString(),
    network: "studionet",
    chainId: await chainId(),
    principal: clients.principalAccount.address,
    principalBalanceGEN: formatGen(await balance(clients.readClient, clients.principalAccount.address)),
    delegateConfigured: Boolean(clients.delegateAccount),
    delegate,
    delegateBalanceGEN: clients.delegateAccount ? formatGen(await balance(clients.readClient, clients.delegateAccount.address)) : null,
    deploymentDecision: deploymentDecision(existing, identity),
    deployment: existing ? {
      active: existing.active,
      result: existing.result,
      contractAddress: existing.contractAddress,
      transactionHash: existing.transactionHash,
      sourceCommit: existing.sourceCommit,
      sourceSha256: existing.sourceSha256,
    } : null,
  };
  if (existing?.contractAddress) {
    const code = await clients.readClient.getContractCode(existing.contractAddress);
    result.deployedCodePresent = typeof code === "string" && code.length > 2;
    result.contractBalanceGEN = formatGen(await balance(clients.readClient, existing.contractAddress));
    result.grantIds = await readView(clients.readClient, existing.contractAddress, "list_grant_ids", [0, 25]);
  }
  return { existing, identity, result };
}


async function inspect() {
  const clients = roleClients(false);
  const { result } = await deploymentInspection(clients);
  console.log(JSON.stringify(result, null, 2));
}


async function finalizeDeployment(clients, identity, hash) {
  let acceptedReceipt;
  const { finalized } = await waitForAcceptedAndFinalized(clients.principalClient, hash, "deploy", "SUCCESS", async (accepted) => {
    acceptedReceipt = accepted;
    updateAttempt(hash, { status: "ACCEPTED", acceptedAt: new Date().toISOString(), receipt: safeReceiptProjection(accepted, "deploy", hash) });
  });
  const contractAddress = contractAddressFromReceipt(finalized) ?? contractAddressFromReceipt(acceptedReceipt);
  if (!contractAddress) throw new Error("Successful deployment receipt did not expose a contract address.");
  const code = await clients.readClient.getContractCode(contractAddress);
  if (typeof code !== "string" || code.length <= 2) throw new Error("Deployed contract code could not be verified.");
  const grantIds = await readView(clients.readClient, contractAddress, "list_grant_ids", [0, 25]);
  if (!Array.isArray(grantIds) || grantIds.length !== 0) throw new Error("Fresh deployment grant index mismatch.");
  const finalizedAt = new Date().toISOString();
  const deployment = {
    ...identity,
    active: true,
    result: "SUCCESS",
    contractAddress,
    transactionHash: hash,
    transactionExplorer: `${EXPLORER_URL}/tx/${hash}`,
    contractExplorer: `${EXPLORER_URL}/address/${contractAddress}`,
    finalizedAt,
    receipt: safeReceiptProjection(finalized, "deploy", hash),
    initialGrantIds: grantIds,
  };
  updateAttempt(hash, { status: "FINALIZED", result: "SUCCESS", finalizedAt, contractAddress, receipt: deployment.receipt });
  writeJson(DEPLOYMENT_PATH, deployment);
  console.log(JSON.stringify({ Result: "SUCCESS", contractAddress, transactionHash: hash, explorer: deployment.contractExplorer }, null, 2));
  return deployment;
}


async function deploy() {
  const clients = roleClients(true);
  const { existing, identity, result } = await deploymentInspection(clients);
  console.log(JSON.stringify({ inspect: result }, null, 2));
  const decision = deploymentDecision(existing, identity);
  if (decision === "RESUME") {
    console.log(JSON.stringify({ Result: "SUCCESS", resumed: true, contractAddress: existing.contractAddress }, null, 2));
    return;
  }
  if (decision === "REFUSE") throw new Error("Existing active deployment identity differs; recover/archive it before deploying a revision.");
  if (delegateFundingDecision(await balance(clients.readClient, clients.delegateAccount.address)) !== "READY") {
    throw new Error("Delegate must hold at least 1 GEN before deployment.");
  }
  const pending = [...attemptsFile().attempts].reverse().find((attempt) =>
    attempt.sourceSha256 === identity.sourceSha256 && attempt.deployer === identity.deployer
    && attempt.delegate === identity.delegate && ["SUBMITTED", "ACCEPTED"].includes(attempt.status));
  if (pending) {
    await finalizeDeployment(clients, identity, pending.transactionHash);
    return;
  }
  await clients.principalClient.initializeConsensusSmartContract();
  const hash = await clients.principalClient.deployContract({ code: new Uint8Array(readFileSync(CONTRACT_PATH)), args: [] });
  updateAttempt(hash, { ...identity, status: "SUBMITTED", submittedAt: new Date().toISOString() });
  console.log(JSON.stringify({ stage: "SUBMITTED", label: "deploy", transactionHash: hash }, null, 2));
  await finalizeDeployment(clients, identity, hash);
}


function clauses(purpose, prohibition) {
  return JSON.stringify([
    { id: "no-marketing", kind: "PROHIBITION", text: prohibition },
    { id: "purpose", kind: "RESTRICTION", text: purpose },
  ]);
}


function newLifecycleFile(deployment, clients) {
  const now = Math.floor(Date.now() / 1_000);
  return {
    network: "studionet",
    chainId: 61999,
    contractAddress: deployment.contractAddress,
    principal: clients.principalAccount.address,
    delegate: clients.delegateAccount.address,
    startedAt: new Date().toISOString(),
    expiresAt: now + 7 * 24 * 60 * 60,
    childExpiresAt: now + 6 * 24 * 60 * 60,
    ids: {
      root: "grantlattice-root-v1",
      objectiveRejected: "grantlattice-objective-rejected-v1",
      valid: "grantlattice-valid-v1",
      expansion: "grantlattice-expansion-v1",
      ambiguous: "grantlattice-ambiguous-v1",
    },
    pendingTransaction: null,
    transactions: [],
    expectedRejections: [],
    accessChecks: [],
    status: "IN_PROGRESS",
  };
}


function lifecycleFile(deployment, clients) {
  const existing = readJson(LIFECYCLE_PATH, undefined);
  if (!existing) return newLifecycleFile(deployment, clients);
  if (existing.network !== "studionet" || existing.contractAddress !== deployment.contractAddress
    || existing.principal.toLowerCase() !== clients.principalAccount.address.toLowerCase()
    || existing.delegate.toLowerCase() !== clients.delegateAccount.address.toLowerCase()) {
    throw new Error("Lifecycle evidence belongs to a different network, deployment, or actor pair.");
  }
  return existing;
}


async function canonicalLifecycleState(file, clients, deployment) {
  const address = deployment.contractAddress;
  const knownIds = await grantIdSet(clients.readClient, address);
  const readKnownGrant = (grantId) => knownIds.has(grantId)
    ? readView(clients.readClient, address, "get_grant", [grantId])
    : Promise.resolve(null);
  const [root, objectiveRejected, valid, expansion, ambiguous] = await Promise.all([
    readKnownGrant(file.ids.root),
    readKnownGrant(file.ids.objectiveRejected),
    readKnownGrant(file.ids.valid),
    readKnownGrant(file.ids.expansion),
    readKnownGrant(file.ids.ambiguous),
  ]);
  const reviewed = (grant) => grant
    && field(grant, "parent_id", "parentId") !== ""
    && ["ACTIVE", "DENIED", "RETRYABLE"].includes(field(grant, "status"));
  const [validReview, expansionReview, ambiguousReview] = await Promise.all([
    reviewed(valid) ? readView(clients.readClient, address, "get_review", [file.ids.valid]) : null,
    reviewed(expansion) ? readView(clients.readClient, address, "get_review", [file.ids.expansion]) : null,
    reviewed(ambiguous) ? readView(clients.readClient, address, "get_review", [file.ids.ambiguous]) : null,
  ]);
  const before = file.accessChecks.find((item) => item.stage === "BEFORE_REVOKE");
  const after = file.accessChecks.find((item) => item.stage === "AFTER_REVOKE");
  return {
    rootStatus: field(root, "status"),
    objectiveExpansionProved: file.expectedRejections.some((item) => item.action === "PROVE_OBJECTIVE_REJECTION") && objectiveRejected === null,
    validStatus: field(valid, "status") ?? null,
    expansionStatus: field(expansion, "status") ?? null,
    ambiguousStatus: field(ambiguous, "status") ?? null,
    accessBefore: before?.result ?? null,
    accessAfter: after?.result ?? null,
    canonical: { root, objectiveRejected, valid, validReview, expansion, expansionReview, ambiguous, ambiguousReview },
  };
}


function actorClient(clients, actor) {
  return actor === "principal"
    ? { account: clients.principalAccount, client: clients.principalClient }
    : { account: clients.delegateAccount, client: clients.delegateClient };
}


async function recordFinalizedTransaction(file, clients, deployment, pending, finalized, expectedResult) {
  const state = await canonicalLifecycleState(file, clients, deployment);
  file.transactions.push({
    ...pending,
    acceptedAt: pending.acceptedAt ?? null,
    finalizedAt: new Date().toISOString(),
    status: "FINALIZED",
    result: expectedResult,
    receipt: safeReceiptProjection(finalized, pending.action, pending.transactionHash),
    explorer: `${EXPLORER_URL}/tx/${pending.transactionHash}`,
    canonicalAfter: state.canonical,
  });
  file.pendingTransaction = null;
  writeJson(LIFECYCLE_PATH, file);
  return state;
}


async function executeLifecycleWrite({ file, clients, deployment, action, actor, functionName, args, before }) {
  const { account, client } = actorClient(clients, actor);
  await client.initializeConsensusSmartContract();
  const hash = await client.writeContract({ address: deployment.contractAddress, functionName, args, value: 0n });
  file.pendingTransaction = {
    action, actor, publicAddress: account.address, transactionHash: hash,
    submittedAt: new Date().toISOString(), valueGEN: "0", canonicalBefore: before.canonical, expectedResult: "SUCCESS",
  };
  writeJson(LIFECYCLE_PATH, file);
  console.log(JSON.stringify({ stage: "SUBMITTED", action, actor, valueGEN: "0", transactionHash: hash }, null, 2));
  const { finalized } = await waitForAcceptedAndFinalized(client, hash, action, "SUCCESS", async () => {
    file.pendingTransaction.acceptedAt = new Date().toISOString();
    writeJson(LIFECYCLE_PATH, file);
  });
  return recordFinalizedTransaction(file, clients, deployment, file.pendingTransaction, finalized, "SUCCESS");
}


async function executeExpectedRejection({ file, clients, deployment, action, functionName, args, rejectedGrantId, before }) {
  const actor = "delegate";
  const { account, client } = actorClient(clients, actor);
  await client.initializeConsensusSmartContract();
  const hash = await client.writeContract({ address: deployment.contractAddress, functionName, args, value: 0n });
  file.pendingTransaction = {
    action, actor, publicAddress: account.address, transactionHash: hash,
    submittedAt: new Date().toISOString(), valueGEN: "0", canonicalBefore: before.canonical,
    expectedResult: "REJECTED", rejectedGrantId,
  };
  writeJson(LIFECYCLE_PATH, file);
  console.log(JSON.stringify({ stage: "SUBMITTED", action, actor, expectedResult: "REJECTED", valueGEN: "0", transactionHash: hash }, null, 2));
  const { finalized } = await waitForAcceptedAndFinalized(client, hash, action, "REJECTED", async () => {
    file.pendingTransaction.acceptedAt = new Date().toISOString();
    writeJson(LIFECYCLE_PATH, file);
  });
  const knownIds = await grantIdSet(clients.readClient, deployment.contractAddress);
  if (knownIds.has(rejectedGrantId)) throw new Error("Objective expansion rejection unexpectedly created a child grant.");
  file.expectedRejections.push({
    ...file.pendingTransaction,
    finalizedAt: new Date().toISOString(), status: "FINALIZED", result: "REJECTED_UNCHANGED",
    receipt: safeReceiptProjection(finalized, action, hash), explorer: `${EXPLORER_URL}/tx/${hash}`, rejectedGrantAbsent: true,
  });
  file.pendingTransaction = null;
  writeJson(LIFECYCLE_PATH, file);
  return { ...before, objectiveExpansionProved: true };
}


async function reconcilePendingLifecycle(file, clients, deployment) {
  if (!file.pendingTransaction) return;
  const pending = file.pendingTransaction;
  const { client } = actorClient(clients, pending.actor);
  const expected = pending.expectedResult ?? "SUCCESS";
  const { finalized } = await waitForAcceptedAndFinalized(client, pending.transactionHash, pending.action, expected);
  if (expected === "REJECTED") {
    const knownIds = await grantIdSet(clients.readClient, deployment.contractAddress);
    if (knownIds.has(pending.rejectedGrantId)) throw new Error("Resumed objective rejection created unexpected state.");
    file.expectedRejections.push({
      ...pending,
      finalizedAt: new Date().toISOString(), status: "FINALIZED", result: "REJECTED_UNCHANGED",
      receipt: safeReceiptProjection(finalized, pending.action, pending.transactionHash),
      explorer: `${EXPLORER_URL}/tx/${pending.transactionHash}`, rejectedGrantAbsent: true,
    });
    file.pendingTransaction = null;
    writeJson(LIFECYCLE_PATH, file);
    return;
  }
  await recordFinalizedTransaction(file, clients, deployment, pending, finalized, "SUCCESS");
}


async function recordAccessCheck(file, clients, deployment, stage, expected) {
  const result = await readView(
    clients.readClient,
    deployment.contractAddress,
    "can_invoke",
    accessCheckArgs(file, clients),
  );
  if (result !== expected) throw new Error(`${stage} access check returned ${result}, expected ${expected}.`);
  file.accessChecks.push({ stage, grantId: file.ids.valid, capability: "READ", resource: "case-1", result, observedAt: new Date().toISOString() });
  writeJson(LIFECYCLE_PATH, file);
  return stage === "BEFORE_REVOKE"
    ? { accessBefore: result }
    : { accessAfter: result };
}


export function accessCheckArgs(file, clients) {
  return [file.ids.valid, clients.principalAccount.address, "READ", "case-1"];
}


function assertFinalLifecycle(state) {
  const canonical = state.canonical;
  if (state.rootStatus !== "REVOKED") throw new Error("Final root status is not REVOKED.");
  if (state.validStatus !== "ACTIVE" || field(canonical.validReview, "verdict") !== "ATTENUATED") {
    throw new Error("Valid child did not retain a finalized attenuation verdict.");
  }
  if (state.expansionStatus !== "DENIED" || field(canonical.expansionReview, "verdict") !== "EXPANSION") {
    throw new Error("Semantic expansion did not finalize as DENIED/EXPANSION.");
  }
  if (state.ambiguousStatus !== "RETRYABLE" || !["AMBIGUOUS", "UNVERIFIABLE"].includes(field(canonical.ambiguousReview, "verdict"))) {
    throw new Error("Ambiguous child did not remain non-authorizing and retryable.");
  }
  if (!state.objectiveExpansionProved || state.accessBefore !== "ALLOWED" || state.accessAfter !== "ANCESTOR_INACTIVE") {
    throw new Error("Final objective-rejection/access consequence proof is incomplete.");
  }
}


async function lifecycle() {
  const clients = roleClients(true);
  await chainId();
  const deployment = readJson(DEPLOYMENT_PATH, undefined);
  if (!deployment || deployment.result !== "SUCCESS" || deployment.active !== true) {
    throw new Error("A successful active Studionet deployment is required.");
  }
  const identity = currentIdentity(clients.principalAccount.address, clients.delegateAccount.address);
  if (deploymentDecision(deployment, identity) !== "RESUME") throw new Error("Source/deployer/delegate identity differs from the active deployment.");
  const file = lifecycleFile(deployment, clients);
  file.status = "IN_PROGRESS";
  writeJson(LIFECYCLE_PATH, file);
  await reconcilePendingLifecycle(file, clients, deployment);

  const rootPurpose = "Authority may be used only to READ or SUMMARIZE case-1 and case-2 for customer support.";
  const rootProhibition = "Marketing, advertising, sales, profiling, resale, and third-party disclosure are prohibited.";
  const rootClauses = clauses(rootPurpose, rootProhibition);
  const validClauses = clauses(
    "Authority may be used only to READ case-1 for resolving one assigned customer support case.",
    "Marketing, advertising, sales, profiling, resale, third-party disclosure, and model training are prohibited.",
  );
  const expansionClauses = clauses("Authority may be used for any business purpose, capability, or resource.", rootProhibition);
  const ambiguousClauses = clauses(
    "Authority may be used only to READ case-1 for activities permitted by the current customer care policy.",
    rootProhibition,
  );

  let state = await canonicalLifecycleState(file, clients, deployment);
  for (let step = 0; step < 16; step += 1) {
    const action = selectNextLifecycleAction(state);
    if (action === "COMPLETE") {
      assertFinalLifecycle(state);
      file.status = "SUCCESS";
      file.completedAt = new Date().toISOString();
      file.finalCanonicalState = state.canonical;
      file.principalBalanceGEN = formatGen(await balance(clients.readClient, clients.principalAccount.address));
      file.delegateBalanceGEN = formatGen(await balance(clients.readClient, clients.delegateAccount.address));
      file.contractBalanceGEN = formatGen(await balance(clients.readClient, deployment.contractAddress));
      writeJson(LIFECYCLE_PATH, file);
      console.log(JSON.stringify({ Result: "SUCCESS", rootId: file.ids.root, transactions: file.transactions.length, expectedRejections: file.expectedRejections.length, accessAfter: state.accessAfter }, null, 2));
      return;
    }
    if (action === "STOP_INCONSISTENT") {
      file.status = action;
      file.lastCanonicalState = state.canonical;
      writeJson(LIFECYCLE_PATH, file);
      throw new Error("Lifecycle stopped safely at STOP_INCONSISTENT.");
    }
    if (action === "CREATE_ROOT") {
      state = await executeLifecycleWrite({
        file, clients, deployment, action, actor: "principal", functionName: "create_root_grant",
        args: [file.ids.root, clients.delegateAccount.address, "READ,SUMMARIZE", "case-1,case-2", rootClauses, file.expiresAt, 3, "demo-create-root-v1"], before: state,
      });
    } else if (action === "PROVE_OBJECTIVE_REJECTION") {
      state = await executeExpectedRejection({
        file, clients, deployment, action, functionName: "propose_child_grant", rejectedGrantId: file.ids.objectiveRejected,
        args: [file.ids.root, file.ids.objectiveRejected, clients.principalAccount.address, "READ,WRITE", "case-1", validClauses, file.childExpiresAt, "demo-objective-reject-v1"], before: state,
      });
    } else if (action === "PROPOSE_VALID") {
      state = await executeLifecycleWrite({
        file, clients, deployment, action, actor: "delegate", functionName: "propose_child_grant",
        args: [file.ids.root, file.ids.valid, clients.principalAccount.address, "READ", "case-1", validClauses, file.childExpiresAt, "demo-propose-valid-v1"], before: state,
      });
    } else if (action === "REVIEW_VALID") {
      state = await executeLifecycleWrite({ file, clients, deployment, action, actor: "delegate", functionName: "review_child_grant", args: [file.ids.valid], before: state });
    } else if (action === "PROPOSE_EXPANSION") {
      state = await executeLifecycleWrite({
        file, clients, deployment, action, actor: "delegate", functionName: "propose_child_grant",
        args: [file.ids.root, file.ids.expansion, clients.principalAccount.address, "READ", "case-1", expansionClauses, file.childExpiresAt, "demo-propose-expansion-v1"], before: state,
      });
    } else if (action === "REVIEW_EXPANSION") {
      state = await executeLifecycleWrite({ file, clients, deployment, action, actor: "delegate", functionName: "review_child_grant", args: [file.ids.expansion], before: state });
    } else if (action === "PROPOSE_AMBIGUOUS") {
      state = await executeLifecycleWrite({
        file, clients, deployment, action, actor: "delegate", functionName: "propose_child_grant",
        args: [file.ids.root, file.ids.ambiguous, clients.principalAccount.address, "READ", "case-1", ambiguousClauses, file.childExpiresAt, "demo-propose-ambiguous-v1"], before: state,
      });
    } else if (action === "REVIEW_AMBIGUOUS") {
      state = await executeLifecycleWrite({ file, clients, deployment, action, actor: "delegate", functionName: "review_child_grant", args: [file.ids.ambiguous], before: state });
    } else if (action === "CHECK_ACCESS_BEFORE") {
      state = { ...state, ...await recordAccessCheck(file, clients, deployment, "BEFORE_REVOKE", "ALLOWED") };
    } else if (action === "REVOKE_ROOT") {
      state = await executeLifecycleWrite({ file, clients, deployment, action, actor: "principal", functionName: "revoke_grant", args: [file.ids.root, "demo-revoke-root-v1"], before: state });
    } else if (action === "CHECK_ACCESS_AFTER") {
      state = { ...state, ...await recordAccessCheck(file, clients, deployment, "AFTER_REVOKE", "ANCESTOR_INACTIVE") };
    }
  }
  throw new Error("Lifecycle exceeded the bounded sixteen-step limit.");
}


async function main() {
  const command = process.argv[2] ?? "inspect";
  if (command === "inspect") await inspect();
  else if (command === "prepare-delegate") await prepareDelegate();
  else if (command === "recover-delegate-funding") await recoverDelegateFunding(process.argv[3]);
  else if (command === "deploy") await deploy();
  else if (command === "lifecycle") await lifecycle();
  else throw new Error("Usage: node scripts/studionet.mjs <inspect|prepare-delegate|recover-delegate-funding|deploy|lifecycle>");
}


if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown Studionet operation failure.";
    console.error(`Studionet operation stopped: ${message}`);
    process.exitCode = 1;
  });
}
