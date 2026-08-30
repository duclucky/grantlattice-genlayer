import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { canonicalTestAdapter } from "./test/canonicalTestAdapter";
import { renderApp } from "./test/renderApp";

const routeCases = [
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

  it("states the authenticated actor requirement at the integration boundary", async () => {
    renderApp("/integrate", canonicalTestAdapter);

    expect(await screen.findByText(
      "Consumers must authenticate the actor before calling can_invoke.",
    )).toBeInTheDocument();
    expect(screen.getAllByText(/can_invoke\(grant_id, actor,/u)).toHaveLength(2);
  });

  it("states that wallet workspace filtering is not confidentiality", async () => {
    renderApp("/help", canonicalTestAdapter);

    expect(await screen.findByText(
      "No. Wallet connection only scopes what this app displays. Canonical grant state remains public through contract reads, RPC, and Explorer.",
    )).toBeInTheDocument();
  });
});
