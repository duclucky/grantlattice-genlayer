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
      <details>
        <summary>What does needs another review mean?</summary>
        <p>The validator result was ambiguous, unavailable, or invalid. No child authority was issued.</p>
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
    </div>
  );
}
