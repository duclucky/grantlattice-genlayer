import { ArrowLeftIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useContractAdapter } from "../adapters/ContractAdapterProvider";
import { PageState } from "../components/PageState";
import { StatusBadge } from "../components/StatusBadge";
import type { Address, GrantRecord, ReviewRecord } from "../domain/types";
import { createNonce, errorMessage } from "../domain/input";
import { useTransactions } from "../transactions/TransactionProvider";
import { useWallet } from "../wallet/WalletProvider";

export function GrantDetailPage() {
  const { grantId = "" } = useParams();
  const adapter = useContractAdapter();
  const wallet = useWallet();
  const connectedAccount = wallet.account as Address | null;
  const transactions = useTransactions();
  const [grant, setGrant] = useState<GrantRecord | null>(null);
  const [review, setReview] = useState<ReviewRecord | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [writeError, setWriteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    let live = true;
    if (!connectedAccount) {
      setGrant(null);
      setReview(null);
      setState("ready");
      return () => { live = false; };
    }
    setState("loading");
    void adapter.listGrants(connectedAccount)
      .then(async (availableGrants) => {
        const nextGrant = availableGrants.find((item) => item.grantId === grantId) ?? null;
        const reviewExists = nextGrant !== null
          && nextGrant.depth > 0
          && nextGrant.status !== "PROPOSED";
        const nextReview = reviewExists ? await adapter.getReview(grantId) : null;
        if (live) {
          setGrant(nextGrant);
          setReview(nextReview);
          setState("ready");
        }
      })
      .catch(() => {
        if (live) setState("error");
      });
    return () => { live = false; };
  }, [adapter, connectedAccount, grantId]);

  useEffect(() => reload(), [reload]);

  async function runWrite(
    label: string,
    createRequest: () => ReturnType<typeof adapter.reviewChild>,
  ) {
    setBusy(true);
    setWriteError(null);
    try {
      const result = await transactions.run(label, grantId, createRequest);
      if (result === "FINALIZED") reload();
      else setWriteError(`Transaction stopped at ${result}. Canonical authority was not assumed.`);
    } catch (caught) {
      setWriteError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!connectedAccount) {
    return (
      <div className="page">
        <PageState headingLevel={1} title="Connect wallet to view this grant">
          Grant details stay hidden until you choose a wallet.
        </PageState>
      </div>
    );
  }
  if (state === "loading") {
    return <div className="page"><PageState headingLevel={1} title="Loading grant">Reading canonical lineage and authority.</PageState></div>;
  }
  if (state === "error") {
    return <div className="page"><PageState headingLevel={1} title="Authority could not be verified" tone="danger">The canonical read failed. Access remains denied.</PageState></div>;
  }
  if (!grant) {
    return <div className="page"><PageState headingLevel={1} title="Grant not found for this wallet">Check the grant ID or switch to a wallet with authority on this grant.</PageState></div>;
  }

  const account = connectedAccount.toLowerCase();
  const walletReady = Boolean(account) && wallet.networkState === "ready";
  const canDelegate = walletReady
    && grant.status === "ACTIVE"
    && grant.effective
    && grant.depth < grant.maxDepth
    && account === grant.grantee.toLowerCase();
  const canReview = walletReady
    && (grant.status === "PROPOSED" || grant.status === "RETRYABLE")
    && account === grant.grantor.toLowerCase();
  const canRevoke = walletReady
    && grant.status !== "REVOKED"
    && (account === grant.grantor.toLowerCase() || account === grant.rootPrincipal.toLowerCase());

  return (
    <div className="page">
      <Link className="back-link" to="/grants">
        <ArrowLeftIcon aria-hidden="true" size={18} />
        All grants
      </Link>
      <header className="page-header detail-heading">
        <div>
          <p className="kicker">Delegation level {grant.depth}</p>
          <h1>Grant {grant.grantId}</h1>
          <code className="address-token">{grant.grantee}</code>
        </div>
        <StatusBadge effective={grant.effective} status={grant.status} />
      </header>

      <section className="outcome-panel" aria-labelledby="authority-title">
        <ShieldCheckIcon aria-hidden="true" size={28} weight="duotone" />
        <div>
          <h2 id="authority-title">{grant.effective ? "Authority is effective" : "Authority is not effective"}</h2>
          <p>
            {grant.effective
              ? "Consumers may still check an exact capability and resource before execution."
              : "This grant cannot authorize an action until its state and entire ancestor chain are effective."}
          </p>
        </div>
      </section>

      <div className="detail-grid">
        <section className="content-card">
          <h2>Objective scope</h2>
          <p className="muted-label">Capabilities</p>
          <div className="token-list">{grant.capabilities.map((item) => <span key={item}>{item}</span>)}</div>
          <p className="muted-label">Resources</p>
          <div className="token-list">{grant.resources.map((item) => <span key={item}>{item}</span>)}</div>
        </section>
        <section className="content-card">
          <h2>Lineage</h2>
          <dl className="definition-list">
            <div><dt>Parent</dt><dd>{grant.parentId || "Root grant"}</dd></div>
            <div><dt>Grantor</dt><dd><code>{grant.grantor}</code></dd></div>
            <div><dt>Root principal</dt><dd><code>{grant.rootPrincipal}</code></dd></div>
            <div><dt>Expires</dt><dd>{new Date(grant.expiresAt * 1000).toLocaleString()}</dd></div>
          </dl>
        </section>
      </div>

      <section className="content-card">
        <h2>Qualitative limits</h2>
        <ul className="clause-list">
          {grant.clauses.map((clause) => (
            <li key={clause.id}>
              <span className="clause-kind">{clause.kind === "PROHIBITION" ? "Prohibited" : "Restricted"}</span>
              <strong>{clause.id}</strong>
              <p>{clause.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {review ? <section className="content-card"><h2>Latest review</h2><p>{review.reason}</p></section> : null}

      <section className="action-bar" aria-label="Grant actions">
        {canDelegate ? <Link className="button button-primary" to={`/grants/${grant.grantId}/delegate`}>Delegate a narrower grant</Link> : null}
        {canReview ? (
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() => void runWrite("Review child grant", () => adapter.reviewChild(grant.grantId))}
            type="button"
          >
            Request semantic review
          </button>
        ) : null}
        <Link className="button button-secondary" to={`/checks?grant=${grant.grantId}`}>Check access</Link>
        {canRevoke ? (
          <button
            className="button button-danger"
            disabled={busy}
            onClick={() => void runWrite(
              "Revoke grant",
              () => adapter.revokeGrant(grant.grantId, createNonce("revoke")),
            )}
            type="button"
          >
            Revoke grant
          </button>
        ) : null}
        {!wallet.account && grant.status !== "REVOKED" ? (
          <button className="button button-danger" type="button" disabled>Connect wallet for authorized actions</button>
        ) : null}
      </section>
      {writeError ? <p className="wallet-error" role="alert">{writeError}</p> : null}
    </div>
  );
}
