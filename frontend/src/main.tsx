import "@fontsource-variable/outfit";
import "@fontsource-variable/work-sans";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { RuntimeContractAdapterProvider } from "./adapters/ContractAdapterProvider";
import "./styles/global.css";
import { TransactionProvider } from "./transactions/TransactionProvider";
import { WalletProvider } from "./wallet/WalletProvider";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("GrantLattice root element is missing");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <RuntimeContractAdapterProvider>
          <TransactionProvider>
            <App />
          </TransactionProvider>
        </RuntimeContractAdapterProvider>
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>,
);
