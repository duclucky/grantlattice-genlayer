import { describe, expect, it } from "vitest";

import { discoverProviders } from "./discovery";
import type { Eip1193Provider, WalletWindow } from "./types";

function provider(): Eip1193Provider {
  return { async request() { return []; } };
}

function eip6963Window() {
  const target = new EventTarget() as WalletWindow;
  const metamask = provider();
  const rabby = provider();
  target.ethereum = metamask;
  target.rabby = rabby;
  target.addEventListener("eip6963:requestProvider", () => {
    target.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
      detail: {
        info: { uuid: "metamask-1", name: "MetaMask", rdns: "io.metamask" },
        provider: metamask,
      },
    }));
    target.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
      detail: {
        info: { uuid: "rabby-1", name: "Rabby", rdns: "io.rabby" },
        provider: rabby,
      },
    }));
  });
  return target;
}

describe("discoverProviders", () => {
  it("deduplicates EIP-6963 and injected fallbacks without auto-selecting", async () => {
    const providers = await discoverProviders(eip6963Window());

    expect(providers.map((item) => item.rdns)).toEqual([
      "io.metamask",
      "io.rabby",
    ]);
    expect(providers.every((item) => item.selected === false)).toBe(true);
  });

  it("includes a compatible window.ethereum fallback", async () => {
    const target = new EventTarget() as WalletWindow;
    target.ethereum = provider();

    const providers = await discoverProviders(target);

    expect(providers).toHaveLength(1);
    expect(providers[0]?.name).toBe("Browser wallet");
  });
});
