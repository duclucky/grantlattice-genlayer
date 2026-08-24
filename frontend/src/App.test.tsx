import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { unconfiguredContract } from "./adapters/unconfiguredContract";
import { renderApp } from "./test/renderApp";

describe("App bootstrap", () => {
  it("does not read or display grant history before wallet connection", async () => {
    renderApp("/grants", unconfiguredContract);

    expect(
      await screen.findByRole("heading", {
        name: "Connect wallet to view your grants",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Grant details stay hidden until you choose a wallet.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps a level-one privacy gate on direct grant URLs before wallet connection", async () => {
    renderApp("/grants/root-1", unconfiguredContract);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Connect wallet to view this grant",
      }),
    ).toBeInTheDocument();
  });
});
