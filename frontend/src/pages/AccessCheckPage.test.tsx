import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App";
import { ContractAdapterProvider } from "../adapters/ContractAdapterProvider";
import type { GrantLatticeAdapter } from "../adapters/contract";
import { unconfiguredContract } from "../adapters/unconfiguredContract";
import { parentGrantee } from "../test/canonicalTestAdapter";
import { TransactionProvider } from "../transactions/TransactionProvider";
import { WalletProvider } from "../wallet/WalletProvider";
import type { Eip1193Provider, WalletProviderInfo } from "../wallet/types";

function renderAccess(adapter: GrantLatticeAdapter) {
  const request = vi.fn(async ({ method }: { method: string }) =>
    method === "eth_requestAccounts" ? [parentGrantee] : null,
  );
  const provider: Eip1193Provider = { request };
  const info: WalletProviderInfo = {
    id: "wallet-1",
    name: "Test Wallet",
    rdns: "test.wallet",
    provider,
    selected: false,
  };
  render(
    <MemoryRouter initialEntries={["/checks"]}>
      <WalletProvider discover={async () => [info]}>
        <ContractAdapterProvider adapter={adapter}>
          <TransactionProvider>
            <App />
          </TransactionProvider>
        </ContractAdapterProvider>
      </WalletProvider>
    </MemoryRouter>,
  );
}

async function connectWallet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Connect wallet" }));
  await user.click(await screen.findByRole("button", { name: "Test Wallet" }));
}

async function submitCheck(
  user: ReturnType<typeof userEvent.setup>,
  grantId: string,
  capabilityId: string,
  resourceId: string,
) {
  await user.type(screen.getByLabelText("Grant ID"), grantId);
  await user.type(screen.getByLabelText("Capability ID"), capabilityId);
  await user.type(screen.getByLabelText("Resource ID"), resourceId);
  await user.click(screen.getByRole("button", { name: "Check canonical authority" }));
}

describe("AccessCheckPage", () => {
  it("disables the canonical check until a wallet actor is connected", async () => {
    const canInvoke = vi.fn();
    renderAccess({ ...unconfiguredContract, canInvoke });

    expect(
      await screen.findByRole("button", { name: "Check canonical authority" }),
    ).toBeDisabled();
    expect(screen.getByText("Connect a wallet to identify the actor.")).toBeInTheDocument();
    expect(canInvoke).not.toHaveBeenCalled();
  });

  it("passes the connected wallet account as actor and shows an allowed result", async () => {
    const user = userEvent.setup();
    const canInvoke = vi.fn(async () => ({ allowed: true, reason: "ALLOWED" as const }));
    renderAccess({ ...unconfiguredContract, canInvoke });
    await connectWallet(user);

    await submitCheck(user, "root-1", "READ", "case-1");

    await waitFor(() => expect(canInvoke).toHaveBeenCalledWith(
      "root-1",
      parentGrantee,
      "READ",
      "case-1",
    ));
    expect(await screen.findByText("Action allowed")).toBeInTheDocument();
    expect(screen.getByText("ALLOWED")).toBeInTheDocument();
  });

  it("shows an actor mismatch as a canonical denial", async () => {
    const user = userEvent.setup();
    const canInvoke = vi.fn(async () => ({
      allowed: false,
      reason: "ACTOR_MISMATCH" as const,
    }));
    renderAccess({ ...unconfiguredContract, canInvoke });
    await connectWallet(user);

    await submitCheck(user, "root-1", "READ", "case-1");

    expect(await screen.findByText("Action denied")).toBeInTheDocument();
    expect(screen.getByText("ACTOR_MISMATCH")).toBeInTheDocument();
  });

  it("fails closed when canonical state cannot be read", async () => {
    const user = userEvent.setup();
    renderAccess(unconfiguredContract);
    await connectWallet(user);

    await submitCheck(user, "root-1", "READ", "case-1");

    expect(
      await screen.findByText("Authority could not be verified"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Action allowed")).not.toBeInTheDocument();
  });
});
