import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Eip1193Provider, WalletProviderInfo } from "./types";
import { WalletControls } from "./WalletControls";
import { WalletProvider } from "./WalletProvider";

const account = "0x1111111111111111111111111111111111111111";

function setup() {
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
    <WalletProvider discover={async () => [info]}>
      <WalletControls />
    </WalletProvider>,
  );
  return { request };
}

describe("WalletControls", () => {
  it("opens a labelled picker and connects only the chosen wallet", async () => {
    const user = userEvent.setup();
    const { request } = setup();
    await user.click(screen.getByRole("button", { name: "Connect wallet" }));

    expect(screen.getByRole("dialog", { name: "Choose a wallet" })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Test Wallet" }));

    expect(await screen.findByRole("button", { name: `Account ${account}` })).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
  });

  it("restores trigger focus after Escape closes the picker", async () => {
    const user = userEvent.setup();
    setup();
    const trigger = screen.getByRole("button", { name: "Connect wallet" });
    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Choose a wallet" });

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("opens the account menu and disconnects explicitly", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    await user.click(await screen.findByRole("button", { name: "Test Wallet" }));
    await user.click(await screen.findByRole("button", { name: `Account ${account}` }));

    await user.click(await screen.findByRole("menuitem", { name: "Disconnect" }));

    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeInTheDocument();
  });
});
