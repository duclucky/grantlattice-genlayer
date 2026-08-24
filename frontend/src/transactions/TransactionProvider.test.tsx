import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  TransactionProvider,
  useTransactions,
} from "./TransactionProvider";
import type { TransactionStage, WriteRequest } from "../domain/types";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function TransactionProbe({ request }: { request: WriteRequest }) {
  const { activities, run } = useTransactions();
  const [result, setResult] = useState<TransactionStage | "IDLE">("IDLE");

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void run("Create root grant", "root-1", async () => request)
            .then(setResult);
        }}
      >
        Start
      </button>
      <output>{activities[0]?.stage ?? result}</output>
    </div>
  );
}

describe("TransactionProvider", () => {
  it("shows submitted before the real wait result becomes finalized", async () => {
    const user = userEvent.setup();
    const finality = deferred<TransactionStage>();
    const request: WriteRequest = {
      hash: "0xreal-public-hash",
      wait: () => finality.promise,
    };

    render(
      <TransactionProvider>
        <TransactionProbe request={request} />
      </TransactionProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByText("SUBMITTED")).toBeInTheDocument();

    finality.resolve("FINALIZED");
    expect(await screen.findByText("FINALIZED")).toBeInTheDocument();
  });

  it("records failed finality without inventing a successful stage", async () => {
    const user = userEvent.setup();
    const request: WriteRequest = {
      hash: "0xfailed-public-hash",
      async wait() {
        throw new Error("receipt unavailable");
      },
    };

    render(
      <TransactionProvider>
        <TransactionProbe request={request} />
      </TransactionProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(await screen.findByText("FAILED")).toBeInTheDocument();
  });
});
