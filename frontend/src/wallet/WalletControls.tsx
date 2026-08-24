import { useRef, useState } from "react";

import { AccountMenu } from "./AccountMenu";
import { WalletPickerDialog } from "./WalletPickerDialog";
import { useWallet } from "./WalletProvider";

export function WalletControls() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wallet = useWallet();

  function handlePickerChange(open: boolean) {
    setPickerOpen(open);
    if (!open) triggerRef.current?.focus();
  }

  if (wallet.account) return <AccountMenu />;

  return (
    <>
      <button
        className="button button-secondary wallet-trigger"
        disabled={wallet.connecting}
        onClick={() => setPickerOpen(true)}
        ref={triggerRef}
        type="button"
      >
        {wallet.connecting ? "Connecting..." : "Connect wallet"}
      </button>
      <WalletPickerDialog
        open={pickerOpen}
        onOpenChange={handlePickerChange}
        restoreFocus={() => triggerRef.current?.focus()}
      />
    </>
  );
}
