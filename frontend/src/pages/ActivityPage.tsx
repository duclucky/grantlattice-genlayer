import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";

import type { TransactionStage } from "../domain/types";
import { useTransactions } from "../transactions/TransactionProvider";

const stageCopy: Record<TransactionStage, string> = {
  SUBMITTED: "Submitted to your wallet network",
  ACCEPTED: "Accepted for validator decision",
  FINALIZED: "Finalized on Studionet",
  FAILED: "Transaction failed; canonical authority was not changed",
  RETRYABLE: "Review needs another validator attempt",
};

export function ActivityPage() {
  const { activities } = useTransactions();

  return (
    <div className="page">
      <header className="page-header">
        <p className="kicker">Real transaction lifecycle</p>
        <h1>Network activity</h1>
        <p>Follow submitted, accepted, finalized, failed, and retryable actions.</p>
      </header>
      {activities.length === 0 ? (
        <section className="page-state">
          <ClockCounterClockwiseIcon aria-hidden="true" size={28} weight="duotone" />
          <h2>No wallet activity in this session</h2>
          <p>GrantLattice never invents a transaction or finality state.</p>
        </section>
      ) : (
        <div className="card-grid" aria-label="Session transaction activity">
          {activities.map((activity) => (
            <article className="content-card" key={activity.id}>
              <p className="kicker">{stageCopy[activity.stage]}</p>
              <h2>{activity.label}</h2>
              <p>Grant {activity.grantId}</p>
              <code>{activity.hash}</code>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
