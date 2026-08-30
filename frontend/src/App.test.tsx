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
        "Wallet connection scopes this app workspace. Canonical grant state remains public onchain.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps wallet-scoped visibility on direct grant URLs before connection", async () => {
    renderApp("/grants/root-1", unconfiguredContract);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Connect wallet to view this grant",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Wallet connection scopes this app workspace. Canonical grant state remains public onchain.",
      ),
    ).toBeInTheDocument();
  });
});
