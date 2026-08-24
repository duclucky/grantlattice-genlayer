import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ActivityPage } from "./ActivityPage";
import {
  TransactionProvider,
  useTransactions,
} from "../transactions/TransactionProvider";

function ActivityHarness() {
  const { run } = useTransactions();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void run("Create root grant", "root-1", async () => ({
            hash: "0xactivity-hash",
            async wait() { return "FINALIZED"; },
          }));
        }}
      >
        Record finalized activity
      </button>
      <ActivityPage />
    </>
  );
}

describe("ActivityPage", () => {
  it("shows the real transaction stage kept by the session provider", async () => {
    const user = userEvent.setup();
    render(
      <TransactionProvider>
        <ActivityHarness />
      </TransactionProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Record finalized activity" }));

    expect(await screen.findByText("Create root grant")).toBeInTheDocument();
    expect(screen.getByText("Finalized on Studionet")).toBeInTheDocument();
    expect(screen.getByText("0xactivity-hash")).toBeInTheDocument();
  });
});
