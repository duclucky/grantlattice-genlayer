import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createAccount } from "genlayer-js";


const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT_PATH = join(PROJECT_ROOT, "contracts", "grant_lattice.py");
const DEPLOYMENT_PATH = join(PROJECT_ROOT, "docs", "evidence", "studionet", "deployment.json");
const LIFECYCLE_PATH = join(PROJECT_ROOT, "docs", "evidence", "studionet", "lifecycle.json");
const IDENTITY_KEYS = ["network", "chainId", "sourceCommit", "sourceSha256", "depends", "deployer"];


function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
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
  const loaded = mergeEnvironment(
    readEnvironmentFile(join(PROJECT_ROOT, ".env")),
    readEnvironmentFile(join(PROJECT_ROOT, "..", ".env")),
  );
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
  if (!/^0x[a-fA-F0-9]{64}$/u.test(normalized)) {
    throw new Error(`Authorized variable ${name} is malformed.`);
  }
  return normalized;
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
  const candidates = [
    receipt?.contractAddress,
    receipt?.contract_address,
    receipt?.data?.contract_address,
    receipt?.data?.contractAddress,
    receipt?.txDataDecoded?.contractAddress,
  ];
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


export function deploymentDecision(existing, current) {
  if (!existing) return "DEPLOY";
  const identical = IDENTITY_KEYS.every((key) => existing[key] === current[key]);
  if (identical && existing.active === true && existing.result === "SUCCESS" && existing.contractAddress) {
    return "RESUME";
  }
  return "REFUSE";
}


export function selectNextLifecycleAction(state) {
  if (!state) return "CREATE_ROOT";
  if (state.rootStatus === "ACTIVE" && !state.childStatus) return "PROPOSE_CHILD";
  if (state.rootStatus === "ACTIVE" && ["PROPOSED", "RETRYABLE"].includes(state.childStatus)) {
    return "REVIEW_CHILD";
  }
  if (state.rootStatus === "ACTIVE" && state.childStatus === "ACTIVE" && state.access == null) {
    return "CHECK_ACCESS";
  }
  if (state.rootStatus === "ACTIVE" && state.childStatus === "ACTIVE" && state.access === "ALLOWED") {
    return "REVOKE_ROOT";
  }
  if (state.rootStatus === "REVOKED" && state.access === "ANCESTOR_INACTIVE") return "COMPLETE";
  return "STOP_INCONSISTENT";
}


function currentIdentity(deployer) {
  const source = readFileSync(CONTRACT_PATH);
  const firstLine = source.toString("ascii").split(/\r?\n/u, 1)[0];
  const depends = JSON.parse(firstLine.slice(1).trim()).Depends;
  return {
    network: "studionet",
    chainId: 61999,
    sourceCommit: execFileSync(
      "git",
      ["log", "-1", "--format=%H", "--", "contracts/grant_lattice.py"],
      { cwd: PROJECT_ROOT, encoding: "utf8" },
    ).trim(),
    sourceSha256: createHash("sha256").update(source).digest("hex"),
    depends,
    deployer,
  };
}


function publicConfiguration() {
  const availability = loadAuthorizedEnvironment();
  const principal = createAccount(privateKey("STUDIONET_PRIVATE_KEY"));
  const identity = currentIdentity(principal.address);
  const delegate = availability.hasDelegate
    ? createAccount(privateKey("STUDIONET_DELEGATE_PRIVATE_KEY")).address
    : null;
  return { availability, principal: principal.address, delegate, identity };
}


async function inspect() {
  const configuration = publicConfiguration();
  const existing = readJson(DEPLOYMENT_PATH, undefined);
  console.log(JSON.stringify({
    network: "studionet",
    chainId: 61999,
    principal: configuration.principal,
    delegateConfigured: configuration.availability.hasDelegate,
    delegate: configuration.delegate,
    deploymentDecision: deploymentDecision(existing, configuration.identity),
    deployment: existing ? {
      active: existing.active,
      result: existing.result,
      contractAddress: existing.contractAddress,
      transactionHash: existing.transactionHash,
      sourceCommit: existing.sourceCommit,
      sourceSha256: existing.sourceSha256,
    } : null,
  }, null, 2));
}


async function deploy() {
  const configuration = publicConfiguration();
  const existing = readJson(DEPLOYMENT_PATH, undefined);
  const decision = deploymentDecision(existing, configuration.identity);
  if (decision === "RESUME") {
    console.log(JSON.stringify({ Result: "SUCCESS", resumed: true, contractAddress: existing.contractAddress }, null, 2));
    return;
  }
  if (decision === "REFUSE") {
    throw new Error("Existing active deployment identity differs; recover/archive it before deploying a revision.");
  }
  throw new Error("Deployment is ready but network execution is enabled only after the Studionet preflight gate.");
}


async function lifecycle() {
  const configuration = publicConfiguration();
  const deployment = readJson(DEPLOYMENT_PATH, undefined);
  if (deploymentDecision(deployment, configuration.identity) !== "RESUME") {
    throw new Error("A matching successful active Studionet deployment is required.");
  }
  const lifecycleEvidence = readJson(LIFECYCLE_PATH, undefined);
  const state = lifecycleEvidence?.canonicalState;
  const nextAction = selectNextLifecycleAction(state);
  console.log(JSON.stringify({
    Result: nextAction === "COMPLETE" ? "SUCCESS" : "READY",
    contractAddress: deployment.contractAddress,
    nextAction,
  }, null, 2));
}


async function main() {
  const command = process.argv[2] ?? "inspect";
  if (command === "inspect") await inspect();
  else if (command === "deploy") await deploy();
  else if (command === "lifecycle") await lifecycle();
  else throw new Error("Usage: node scripts/studionet.mjs <inspect|deploy|lifecycle>");
}


if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown Studionet operation failure.";
    console.error(`Studionet operation stopped: ${message}`);
    process.exitCode = 1;
  });
}
