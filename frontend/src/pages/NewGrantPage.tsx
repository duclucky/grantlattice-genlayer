import { Link } from "react-router-dom";

export function NewGrantPage() {
  return (
    <div className="page form-page">
      <header className="page-header">
        <p className="kicker">Root grant</p>
        <h1>Establish root authority</h1>
        <p>Define the maximum authority this delegation tree may ever contain.</p>
      </header>
      <form className="product-form">
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
          <button className="button button-primary" type="submit" disabled>Connect wallet to create</button>
          <Link className="button button-quiet" to="/grants">Cancel</Link>
        </div>
        <p className="form-note">This non-payable action sends 0 GEN.</p>
      </form>
    </div>
  );
}
