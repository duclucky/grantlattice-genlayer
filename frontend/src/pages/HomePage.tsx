import {
  ArrowRightIcon,
  GitBranchIcon,
  ShieldCheckIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="page home-page">
      <section className="hero">
        <div className="eyebrow">
          <ShieldCheckIcon aria-hidden="true" size={18} weight="fill" />
          Validator-controlled least privilege
        </div>
        <h1>Delegate less. Trust more.</h1>
        <p className="hero-copy">
          GrantLattice lets agents pass work down without silently gaining a
          broader purpose, audience, retention rule, or execution right.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" to="/grants/new">
            Establish root authority
            <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
          </Link>
          <Link className="button button-secondary" to="/integrate">
            See integration patterns
          </Link>
        </div>
        <p className="honesty-note">
          Authority is issued only from finalized contract state. An unavailable
          read never becomes permission.
        </p>
      </section>

      <section className="section-block" aria-labelledby="workflow-title">
        <div className="section-heading">
          <p className="kicker">One rule across every level</p>
          <h2 id="workflow-title">A delegation chain that can only narrow</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <TreeStructureIcon aria-hidden="true" size={28} weight="duotone" />
            <h3>Lock objective scope first</h3>
            <p>Capabilities, resources, depth, and expiry must be real subsets.</p>
          </article>
          <article className="feature-card">
            <GitBranchIcon aria-hidden="true" size={28} weight="duotone" />
            <h3>Compare qualitative meaning</h3>
            <p>Validators map every child clause back to its exact parent limits.</p>
          </article>
          <article className="feature-card">
            <ShieldCheckIcon aria-hidden="true" size={28} weight="duotone" />
            <h3>Fail closed at the boundary</h3>
            <p>Revoked, expired, wider, or unverifiable chains cannot authorize use.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
