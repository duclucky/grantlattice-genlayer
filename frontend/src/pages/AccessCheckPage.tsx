import { ShieldCheckIcon } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";

import { useContractAdapter } from "../adapters/ContractAdapterProvider";
import type { AccessDecision } from "../domain/types";

export function AccessCheckPage() {
  const adapter = useContractAdapter();
  const [decision, setDecision] = useState<AccessDecision | null>(null);
  const [readFailed, setReadFailed] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setReadFailed(false);
    setDecision(null);
    try {
      const result = await adapter.canInvoke(
        String(data.get("grantId")),
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
        <button className="button button-primary" type="submit">
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
