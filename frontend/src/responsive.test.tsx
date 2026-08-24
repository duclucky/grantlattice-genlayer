import { describe, expect, it } from "vitest";

import css from "./styles/global.css?raw";

describe("responsive baseline", () => {
  it("collapses primary navigation without horizontal scrolling", () => {
    expect(css).toContain("@media (max-width: 48rem)");
    expect(css).toMatch(/\.primary-nav\s*\{[^}]*display:\s*none;/);
    expect(css).toMatch(/\.primary-nav-open\s*\{[^}]*display:\s*flex;/);
    expect(css).not.toContain("overflow-x: auto");
  });

  it("keeps the mobile menu trigger compact beside the wallet action", () => {
    expect(css).toMatch(/\.button\.menu-trigger\s*\{[^}]*display:\s*none;/);
    expect(css).toMatch(/\.button\.menu-trigger\s*\{[^}]*width:\s*2\.75rem;/);
  });

  it("provides reduced-motion and visible-focus fallbacks", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline: 3px solid var(--color-ring)");
  });
});
