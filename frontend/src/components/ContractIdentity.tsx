import { ArrowSquareOutIcon } from "@phosphor-icons/react";

import { useTransactions } from "../transactions/TransactionProvider";

export function ContractIdentity() {
  const { contract } = useTransactions();
  if (!contract) {
    return <p className="contract-identity contract-identity-unavailable">Contract configuration unavailable.</p>;
  }

  const explorer = `https://explorer-studio.genlayer.com/address/${contract.contractAddress}`;
  return (
    <div className="contract-identity">
      <span>GenLayer Studionet · Chain 61999</span>
      <code>{contract.contractAddress}</code>
      <a href={explorer} target="_blank" rel="noreferrer">
        View contract in Explorer
        <ArrowSquareOutIcon aria-hidden="true" size={16} />
      </a>
    </div>
  );
}
