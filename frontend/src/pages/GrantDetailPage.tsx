import { ArrowLeftIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useContractAdapter } from "../adapters/ContractAdapterProvider";
import { PageState } from "../components/PageState";
import { StatusBadge } from "../components/StatusBadge";
import type { GrantRecord, ReviewRecord } from "../domain/types";

export function GrantDetailPage() {
  const { grantId = "" } = useParams();
  const adapter = useContractAdapter();
  const [grant, setGrant] = useState<GrantRecord | null>(null);
  const [review, setReview] = useState<ReviewRecord | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let live = true;
    void Promise.all([adapter.getGrant(grantId), adapter.getReview(grantId)])
      .then(([nextGrant, nextReview]) => {
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
  }, [adapter, grantId]);

  if (state === "loading") {
    return <div className="page"><PageState headingLevel={1} title="Loading grant">Reading canonical lineage and authority.</PageState></div>;
  }
  if (state === "error") {
    return <div className="page"><PageState headingLevel={1} title="Authority could not be verified" tone="danger">The canonical read failed. Access remains denied.</PageState></div>;
  }
  if (!grant) {
    return <div className="page"><PageState headingLevel={1} title="Grant not found">Check the exact grant ID or return to the workspace.</PageState></div>;
  }

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
        <StatusBadge status={grant.status} />
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
        <Link className="button button-primary" to={`/grants/${grant.grantId}/delegate`}>Delegate a narrower grant</Link>
        <Link className="button button-secondary" to={`/checks?grant=${grant.grantId}`}>Check access</Link>
        <button className="button button-danger" type="button" disabled>Connect wallet to revoke</button>
      </section>
    </div>
  );
}
