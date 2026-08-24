import "@fontsource-variable/outfit";
import "@fontsource-variable/work-sans";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("GrantLattice root element is missing");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
