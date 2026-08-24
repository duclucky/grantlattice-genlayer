import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";

import { useWallet } from "../wallet/WalletProvider";
import type { GrantLatticeAdapter } from "./contract";
import {
  createBrowserGenLayerAdapter,
  type GenLayerAdapterConfig,
} from "./genlayerContract";
import { unconfiguredContract } from "./unconfiguredContract";

const ContractAdapterContext =
  createContext<GrantLatticeAdapter>(unconfiguredContract);

interface ContractAdapterProviderProps extends PropsWithChildren {
  adapter: GrantLatticeAdapter;
}

export function ContractAdapterProvider({
  adapter,
  children,
}: ContractAdapterProviderProps) {
  return (
    <ContractAdapterContext.Provider value={adapter}>
      {children}
    </ContractAdapterContext.Provider>
  );
}

export function useContractAdapter(): GrantLatticeAdapter {
  return useContext(ContractAdapterContext);
}

export function readGenLayerAdapterConfig(
  environment: Record<string, string | boolean | undefined>,
): GenLayerAdapterConfig | null {
  const contractAddress = environment.VITE_GENLAYER_CONTRACT_ADDRESS;
  const icRpcPath = environment.VITE_GENLAYER_IC_RPC_PATH;
  const network = environment.VITE_GENLAYER_NETWORK;
  if (
    typeof contractAddress !== "string"
    || !/^0x[a-fA-F0-9]{40}$/u.test(contractAddress)
    || typeof icRpcPath !== "string"
    || !icRpcPath.startsWith("/")
    || network !== "studionet"
  ) {
    return null;
  }
  return {
    contractAddress: contractAddress as `0x${string}`,
    icRpcPath,
    network,
  };
}

export function RuntimeContractAdapterProvider({ children }: PropsWithChildren) {
  const wallet = useWallet();
  const config = useMemo(() => readGenLayerAdapterConfig(import.meta.env), []);
  const adapter = useMemo(() => {
    if (!config) return unconfiguredContract;
    return createBrowserGenLayerAdapter({
      account: wallet.account as `0x${string}` | null,
      provider: wallet.provider,
      networkState: wallet.networkState,
    }, config);
  }, [config, wallet.account, wallet.networkState, wallet.provider]);

  return (
    <ContractAdapterContext.Provider value={adapter}>
      {children}
    </ContractAdapterContext.Provider>
  );
}
