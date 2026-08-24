import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { unconfiguredContract } from "./adapters/unconfiguredContract";
import { renderApp } from "./test/renderApp";

describe("App bootstrap", () => {
  it("describes unavailable canonical state without pretending success", async () => {
    renderApp("/grants", unconfiguredContract);

    expect(
      await screen.findByRole("heading", {
        name: "Authority could not be verified",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The canonical read is unavailable. No grant is treated as active.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps a level-one page title when a grant read fails closed", async () => {
    renderApp("/grants/root-1", unconfiguredContract);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Authority could not be verified",
      }),
    ).toBeInTheDocument();
  });
});
