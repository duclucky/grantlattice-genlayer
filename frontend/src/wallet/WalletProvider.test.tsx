import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Eip1193Provider, WalletProviderInfo } from "./types";
import { useWallet, WalletProvider } from "./WalletProvider";

const account = "0x1111111111111111111111111111111111111111";

afterEach(() => {
  sessionStorage.clear();
});

function Harness() {
  const wallet = useWallet();
  return (
    <div>
      <p>{wallet.account ?? "Disconnected"}</p>
      <p>{wallet.providers.map((item) => item.name).join(", ")}</p>
      <button
        disabled={!wallet.providers[0]}
        onClick={() => void wallet.connect(wallet.providers[0]!)}
        type="button"
      >
        Connect first
      </button>
      <button onClick={wallet.disconnect} type="button">Disconnect</button>
    </div>
  );
}

function fixture() {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const request = vi.fn(async ({ method }: { method: string }) => {
    if (method === "eth_requestAccounts") return [account];
    if (method === "eth_accounts") return [account];
    if (method === "eth_chainId") return "0xf22f";
    return null;
  });
  const provider: Eip1193Provider = {
    request,
    on: vi.fn((event, listener) => listeners.set(event, listener)),
    removeListener: vi.fn((event) => listeners.delete(event)),
  };
  const info: WalletProviderInfo = {
    id: "wallet-1",
    name: "Test Wallet",
    rdns: "test.wallet",
    provider,
    selected: false,
  };
  return { info, provider, request };
}

describe("WalletProvider", () => {
  it("discovers without auto-requesting, then connects only the selected wallet", async () => {
    const user = userEvent.setup();
    const { info, request } = fixture();
    render(
      <WalletProvider discover={async () => [info]}>
        <Harness />
      </WalletProvider>,
    );

    expect(await screen.findByText("Test Wallet")).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Connect first" }));

    expect(await screen.findByText(account)).toBeInTheDocument();
    expect(request.mock.calls.map(([args]) => args.method)).toEqual([
      "wallet_switchEthereumChain",
      "eth_requestAccounts",
      "eth_chainId",
    ]);
  });

  it("restores the deliberately selected provider silently after remount", async () => {
    const { info, request } = fixture();
    sessionStorage.setItem("grantlattice.wallet.provider.rdns", info.rdns);
    const first = render(
      <WalletProvider discover={async () => [info]}>
        <Harness />
      </WalletProvider>,
    );

    expect(await screen.findByText(account)).toBeInTheDocument();
    expect(request.mock.calls.map(([args]) => args.method)).toEqual([
      "eth_accounts",
      "eth_chainId",
    ]);
    first.unmount();
  });

  it("keeps an explicit disconnect logged out across remount", async () => {
    const user = userEvent.setup();
    const { info } = fixture();
    sessionStorage.setItem("grantlattice.wallet.provider.rdns", info.rdns);
    const first = render(
      <WalletProvider discover={async () => [info]}>
        <Harness />
      </WalletProvider>,
    );
    await screen.findByText(account);
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    first.unmount();

    render(
      <WalletProvider discover={async () => [info]}>
        <Harness />
      </WalletProvider>,
    );
    expect(await screen.findByText("Disconnected")).toBeInTheDocument();
    expect(sessionStorage.getItem("grantlattice.wallet.provider.rdns")).toBeNull();
  });

  it("disconnects the session and removes selected-provider listeners", async () => {
    const user = userEvent.setup();
    const { info, provider } = fixture();
    render(
      <WalletProvider discover={async () => [info]}>
        <Harness />
      </WalletProvider>,
    );
    await screen.findByText("Test Wallet");
    await user.click(screen.getByRole("button", { name: "Connect first" }));
    await screen.findByText(account);
    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(screen.getByText("Disconnected")).toBeInTheDocument();
    expect(provider.removeListener).toHaveBeenCalledWith(
      "accountsChanged",
      expect.any(Function),
    );
    expect(provider.removeListener).toHaveBeenCalledWith(
      "chainChanged",
      expect.any(Function),
    );
  });
});
