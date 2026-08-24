import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useContractAdapter } from "../adapters/ContractAdapterProvider";
import type { TransactionStage } from "../domain/types";
import {
  assertAsciiClauseText,
  createNonce,
  epochSeconds,
  errorMessage,
  parseAddress,
  parseCsvInput,
  parseGrantId,
} from "../domain/input";
import { useTransactions } from "../transactions/TransactionProvider";
import { useWallet } from "../wallet/WalletProvider";

export function NewGrantPage() {
  const adapter = useContractAdapter();
  const wallet = useWallet();
  const transactions = useTransactions();
  const navigate = useNavigate();
  const [stage, setStage] = useState<TransactionStage | "IDLE">("IDLE");
  const [error, setError] = useState<string | null>(null);
  const connected = Boolean(wallet.account) && wallet.networkState === "ready";
  const busy = stage === "SUBMITTED" || stage === "ACCEPTED";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const grantId = parseGrantId(data.get("grantId"));
      setStage("SUBMITTED");
      const result = await transactions.run("Create root grant", grantId, () => adapter.createRoot({
        grantId,
        grantee: parseAddress(data.get("grantee")),
        capabilities: parseCsvInput(data.get("capabilities")),
        resources: parseCsvInput(data.get("resources")),
        maxDepth: Number(data.get("maxDepth")),
        expiresAt: epochSeconds(data.get("expiresAt")),
        clauses: [
          { id: "no-marketing", kind: "PROHIBITION", text: assertAsciiClauseText(data.get("prohibition")) },
          { id: "purpose", kind: "RESTRICTION", text: assertAsciiClauseText(data.get("purpose")) },
        ],
        nonce: createNonce("create-root"),
      }));
      setStage(result);
      if (result === "FINALIZED") navigate(`/grants/${grantId}`);
      else setError(`Transaction stopped at ${result}. Canonical authority was not assumed.`);
    } catch (caught) {
      setStage("FAILED");
      setError(errorMessage(caught));
    }
  }

  return (
    <div className="page form-page">
      <header className="page-header">
        <p className="kicker">Root grant</p>
        <h1>Establish root authority</h1>
        <p>Define the maximum authority this delegation tree may ever contain.</p>
      </header>
      <form className="product-form" onSubmit={(event) => void submit(event)}>
        <fieldset>
          <legend>Identity and holder</legend>
          <label>
            Grant ID
            <input name="grantId" required minLength={3} maxLength={80} />
            <span className="field-help">Stable public identifier, 3-80 characters.</span>
          </label>
          <label>
            Grantee address
            <input name="grantee" required inputMode="text" />
            <span className="field-help">The wallet allowed to propose a direct child.</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>Objective limits</legend>
          <label>Capabilities<input name="capabilities" required placeholder="READ, SUMMARIZE" /></label>
          <label>Resources<input name="resources" required placeholder="case-1, case-2" /></label>
          <label>Maximum delegation depth<input name="maxDepth" type="number" min={1} max={8} defaultValue={3} /></label>
          <label>
            Expires at
            <input name="expiresAt" type="datetime-local" required />
            <span className="field-help">Equality at the expiry time is already late.</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>Qualitative restrictions</legend>
          <label>Purpose restriction<textarea name="purpose" required rows={4} /></label>
          <label>Prohibited use<textarea name="prohibition" required rows={4} /></label>
        </fieldset>
        <div className="form-actions">
          <button className="button button-primary" type="submit" disabled={!connected || busy}>
            {!connected ? "Connect wallet to create" : busy ? stage : "Create root grant"}
          </button>
          <Link className="button button-quiet" to="/grants">Cancel</Link>
        </div>
        {error ? <p className="wallet-error" role="alert">{error}</p> : null}
        <p className="form-note">This non-payable action sends 0 GEN.</p>
      </form>
    </div>
  );
}
