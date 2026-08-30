import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  TransactionProvider,
  useTransactions,
} from "./TransactionProvider";
import type { TransactionStage, WriteRequest } from "../domain/types";
import type { ActivityScope } from './activityHistory';
const scope: ActivityScope = { account: `0x${'a'.repeat(40)}`, contractAddress: `0x${'b'.repeat(40)}`, network: 'studionet' };
const emptyHistory = async () => [];

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
      <TransactionProvider scope={scope} loadHistory={emptyHistory}>
        <TransactionProbe request={request} />
      </TransactionProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByText("SUBMITTED")).toBeInTheDocument();

    finality.resolve("FINALIZED");
    expect(await screen.findByText("FINALIZED")).toBeInTheDocument();
  });

  it("records unavailable finality as unconfirmed without inventing success or chain failure", async () => {
    const user = userEvent.setup();
    const request: WriteRequest = {
      hash: "0xfailed-public-hash",
      async wait() {
        throw new Error("receipt unavailable");
      },
    };

    render(
      <TransactionProvider scope={scope} loadHistory={emptyHistory}>
        <TransactionProbe request={request} />
      </TransactionProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(await screen.findByText("UNCONFIRMED")).toBeInTheDocument();
  });

  it("surfaces accepted before finalized when the real request reports both", async () => {
    const user = userEvent.setup();
    const accepted = deferred<void>();
    const finalized = deferred<void>();
    const request: WriteRequest = {
      hash: "0xaccepted-public-hash",
      async wait(onStage) {
        await accepted.promise;
        onStage?.("ACCEPTED");
        await finalized.promise;
        onStage?.("FINALIZED");
        return "FINALIZED";
      },
    };

    render(
      <TransactionProvider scope={scope} loadHistory={emptyHistory}>
        <TransactionProbe request={request} />
      </TransactionProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Start" }));
    accepted.resolve();
    expect(await screen.findByText("ACCEPTED")).toBeInTheDocument();
    finalized.resolve();
    expect(await screen.findByText("FINALIZED")).toBeInTheDocument();
  });
});
