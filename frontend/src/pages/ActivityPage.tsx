import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from 'react';

import type { TransactionStage } from "../domain/types";
import { useTransactions } from "../transactions/TransactionProvider";

const stageCopy: Record<TransactionStage, string> = {
  SUBMITTED: "Submitted to your wallet network",
  ACCEPTED: "Accepted for validator decision",
  FINALIZED: "Finalized on Studionet",
  FAILED: "Transaction failed; canonical authority was not changed",
  RETRYABLE: "Review needs another validator attempt",
};
const historyStageCopy = { ...stageCopy, UNCONFIRMED: 'Confirmation unavailable; verify in Explorer' };
const PAGE_SIZE = 20;

export function ActivityPage() {
  const { activities, historyState, inactiveReason, refresh, scope } = useTransactions();
  const [page, setPage] = useState(0);
  const entryState = useRef(historyState);
  useEffect(() => {
    if (entryState.current === 'ready' || entryState.current === 'error') refresh();
  }, [refresh]);
  useEffect(() => { setPage(0); }, [scope?.account, scope?.contractAddress]);
  const pages = Math.max(1, Math.ceil(activities.length / PAGE_SIZE));
  const visible = activities.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  let statePanel = null;
  if (!scope) {
    const copy = inactiveReason === 'network'
      ? ['Switch to Studionet to view activity', 'Activity is shown only for the connected wallet on Studionet.']
      : inactiveReason === 'configuration'
        ? ['Activity is not configured', 'The deployed contract configuration is unavailable.']
        : ['Connect wallet to view activity', 'Activity is scoped to the wallet you deliberately connect. Onchain transactions remain public.'];
    statePanel = <section className="page-state"><ClockCounterClockwiseIcon aria-hidden="true" size={28} weight="duotone" /><h2>{copy[0]}</h2><p>{copy[1]}</p></section>;
  } else if (historyState === 'loading' && activities.length === 0) {
    statePanel = <section className="page-state" aria-busy="true"><ClockCounterClockwiseIcon aria-hidden="true" size={28} weight="duotone" /><h2>Loading wallet activity…</h2><p>Reading real Studionet transactions for this wallet and contract.</p></section>;
  } else if (historyState === 'error' && activities.length === 0) {
    statePanel = <section className="page-state" role="alert"><ClockCounterClockwiseIcon aria-hidden="true" size={28} weight="duotone" /><h2>Activity history unavailable</h2><p>The network read failed. No empty or successful state was invented.</p><button className="button button-secondary" type="button" onClick={refresh}>Retry</button></section>;
  } else if (historyState === 'ready' && activities.length === 0) {
    statePanel = <section className="page-state"><ClockCounterClockwiseIcon aria-hidden="true" size={28} weight="duotone" /><h2>No transactions for this wallet yet</h2><p>No matching operations were returned for this wallet and the active contract.</p></section>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="kicker">Real transaction lifecycle</p>
        <h1>Network activity</h1>
        <p>Follow submitted, accepted, finalized, failed, and retryable actions.</p>
      </header>
      {statePanel ?? (
        <>
        {historyState === 'error' && <p className="boundary-note activity-notice" role="alert">Latest refresh failed. Showing the last same-wallet snapshot. <button className="button button-quiet" type="button" onClick={refresh}>Retry</button></p>}
        <div className="card-grid" aria-label="Wallet transaction activity">
          {visible.map((activity) => (
            <article className="content-card" key={activity.hash}>
              <p className="kicker">{historyStageCopy[activity.stage]}</p>
              <h2>{activity.label}</h2>
              <p>Grant {activity.grantId}</p>
              <time dateTime={activity.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(activity.createdAt))}</time>
              <code className="activity-hash">{activity.hash}</code>
              <a className="text-link" href={`https://explorer-studio.genlayer.com/tx/${activity.hash}`} target="_blank" rel="noreferrer">View transaction</a>
            </article>
          ))}
        </div>
        {pages > 1 && <nav className="activity-pagination" aria-label="Activity pages"><button className="button button-secondary" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous page</button><span>Page {page + 1} of {pages}</span><button className="button button-secondary" disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)}>Next page</button></nav>}
        </>
      )}
    </div>
  );
}
