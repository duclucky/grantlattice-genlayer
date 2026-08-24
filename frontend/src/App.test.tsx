import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App bootstrap", () => {
  it("describes unavailable canonical state without pretending success", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "GrantLattice" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Canonical contract access is not configured yet."),
    ).toBeInTheDocument();
  });
});
