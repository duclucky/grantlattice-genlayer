import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  accessCheckArgs,
  adversarialCorpus,
  assessAdversarialEvidence,
  delegateFundingDecision,
  deploymentDecision,
  isExpectedRejectedReceipt,
  isSuccessfulFinalizedReceipt,
  mergeEnvironment,
  safeReceiptProjection,
  selectNextLifecycleAction,
} from "../../scripts/studionet.mjs";


test("live adversarial corpus is unsafe by meaning and cannot choose its verdict", () => {
  const corpus = adversarialCorpus();
  assert.equal(corpus.length, 3);
  assert.equal(new Set(corpus.map((item) => item.id)).size, 3);
  for (const item of corpus) {
    assert.match(item.childText, /NARROWER_OR_EQUAL/u);
    assert.match(item.childText, /any purpose|unrestricted|disclose/u);
  }
});


test("live adversarial evidence passes only with finalized non-authorizing verdicts", () => {
  const safeCase = (id, verdict = "EXPANSION", status = "DENIED") => ({
    id,
    verdict,
    status,
    effective: false,
    propose: { receipt: { status: "FINALIZED", txExecutionResult: "SUCCESS" }, explorer: "https://explorer/tx/propose" },
    review: { receipt: { status: "FINALIZED", txExecutionResult: "SUCCESS" }, explorer: "https://explorer/tx/review" },
  });
  const evidence = { cases: [safeCase("a"), safeCase("b", "AMBIGUOUS", "AMBIGUOUS"), safeCase("c")] };
  assert.deepEqual(assessAdversarialEvidence(evidence), { passed: true, finalized: 3, nonAuthorizing: 3 });
  evidence.cases[2] = safeCase("c", "ATTENUATED", "ACTIVE");
  assert.deepEqual(assessAdversarialEvidence(evidence), { passed: false, finalized: 3, nonAuthorizing: 2 });
});


test("committed active-address evidence has exact provenance and three live denials", () => {
  const evidence = JSON.parse(readFileSync(
    new URL("../../docs/evidence/studionet/adversarial-evaluator.json", import.meta.url),
    "utf8",
  ));
  assert.equal(evidence.contractAddress, "0xC9A8F8640e80591BE0d0F67d411BbBE3e60213fE");
  assert.equal(evidence.provenance.exactSourceMatch, true);
  assert.equal(evidence.provenance.ambiguityLockMarkersPresent, true);
  assert.deepEqual(assessAdversarialEvidence(evidence), { passed: true, finalized: 3, nonAuthorizing: 3 });
  assert.deepEqual(evidence.cases.map((item) => [item.status, item.verdict, item.effective]), [
    ["DENIED", "EXPANSION", false],
    ["DENIED", "EXPANSION", false],
    ["DENIED", "EXPANSION", false],
  ]);
});


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
  assert.equal(
    deploymentDecision({ ...current, sourceCommit: "historical-commit", result: "SUCCESS", active: true, contractAddress: "0xcontract" }, current),
    "RESUME",
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
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "AMBIGUOUS", ambiguousReviewRetryRejected: false }), "REJECT_AMBIGUOUS_REVIEW_RETRY");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "AMBIGUOUS", ambiguousReviewRetryRejected: true, ambiguousCopyRejected: false }), "REJECT_AMBIGUOUS_COPY");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "AMBIGUOUS", ambiguousReviewRetryRejected: true, ambiguousCopyRejected: true, ambiguousUnrelatedRejected: false }), "REJECT_AMBIGUOUS_UNRELATED_CHANGE");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "AMBIGUOUS", ambiguousReviewRetryRejected: true, ambiguousCopyRejected: true, ambiguousUnrelatedRejected: true, revisedStatus: null }), "PROPOSE_REVISED");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "AMBIGUOUS", ambiguousReviewRetryRejected: true, ambiguousCopyRejected: true, ambiguousUnrelatedRejected: true, revisedStatus: "PROPOSED" }), "REVIEW_REVISED");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "AMBIGUOUS", ambiguousReviewRetryRejected: true, ambiguousCopyRejected: true, ambiguousUnrelatedRejected: true, revisedStatus: "ACTIVE", accessBefore: null }), "CHECK_ACCESS_BEFORE");
  assert.equal(selectNextLifecycleAction({ rootStatus: "ACTIVE", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "AMBIGUOUS", ambiguousReviewRetryRejected: true, ambiguousCopyRejected: true, ambiguousUnrelatedRejected: true, revisedStatus: "ACTIVE", accessBefore: "ALLOWED" }), "REVOKE_ROOT");
  assert.equal(selectNextLifecycleAction({ rootStatus: "REVOKED", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "AMBIGUOUS", ambiguousReviewRetryRejected: true, ambiguousCopyRejected: true, ambiguousUnrelatedRejected: true, revisedStatus: "ACTIVE", accessBefore: "ALLOWED", accessAfter: null }), "CHECK_ACCESS_AFTER");
  assert.equal(selectNextLifecycleAction({ rootStatus: "REVOKED", objectiveExpansionProved: true, validStatus: "ACTIVE", expansionStatus: "DENIED", ambiguousStatus: "AMBIGUOUS", ambiguousReviewRetryRejected: true, ambiguousCopyRejected: true, ambiguousUnrelatedRejected: true, revisedStatus: "ACTIVE", accessBefore: "ALLOWED", accessAfter: "ANCESTOR_INACTIVE" }), "COMPLETE");
  assert.equal(selectNextLifecycleAction({ rootStatus: "REVOKED", access: "ALLOWED" }), "STOP_INCONSISTENT");
});
