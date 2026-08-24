import { render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import {
  ContractAdapterProvider,
  readGenLayerAdapterConfig,
  useContractAdapter,
} from "./ContractAdapterProvider";
import { canonicalTestAdapter } from "../test/canonicalTestAdapter";

function GrantProbe() {
  const adapter = useContractAdapter();
  const [grantId, setGrantId] = useState("loading");

  useEffect(() => {
    void adapter.listGrants().then((grants) => setGrantId(grants[0].grantId));
  }, [adapter]);

  return <output>{grantId}</output>;
}

describe("ContractAdapterProvider", () => {
  it("provides canonical adapter behavior to product components", async () => {
    render(
      <ContractAdapterProvider adapter={canonicalTestAdapter}>
        <GrantProbe />
      </ContractAdapterProvider>,
    );

    expect(await screen.findByText("root-1")).toBeInTheDocument();
  });

  it("accepts only complete public Studionet configuration", () => {
    expect(readGenLayerAdapterConfig({
      VITE_GENLAYER_CONTRACT_ADDRESS: "0x9999999999999999999999999999999999999999",
      VITE_GENLAYER_IC_RPC_PATH: "/api/genlayer",
      VITE_GENLAYER_NETWORK: "studionet",
    })).toEqual({
      contractAddress: "0x9999999999999999999999999999999999999999",
      icRpcPath: "/api/genlayer",
      network: "studionet",
    });
    expect(readGenLayerAdapterConfig({
      VITE_GENLAYER_CONTRACT_ADDRESS: "missing",
      VITE_GENLAYER_IC_RPC_PATH: "https://cross-origin.invalid",
      VITE_GENLAYER_NETWORK: "studionet",
    })).toBeNull();
  });
});
