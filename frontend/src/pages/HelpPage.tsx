export function HelpPage() {
  return (
    <div className="page help-page">
      <header className="page-header">
        <p className="kicker">Recovery without guesswork</p>
        <h1>Help and safety</h1>
        <p>Understand authority states, wallet behavior, and fail-closed recovery.</p>
      </header>
      <details open>
        <summary>Why is a child awaiting review?</summary>
        <p>A proposed child is inactive until objective checks and semantic attenuation both finalize successfully.</p>
      </details>
      <details open>
        <summary>What happens after semantic ambiguity?</summary>
        <p>Semantic ambiguity is terminal for the recorded parent/child clause pair. Changing expiry, grantee, scope, child ID, or formatting does not unlock it; revise the ambiguous clause itself.</p>
      </details>
      <details>
        <summary>When can a review be retried?</summary>
        <p>A technical or unverifiable failure is retryable because no semantic classification completed. The grant remains inactive during every retry.</p>
      </details>
      <details>
        <summary>What happens after revocation or expiry?</summary>
        <p>Effective-authority reads walk the bounded ancestor chain and deny affected descendants without rewriting them.</p>
      </details>
      <details>
        <summary>Does GrantLattice move GEN?</summary>
        <p>No. Every v1 action is non-payable and sends 0 GEN.</p>
      </details>
      <details>
        <summary>What if the canonical read is unavailable?</summary>
        <p>The product fails closed, explains that authority could not be verified, and offers a read retry.</p>
      </details>
      <details>
        <summary>Does connecting a wallet make grant data private?</summary>
        <p>No. Wallet connection only scopes what this app displays. Canonical grant state remains public through contract reads, RPC, and Explorer.</p>
      </details>
    </div>
  );
}
