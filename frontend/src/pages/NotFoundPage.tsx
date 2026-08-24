import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="page">
      <header className="page-header">
        <p className="kicker">Page not found</p>
        <h1>This route is outside the lattice</h1>
        <p>Return to canonical grant history to continue.</p>
      </header>
      <Link className="button button-primary" to="/grants">Go to grants</Link>
    </div>
  );
}
