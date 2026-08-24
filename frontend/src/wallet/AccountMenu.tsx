import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CaretDownIcon, SignOutIcon } from "@phosphor-icons/react";

import { useWallet } from "./WalletProvider";

function compact(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AccountMenu() {
  const wallet = useWallet();
  if (!wallet.account) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={`Account ${wallet.account}`}
          className="button button-secondary account-trigger"
          type="button"
        >
          {compact(wallet.account)}
          <CaretDownIcon aria-hidden="true" size={16} weight="bold" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="account-menu" sideOffset={8}>
          <div className="account-summary">
            <span>Connected with {wallet.selectedProvider?.name}</span>
            <code>{wallet.account}</code>
            <small>{wallet.networkState === "ready" ? "Studionet ready" : "Network unavailable"}</small>
          </div>
          <DropdownMenu.Separator className="menu-separator" />
          <DropdownMenu.Item className="menu-item menu-item-danger" onSelect={wallet.disconnect}>
            <SignOutIcon aria-hidden="true" size={18} weight="bold" />
            Disconnect
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
