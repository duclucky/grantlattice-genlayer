import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Eip1193Provider, WalletProviderInfo } from "./types";
import { useWallet, WalletProvider } from "./WalletProvider";

const account = "0x1111111111111111111111111111111111111111";

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
    ]);
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
