import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useContractAdapter } from "../adapters/ContractAdapterProvider";
import { PageState } from "../components/PageState";
import {
  assertAsciiClauseText,
  createNonce,
  epochSeconds,
  errorMessage,
  parseAddress,
  parseCsvInput,
  parseGrantId,
} from "../domain/input";
import type { Address, GrantRecord, TransactionStage } from "../domain/types";
import { useTransactions } from "../transactions/TransactionProvider";
import { useWallet } from "../wallet/WalletProvider";

export function DelegatePage() {
  const { grantId = "" } = useParams();
  const adapter = useContractAdapter();
  const wallet = useWallet();
  const connectedAccount = wallet.account as Address | null;
  const transactions = useTransactions();
  const navigate = useNavigate();
  const [parent, setParent] = useState<GrantRecord | null>(null);
  const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading");
  const [stage, setStage] = useState<TransactionStage | "IDLE">("IDLE");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (!connectedAccount) {
      setParent(null);
      setReadState("ready");
      return () => { live = false; };
    }
    setReadState("loading");
    void adapter.listGrants(connectedAccount).then((grants) => {
      if (live) {
        setParent(grants.find((grant) => grant.grantId === grantId) ?? null);
        setReadState("ready");
      }
    }).catch(() => {
      if (live) setReadState("error");
    });
    return () => { live = false; };
  }, [adapter, connectedAccount, grantId]);

  const connectedGrantor = Boolean(
    parent
    && parent.status === "ACTIVE"
    && parent.effective
    && wallet.account?.toLowerCase() === parent.grantee.toLowerCase()
    && wallet.networkState === "ready",
  );
  const busy = stage === "SUBMITTED" || stage === "ACCEPTED";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const childId = parseGrantId(data.get("childId"));
      setStage("SUBMITTED");
      const result = await transactions.run("Propose child grant", childId, () => adapter.proposeChild({
        parentId: grantId,
        childId,
        childGrantee: parseAddress(data.get("childGrantee")),
        capabilities: parseCsvInput(data.get("capabilities")),
        resources: parseCsvInput(data.get("resources")),
        expiresAt: epochSeconds(data.get("expiresAt")),
        clauses: [
          { id: "no-marketing", kind: "PROHIBITION", text: assertAsciiClauseText(data.get("prohibition")) },
          { id: "purpose", kind: "RESTRICTION", text: assertAsciiClauseText(data.get("purpose")) },
        ],
        nonce: createNonce("propose-child"),
      }));
      setStage(result);
      if (result === "FINALIZED") navigate(`/grants/${childId}`);
      else setError(`Transaction stopped at ${result}. The child remains non-authorizing.`);
    } catch (caught) {
      setStage("FAILED");
      setError(errorMessage(caught));
    }
  }

  if (!connectedAccount) {
    return <div className="page"><PageState headingLevel={1} title="Connect wallet to delegate">Parent authority stays hidden until you choose a wallet.</PageState></div>;
  }
  if (readState === "loading") {
    return <div className="page"><PageState headingLevel={1} title="Loading parent authority">Reading canonical parent state.</PageState></div>;
  }
  if (readState === "error" || !parent) {
    return <div className="page"><PageState headingLevel={1} title="Parent authority unavailable for this wallet" tone="danger">Delegation remains disabled.</PageState></div>;
  }

  return (
    <div className="page form-page">
      <header className="page-header">
        <p className="kicker">Child grant</p>
        <h1>Delegate from {grantId}</h1>
        <p>The child must stay inside every objective and qualitative parent limit.</p>
      </header>
      <aside className="boundary-note">
        Parent authority is read from canonical state before this form becomes
        writable. Expired, revoked, or unavailable parents fail closed.
      </aside>
      <form className="product-form" onSubmit={(event) => void submit(event)}>
        <fieldset>
          <legend>Child identity</legend>
          <label>Child grant ID<input name="childId" required /></label>
          <label>Child grantee address<input name="childGrantee" required /></label>
        </fieldset>
        <fieldset>
          <legend>Narrower objective scope</legend>
          <label>Capabilities<input name="capabilities" required /></label>
          <label>Resources<input name="resources" required /></label>
          <label>Expires at<input name="expiresAt" type="datetime-local" required /></label>
        </fieldset>
        <fieldset>
          <legend>Qualitative limits</legend>
          <label>Purpose restriction<textarea name="purpose" rows={4} required /></label>
          <label>Prohibited use<textarea name="prohibition" rows={4} required /></label>
        </fieldset>
        <div className="form-actions">
          <button className="button button-primary" type="submit" disabled={!connectedGrantor || busy}>
            {!wallet.account
              ? "Connect wallet to delegate"
              : !connectedGrantor
                ? "Current wallet cannot delegate"
                : busy ? stage : "Propose child grant"}
          </button>
          <Link className="button button-quiet" to={`/grants/${grantId}`}>Cancel</Link>
        </div>
        {error ? <p className="wallet-error" role="alert">{error}</p> : null}
        <p className="form-note">This non-payable action sends 0 GEN.</p>
      </form>
    </div>
  );
}
