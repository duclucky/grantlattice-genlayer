import test from "node:test";
import assert from "node:assert/strict";

import {
  deploymentDecision,
  isSuccessfulFinalizedReceipt,
  mergeEnvironment,
  safeReceiptProjection,
  selectNextLifecycleAction,
} from "../../scripts/studionet.mjs";


test("safe receipt projection excludes validator-private and raw payload fields", () => {
  const projected = safeReceiptProjection({
    statusName: "FINALIZED",
    txExecutionResultName: "FINISHED_WITH_RETURN",
    hash: `0x${"a".repeat(64)}`,
    data: { contract_address: "0x1111111111111111111111111111111111111111" },
    node_config: { private: "must-not-leak" },
    stdout: "private output",
    trace: { private: true },
  }, "deploy");

  assert.deepEqual(Object.keys(projected).sort(), [
    "consensusResult", "contractAddress", "label", "status", "transactionHash", "txExecutionResult",
  ]);
  const serialized = JSON.stringify(projected);
  assert.equal(serialized.includes("must-not-leak"), false);
  assert.equal(serialized.includes("private output"), false);
});


test("raw and normalized finalized receipts require successful execution", () => {
  const raw = {
    status: 7,
    result: 6,
    consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
  };
  const normalized = {
    statusName: "FINALIZED",
    txExecutionResultName: "FINISHED_WITH_RETURN",
  };
  assert.equal(isSuccessfulFinalizedReceipt(raw), true);
  assert.equal(isSuccessfulFinalizedReceipt(normalized), true);
  assert.equal(isSuccessfulFinalizedReceipt({ ...raw, result: 7 }), false);
  assert.equal(isSuccessfulFinalizedReceipt({ ...normalized, txExecutionResultName: "ERROR" }), false);
});


test("deployment identity resumes only the exact successful active revision", () => {
  const current = {
    network: "studionet",
    chainId: 61999,
    sourceCommit: "abc",
    sourceSha256: "def",
    depends: "runner",
    deployer: "0xprincipal",
  };
  assert.equal(deploymentDecision(undefined, current), "DEPLOY");
  assert.equal(
    deploymentDecision({ ...current, result: "SUCCESS", active: true, contractAddress: "0xcontract" }, current),
    "RESUME",
  );
  assert.equal(
    deploymentDecision({ ...current, sourceSha256: "changed", result: "SUCCESS", active: true, contractAddress: "0xcontract" }, current),
    "REFUSE",
  );
});


test("project environment wins while parent only fills missing variables", () => {
  assert.deepEqual(
    mergeEnvironment(
      { STUDIONET_PRIVATE_KEY: "project-primary" },
      { STUDIONET_PRIVATE_KEY: "parent-primary", STUDIONET_DELEGATE_PRIVATE_KEY: "parent-delegate" },
    ),
    { STUDIONET_PRIVATE_KEY: "project-primary", STUDIONET_DELEGATE_PRIVATE_KEY: "parent-delegate" },
  );
});


test("lifecycle selection resumes from canonical state without replaying writes", () => {
  assert.equal(selectNextLifecycleAction(undefined), "CREATE_ROOT");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", childStatus: null }), "PROPOSE_CHILD");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", childStatus: "PROPOSED" }), "REVIEW_CHILD");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", childStatus: "RETRYABLE" }), "REVIEW_CHILD");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", childStatus: "ACTIVE", access: null }), "CHECK_ACCESS");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", childStatus: "ACTIVE", access: "ALLOWED" }), "REVOKE_ROOT");
  assert.equal(selectNextLifecycleAction({ rootStatus: "REVOKED", childStatus: "ACTIVE", access: "ANCESTOR_INACTIVE" }), "COMPLETE");
  assert.equal(selectNextLifecycleAction({ rootStatus: "REVOKED", access: "ALLOWED" }), "STOP_INCONSISTENT");
});
