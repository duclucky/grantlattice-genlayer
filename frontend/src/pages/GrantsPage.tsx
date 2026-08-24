import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useContractAdapter } from "../adapters/ContractAdapterProvider";
import { PageState } from "../components/PageState";
import { StatusBadge } from "../components/StatusBadge";
import type { GrantRecord } from "../domain/types";

export function GrantsPage() {
  const adapter = useContractAdapter();
  const [grants, setGrants] = useState<GrantRecord[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let live = true;
    void adapter.listGrants().then((items) => {
      if (live) {
        setGrants(items);
        setState("ready");
      }
    }).catch(() => {
      if (live) setState("error");
    });
    return () => { live = false; };
  }, [adapter]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return grants;
    return grants.filter((grant) =>
      [grant.grantId, grant.grantee, grant.status]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [grants, query]);

  return (
    <div className="page">
      <header className="page-header page-header-row">
        <div>
          <p className="kicker">Authority history</p>
          <h1>Delegation workspace</h1>
          <p>Find a grant, inspect its lineage, and take only legal next actions.</p>
        </div>
        <Link className="button button-primary" to="/grants/new">
          <PlusIcon aria-hidden="true" size={18} weight="bold" />
          Create root grant
        </Link>
      </header>

      <label className="search-field">
        <span>Search grants</span>
        <span className="input-with-icon">
          <MagnifyingGlassIcon aria-hidden="true" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Grant ID, grantee, or status"
            type="search"
          />
        </span>
      </label>

      {state === "loading" ? (
        <PageState title="Loading authority">Reading canonical grant state.</PageState>
      ) : state === "error" ? (
        <PageState title="Authority could not be verified" tone="danger">
          The canonical read is unavailable. No grant is treated as active.
        </PageState>
      ) : filtered.length === 0 ? (
        <PageState title={grants.length === 0 ? "No grants yet" : "No matching grants"}>
          {grants.length === 0
            ? "Create a root grant to establish the first bounded authority."
            : "Clear or change your search to see another grant."}
        </PageState>
      ) : (
        <ul className="grant-grid" aria-label="Canonical grants">
          {filtered.map((grant) => (
            <li key={grant.grantId}>
              <Link className="grant-card" to={`/grants/${grant.grantId}`}>
                <div className="card-row">
                  <strong>{grant.grantId}</strong>
                  <StatusBadge effective={grant.effective} status={grant.status} />
                </div>
                <p className="muted-label">Grantee</p>
                <code className="address-token">{grant.grantee}</code>
                <div className="scope-row">
                  <span>{grant.capabilities.length} capabilities</span>
                  <span>{grant.resources.length} resources</span>
                  <span>Level {grant.depth}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
