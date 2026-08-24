import {
  createContext,
  type PropsWithChildren,
  useContext,
} from "react";

import type { GrantLatticeAdapter } from "./contract";
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
