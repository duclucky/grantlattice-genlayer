import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { canonicalTestAdapter } from "./test/canonicalTestAdapter";
import { renderApp } from "./test/renderApp";

const routeCases = [
  ["/", "Delegate less. Trust more."],
  ["/grants", "Delegation workspace"],
  ["/grants/new", "Establish root authority"],
  ["/grants/root-1", "Grant root-1"],
  ["/grants/root-1/delegate", "Delegate from root-1"],
  ["/checks", "Check an action before it runs"],
  ["/activity", "Network activity"],
  ["/integrate", "Protect your execution boundary"],
  ["/help", "Help and safety"],
] as const;

describe("product routes", () => {
  it.each(routeCases)("renders a real page for %s", async (route, heading) => {
    renderApp(route, canonicalTestAdapter);

    expect(await screen.findByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Primary" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: heading, level: 1 }),
    ).toBeInTheDocument();
  });

  it("moves from grant history into the root creation flow", async () => {
    const user = userEvent.setup();
    renderApp("/grants", canonicalTestAdapter);

    await user.click(
      await screen.findByRole("link", { name: "Create root grant" }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Establish root authority",
        level: 1,
      }),
    ).toBeInTheDocument();
  });
});
