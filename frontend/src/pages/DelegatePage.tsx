import { Link, useParams } from "react-router-dom";

export function DelegatePage() {
  const { grantId = "" } = useParams();

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
      <form className="product-form">
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
          <button className="button button-primary" type="submit" disabled>Connect wallet to delegate</button>
          <Link className="button button-quiet" to={`/grants/${grantId}`}>Cancel</Link>
        </div>
        <p className="form-note">This non-payable action sends 0 GEN.</p>
      </form>
    </div>
  );
}
