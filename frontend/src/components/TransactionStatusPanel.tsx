import type { TransactionProgress } from "../domain/types";
import { useTransactions } from "../transactions/TransactionProvider";

const progressCopy: Record<TransactionProgress["stage"], string> = {
  AWAITING_SIGNATURE: "Confirm this request in your wallet",
  SUBMITTED: "Submitted to GenLayer Studionet",
  ACCEPTED: "Accepted for validator decision",
  FINALIZED: "Finalized in canonical contract state",
  FAILED: "The request failed or was rejected",
  RETRYABLE: "The technical review may be retried",
};

interface Props {
  method: string;
  progress: TransactionProgress | null;
}

export function TransactionStatusPanel({ method, progress }: Props) {
  const { contract } = useTransactions();
  const busy = progress?.stage === "AWAITING_SIGNATURE" || progress?.stage === "SUBMITTED" || progress?.stage === "ACCEPTED";
  return (
    <section className="transaction-panel" aria-busy={busy} aria-labelledby={`transaction-${method}`}>
      <h2 id={`transaction-${method}`}>Contract transaction</h2>
      <dl className="transaction-facts">
        <div><dt>Method</dt><dd><code>{method}</code></dd></div>
        <div><dt>Value</dt><dd>0 GEN</dd></div>
        <div><dt>Target</dt><dd><code>{contract?.contractAddress ?? "Contract unavailable"}</code></dd></div>
      </dl>
      <p role="status" aria-atomic="true">
        {progress ? progressCopy[progress.stage] : "Ready. Submitting will first request a wallet signature."}
      </p>
      {progress?.hash ? (
        <a
          className="text-link"
          href={`https://explorer-studio.genlayer.com/tx/${progress.hash}`}
          target="_blank"
          rel="noreferrer"
        >
          View transaction in Explorer
        </a>
      ) : null}
    </section>
  );
}
