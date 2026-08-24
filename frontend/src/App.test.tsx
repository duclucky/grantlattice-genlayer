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
});
