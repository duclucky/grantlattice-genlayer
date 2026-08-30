import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ContractAdapterProvider } from "../adapters/ContractAdapterProvider";
import type { GrantLatticeAdapter } from "../adapters/contract";
import { canonicalTestAdapter } from "../test/canonicalTestAdapter";
import { TransactionProvider } from "../transactions/TransactionProvider";
import { WalletControls } from "../wallet/WalletControls";
import { WalletProvider } from "../wallet/WalletProvider";
import type { Eip1193Provider, WalletProviderInfo } from "../wallet/types";
import { GrantsPage } from "./GrantsPage";

const account = "0x1111111111111111111111111111111111111111" as const;

function renderConnectedHarness(adapter: GrantLatticeAdapter) {
  const request = vi.fn(async ({ method }: { method: string }) =>
    method === "eth_requestAccounts" ? [account] : null,
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
    <MemoryRouter>
      <WalletProvider discover={async () => [info]}>
        <ContractAdapterProvider adapter={adapter}>
          <TransactionProvider>
            <WalletControls />
            <GrantsPage />
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

describe("GrantsPage", () => {
  it("does not read or display grants until a wallet is connected", async () => {
    const listGrants = vi.fn(canonicalTestAdapter.listGrants);
    renderConnectedHarness({ ...canonicalTestAdapter, listGrants });

    expect(await screen.findByText("Connect wallet to view your grants")).toBeInTheDocument();
    expect(screen.getByText(
      "Wallet connection scopes this app workspace. Canonical grant state remains public onchain.",
    )).toBeInTheDocument();
    expect(screen.queryByText("root-1")).not.toBeInTheDocument();
    expect(listGrants).not.toHaveBeenCalled();
  });

  it("reads grants only for the connected wallet account", async () => {
    const user = userEvent.setup();
    const listGrants = vi.fn(async (selectedAccount?: string) => {
      if (selectedAccount !== account) return [];
      const grant = await canonicalTestAdapter.getGrant("root-1");
      return grant ? [{ ...grant, grantee: account }] : [];
    });
    renderConnectedHarness({ ...canonicalTestAdapter, listGrants });

    await connectWallet(user);

    expect(await screen.findByText("root-1")).toBeInTheDocument();
    await waitFor(() => expect(listGrants).toHaveBeenCalledWith(account));
    expect(screen.queryByText("child-1")).not.toBeInTheDocument();
  });

  it("filters canonical grants by identifier", async () => {
    const user = userEvent.setup();
    renderConnectedHarness(canonicalTestAdapter);
    await connectWallet(user);
    expect(await screen.findByText("root-1")).toBeInTheDocument();
    expect(screen.getByText("child-1")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search your grants"), "child-1");

    expect(screen.queryByText("root-1")).not.toBeInTheDocument();
    expect(screen.getByText("child-1")).toBeInTheDocument();
  });

  it("never labels a stored ACTIVE grant as active authority when lineage is ineffective", async () => {
    const user = userEvent.setup();
    renderConnectedHarness({
      ...canonicalTestAdapter,
      async listGrants() {
        const grant = await canonicalTestAdapter.getGrant("root-1");
        return [{ ...grant!, effective: false }];
      },
    });
    await connectWallet(user);

    expect(await screen.findByText("Inactive through lineage")).toBeInTheDocument();
    expect(screen.queryByText("Active authority")).not.toBeInTheDocument();
  });
});
