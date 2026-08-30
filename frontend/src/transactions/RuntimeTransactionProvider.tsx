import { type PropsWithChildren, useMemo } from 'react';
import { readGenLayerAdapterConfig } from '../adapters/ContractAdapterProvider';
import type { GenLayerAdapterConfig } from '../adapters/genlayerContract';
import type { Address } from '../domain/types';
import { useWallet } from '../wallet/WalletProvider';
import { TransactionProvider } from './TransactionProvider';
import type { ActivityScope, HistoryLoader } from './activityHistory';

interface Props extends PropsWithChildren {
  config?: GenLayerAdapterConfig | null;
  loadHistory?: HistoryLoader;
}
export function RuntimeTransactionProvider({ children, config, loadHistory }: Props) {
  const wallet = useWallet();
  const environmentConfig = useMemo(() => readGenLayerAdapterConfig(import.meta.env), []);
  const selected = config === undefined ? environmentConfig : config;
  const scope = useMemo<ActivityScope | null>(() => selected && wallet.account && wallet.networkState === 'ready'
    ? { account: wallet.account as Address, contractAddress: selected.contractAddress, network: selected.network }
    : null, [selected, wallet.account, wallet.networkState]);
  const inactiveReason = !selected ? 'configuration' : wallet.account && wallet.networkState !== 'ready' ? 'network' : 'wallet';
  return <TransactionProvider scope={scope} inactiveReason={inactiveReason} loadHistory={loadHistory}>{children}</TransactionProvider>;
}
