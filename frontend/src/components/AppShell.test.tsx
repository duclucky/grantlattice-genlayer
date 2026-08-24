import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { canonicalTestAdapter } from "../test/canonicalTestAdapter";
import { renderApp } from "../test/renderApp";

describe("AppShell", () => {
  it("opens and closes the responsive primary navigation", async () => {
    const user = userEvent.setup();
    renderApp("/", canonicalTestAdapter);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Primary" })).toHaveClass(
      "primary-nav-open",
    );

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
