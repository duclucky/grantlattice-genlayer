import { ShieldCheckIcon } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";

import { useContractAdapter } from "../adapters/ContractAdapterProvider";
import type { AccessDecision, Address } from "../domain/types";
import { useWallet } from "../wallet/WalletProvider";

export function AccessCheckPage() {
  const adapter = useContractAdapter();
  const wallet = useWallet();
  const actor = wallet.account as Address | null;
  const [decision, setDecision] = useState<AccessDecision | null>(null);
  const [readFailed, setReadFailed] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setReadFailed(false);
    setDecision(null);
    if (!actor) return;
    try {
      const result = await adapter.canInvoke(
        String(data.get("grantId")),
        actor,
        String(data.get("capabilityId")),
        String(data.get("resourceId")),
      );
      setDecision(result);
    } catch {
      setReadFailed(true);
    }
  }

  return (
    <div className="page form-page">
      <header className="page-header">
        <p className="kicker">Fail-closed read</p>
        <h1>Check an action before it runs</h1>
        <p>Ask canonical state about one exact grant, capability, and resource.</p>
      </header>
      <form className="product-form access-form" onSubmit={handleSubmit}>
        <label>Grant ID<input name="grantId" required /></label>
        <label>Capability ID<input name="capabilityId" required /></label>
        <label>Resource ID<input name="resourceId" required /></label>
        <p className="form-note">
          {actor
            ? <>Actor from connected wallet: <code>{actor}</code></>
            : "Connect a wallet to identify the actor."}
        </p>
        <button className="button button-primary" disabled={!actor} type="submit">
          <ShieldCheckIcon aria-hidden="true" size={18} weight="bold" />
          Check canonical authority
        </button>
      </form>
      <section className="page-state" aria-live="polite">
        <h2>
          {readFailed
            ? "Authority could not be verified"
            : decision
            ? decision.allowed
              ? "Action allowed"
              : "Action denied"
            : "No access check yet"}
        </h2>
        <p>
          {readFailed
            ? "Canonical state is unavailable. This action must not run."
            : decision
            ? decision.reason
            : "A missing or unavailable canonical read will never be displayed as allowed."}
        </p>
      </section>
    </div>
  );
}
