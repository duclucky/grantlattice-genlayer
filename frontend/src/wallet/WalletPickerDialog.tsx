import * as Dialog from "@radix-ui/react-dialog";
import { ArrowClockwiseIcon, WalletIcon, XIcon } from "@phosphor-icons/react";

import { useWallet } from "./WalletProvider";

interface WalletPickerDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  restoreFocus(): void;
}

export function WalletPickerDialog({ open, onOpenChange, restoreFocus }: WalletPickerDialogProps) {
  const wallet = useWallet();

  async function choose(index: number) {
    const selected = wallet.providers[index];
    if (!selected) return;
    await wallet.connect(selected);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="wallet-dialog-content"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <div className="dialog-heading">
            <div>
              <Dialog.Title>Choose a wallet</Dialog.Title>
              <Dialog.Description>
                Select one detected EVM wallet. GrantLattice never chooses for you.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" aria-label="Close wallet selection" type="button">
                <XIcon aria-hidden="true" size={20} weight="bold" />
              </button>
            </Dialog.Close>
          </div>

          {wallet.providers.length === 0 ? (
            <div className="dialog-empty">
              <WalletIcon aria-hidden="true" size={28} weight="duotone" />
              <p>No compatible browser wallet was detected.</p>
              <button className="button button-secondary" onClick={() => void wallet.refreshProviders()} type="button">
                <ArrowClockwiseIcon aria-hidden="true" size={18} weight="bold" />
                Scan again
              </button>
            </div>
          ) : (
            <div className="wallet-list" aria-label="Detected wallets">
              {wallet.providers.map((item, index) => (
                <button
                  aria-label={item.name}
                  className="wallet-option"
                  disabled={wallet.connecting}
                  key={item.id}
                  onClick={() => void choose(index)}
                  type="button"
                >
                  {item.icon ? <img alt="" src={item.icon} /> : <WalletIcon aria-hidden="true" size={24} weight="duotone" />}
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.rdns}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
          {wallet.error ? <p className="wallet-error" role="alert">{wallet.error}</p> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
