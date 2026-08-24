import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ContractAdapterProvider } from "../adapters/ContractAdapterProvider";
import type { GrantLatticeAdapter } from "../adapters/contract";
import { canonicalTestAdapter } from "../test/canonicalTestAdapter";
import { TransactionProvider } from "../transactions/TransactionProvider";
import { WalletControls } from "../wallet/WalletControls";
import { WalletProvider } from "../wallet/WalletProvider";
import type { Eip1193Provider, WalletProviderInfo } from "../wallet/types";
import { GrantDetailPage } from "./GrantDetailPage";

const account = "0x1111111111111111111111111111111111111111" as const;

function renderDetail(route: string, adapter: GrantLatticeAdapter) {
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
    <MemoryRouter initialEntries={[route]}>
      <WalletProvider discover={async () => [info]}>
        <ContractAdapterProvider adapter={adapter}>
          <TransactionProvider>
            <WalletControls />
            <Routes>
              <Route path="/grants/:grantId" element={<GrantDetailPage />} />
            </Routes>
          </TransactionProvider>
        </ContractAdapterProvider>
      </WalletProvider>
    </MemoryRouter>,
  );
}

async function connectWallet() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Connect wallet" }));
  await user.click(await screen.findByRole("button", { name: "Test Wallet" }));
}

describe("GrantDetailPage", () => {
  it("does not read or display grant details until a wallet is connected", async () => {
    const getGrant = vi.fn(canonicalTestAdapter.getGrant);
    const listGrants = vi.fn(canonicalTestAdapter.listGrants);
    renderDetail("/grants/root-1", { ...canonicalTestAdapter, getGrant, listGrants });

    expect(await screen.findByText("Connect wallet to view this grant")).toBeInTheDocument();
    expect(screen.queryByText("Authority is effective")).not.toBeInTheDocument();
    expect(getGrant).not.toHaveBeenCalled();
    expect(listGrants).not.toHaveBeenCalled();
  });

  it("does not display a grant outside the connected wallet account", async () => {
    const getGrant = vi.fn(canonicalTestAdapter.getGrant);
    const listGrants = vi.fn(async () => []);
    renderDetail("/grants/root-1", { ...canonicalTestAdapter, getGrant, listGrants });

    await connectWallet();

    expect(await screen.findByText("Grant not found for this wallet")).toBeInTheDocument();
    expect(screen.queryByText("Authority is effective")).not.toBeInTheDocument();
    await waitFor(() => expect(listGrants).toHaveBeenCalledWith(account));
    expect(getGrant).not.toHaveBeenCalled();
  });

  it("does not request an impossible review for a root grant", async () => {
    const getReview = vi.fn(async () => {
      throw new Error("GenLayer RPC error (gen_call): execution failed");
    });

    renderDetail("/grants/root-1", { ...canonicalTestAdapter, getReview });
    await connectWallet();

    expect(await screen.findByText("Authority is effective")).toBeInTheDocument();
    expect(getReview).not.toHaveBeenCalled();
  });

  it("does not request a review before a child reaches a reviewed state", async () => {
    const getReview = vi.fn(async () => {
      throw new Error("GenLayer RPC error (gen_call): execution failed");
    });

    renderDetail("/grants/child-1", { ...canonicalTestAdapter, getReview });
    await connectWallet();

    expect(await screen.findByText("Authority is not effective")).toBeInTheDocument();
    expect(getReview).not.toHaveBeenCalled();
  });
});
