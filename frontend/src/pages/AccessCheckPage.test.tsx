import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { GrantLatticeAdapter } from "../adapters/contract";
import { unconfiguredContract } from "../adapters/unconfiguredContract";
import { canonicalTestAdapter } from "../test/canonicalTestAdapter";
import { renderApp } from "../test/renderApp";

async function check(
  grantId: string,
  capabilityId: string,
  resourceId: string,
  adapter: GrantLatticeAdapter = canonicalTestAdapter,
) {
  const user = userEvent.setup();
  renderApp("/checks", adapter);

  await user.type(screen.getByLabelText("Grant ID"), grantId);
  await user.type(screen.getByLabelText("Capability ID"), capabilityId);
  await user.type(screen.getByLabelText("Resource ID"), resourceId);
  await user.click(
    screen.getByRole("button", { name: "Check canonical authority" }),
  );
}

describe("AccessCheckPage", () => {
  it("shows an allowed decision returned by canonical contract state", async () => {
    await check("root-1", "READ", "case-1");

    expect(await screen.findByText("Action allowed")).toBeInTheDocument();
    expect(screen.getByText("ALLOWED")).toBeInTheDocument();
  });

  it("shows a denial and its canonical reason", async () => {
    await check("root-1", "WRITE", "case-1");

    expect(await screen.findByText("Action denied")).toBeInTheDocument();
    expect(screen.getByText("CAPABILITY_MISSING")).toBeInTheDocument();
  });

  it("fails closed when canonical state cannot be read", async () => {
    await check("root-1", "READ", "case-1", unconfiguredContract);

    expect(
      await screen.findByText("Authority could not be verified"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Action allowed")).not.toBeInTheDocument();
  });
});
