import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { canonicalTestAdapter } from "../test/canonicalTestAdapter";
import { renderApp } from "../test/renderApp";

describe("GrantsPage", () => {
  it("filters canonical grants by identifier", async () => {
    const user = userEvent.setup();
    renderApp("/grants", canonicalTestAdapter);
    expect(await screen.findByText("root-1")).toBeInTheDocument();
    expect(screen.getByText("child-1")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search grants"), "child-1");

    expect(screen.queryByText("root-1")).not.toBeInTheDocument();
    expect(screen.getByText("child-1")).toBeInTheDocument();
  });
});
