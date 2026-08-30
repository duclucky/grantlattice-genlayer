import test from "node:test";
import assert from "node:assert/strict";

import {
  accessCheckArgs,
  delegateFundingDecision,
  deploymentDecision,
  isExpectedRejectedReceipt,
  isSuccessfulFinalizedReceipt,
  mergeEnvironment,
  safeReceiptProjection,
  selectNextLifecycleAction,
} from "../../scripts/studionet.mjs";


test("access checks bind the protected action to the recorded child grantee", () => {
  const clients = {
    principalAccount: { address: "0x1111111111111111111111111111111111111111" },
    delegateAccount: { address: "0x2222222222222222222222222222222222222222" },
  };
  assert.deepEqual(
    accessCheckArgs(
      { ids: { valid: "grantlattice-valid-v2" } },
      clients,
    ),
    [
      "grantlattice-valid-v2",
      "0x1111111111111111111111111111111111111111",
      "READ",
      "case-1",
    ],
  );
  assert.deepEqual(
    accessCheckArgs({ ids: { valid: "grantlattice-valid-v2" } }, clients, "delegate"),
    [
      "grantlattice-valid-v2",
      "0x2222222222222222222222222222222222222222",
      "READ",
      "case-1",
    ],
  );
});


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


test("expected objective rejection requires a finalized failed execution", () => {
  const rejected = {
    status: 7,
    result: 6,
    consensus_data: { leader_receipt: [{ execution_result: "ERROR" }] },
  };
  assert.equal(isExpectedRejectedReceipt(rejected), true);
  assert.equal(isExpectedRejectedReceipt({ ...rejected, status: 5 }), false);
  assert.equal(isExpectedRejectedReceipt({ ...rejected, consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] } }), false);
});


test("delegate preparation funds exactly once and resumes at one GEN", () => {
  assert.equal(delegateFundingDecision(0n), "FUND_1_GEN");
  assert.equal(delegateFundingDecision(10n ** 18n - 1n), "FUND_1_GEN");
  assert.equal(delegateFundingDecision(10n ** 18n), "READY");
  assert.equal(delegateFundingDecision(2n * 10n ** 18n), "READY");
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
  assert.equal(selectNextLifecycleAction({ rootStatus: null, objectiveExpansionProved: false }), "CREATE_ROOT");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: false }), "PROVE_OBJECTIVE_REJECTION");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: null }), "PROPOSE_VALID");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "PROPOSED" }), "REVIEW_VALID");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: null }), "PROPOSE_EXPANSION");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "PROPOSED" }), "REVIEW_EXPANSION");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: null }), "PROPOSE_AMBIGUOUS");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "PROPOSED" }), "REVIEW_AMBIGUOUS");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "RETRYABLE", accessBefore: null }), "CHECK_ACCESS_BEFORE");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "RETRYABLE", accessBefore: "ALLOWED" }), "REVOKE_ROOT");
  assert.equal(selectNextLifecycleAction({ rootStatus: "REVOKED", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "RETRYABLE", accessBefore: "ALLOWED", accessAfter: null }), "CHECK_ACCESS_AFTER");
  assert.equal(selectNextLifecycleAction({ rootStatus: "REVOKED", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "RETRYABLE", accessBefore: "ALLOWED", accessAfter: "ANCESTOR_INACTIVE" }), "COMPLETE");
  assert.equal(selectNextLifecycleAction({ rootStatus: "REVOKED", access: "ALLOWED" }), "STOP_INCONSISTENT");
});
