import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { App } from "../App";
import { ContractAdapterProvider } from "../adapters/ContractAdapterProvider";
import type { GrantLatticeAdapter } from "../adapters/contract";
import { TransactionProvider } from "../transactions/TransactionProvider";

export function renderApp(route: string, adapter: GrantLatticeAdapter) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ContractAdapterProvider adapter={adapter}>
        <TransactionProvider>
          <App />
        </TransactionProvider>
      </ContractAdapterProvider>
    </MemoryRouter>,
  );
}
