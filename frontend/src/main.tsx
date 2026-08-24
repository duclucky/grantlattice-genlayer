import "@fontsource-variable/outfit";
import "@fontsource-variable/work-sans";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { ContractAdapterProvider } from "./adapters/ContractAdapterProvider";
import { unconfiguredContract } from "./adapters/unconfiguredContract";
import "./styles/global.css";
import { TransactionProvider } from "./transactions/TransactionProvider";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("GrantLattice root element is missing");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ContractAdapterProvider adapter={unconfiguredContract}>
        <TransactionProvider>
          <App />
        </TransactionProvider>
      </ContractAdapterProvider>
    </BrowserRouter>
  </StrictMode>,
);
