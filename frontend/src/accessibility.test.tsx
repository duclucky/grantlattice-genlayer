import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { canonicalTestAdapter } from "./test/canonicalTestAdapter";
import { renderApp } from "./test/renderApp";

const routes = [
  ["/", "Delegate less. Trust more."],
  ["/grants", "Delegation workspace"],
  ["/grants/new", "Establish root authority"],
  ["/grants/root-1", "Connect wallet to view this grant"],
  ["/grants/root-1/delegate", "Connect wallet to delegate"],
  ["/checks", "Check an action before it runs"],
  ["/activity", "Network activity"],
  ["/integrate", "Protect your execution boundary"],
  ["/help", "Help and safety"],
] as const;

describe("product accessibility", () => {
  it.each(routes)("has no automated accessibility violations on %s", async (route, heading) => {
    const view = renderApp(route, canonicalTestAdapter);
    await screen.findByRole("heading", { level: 1, name: heading });

    const results = await axe(view.container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
    view.unmount();
  });
});
