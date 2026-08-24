import { render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import {
  ContractAdapterProvider,
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
});
