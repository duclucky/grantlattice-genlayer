import {
  BookOpenTextIcon,
  CirclesThreeIcon,
  ClockCounterClockwiseIcon,
  CodeIcon,
  ListIcon,
  ShieldCheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { WalletControls } from "../wallet/WalletControls";

const navItems = [
  { to: "/grants", label: "Grants", icon: CirclesThreeIcon },
  { to: "/checks", label: "Access check", icon: ShieldCheckIcon },
  { to: "/activity", label: "Activity", icon: ClockCounterClockwiseIcon },
  { to: "/integrate", label: "Integrate", icon: CodeIcon },
  { to: "/help", label: "Help", icon: BookOpenTextIcon },
];

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <NavLink className="brand" to="/" aria-label="GrantLattice home">
            <span className="brand-mark" aria-hidden="true">GL</span>
            <span>GrantLattice</span>
          </NavLink>
          <button
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="button button-secondary menu-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? (
              <XIcon aria-hidden="true" size={20} weight="bold" />
            ) : (
              <ListIcon aria-hidden="true" size={20} weight="bold" />
            )}
          </button>
          <nav
            className={menuOpen ? "primary-nav primary-nav-open" : "primary-nav"}
            aria-label="Primary"
            id="primary-navigation"
          >
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active" : "nav-link"
                }
                onClick={() => setMenuOpen(false)}
              >
                <Icon aria-hidden="true" size={18} weight="bold" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <WalletControls />
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>GrantLattice verifies narrower delegation before authority becomes active.</p>
        <NavLink to="/help">Safety and limits</NavLink>
      </footer>
    </div>
  );
}
