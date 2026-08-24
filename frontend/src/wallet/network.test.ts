import { describe, expect, it, vi } from "vitest";

import { ensureStudionet } from "./network";
import type { Eip1193Provider } from "./types";

describe("ensureStudionet", () => {
  it("switches the selected provider to current Studionet", async () => {
    const request = vi.fn().mockResolvedValue(null);

    await ensureStudionet({ request } as Eip1193Provider);

    expect(request).toHaveBeenCalledWith({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xf22f" }],
    });
  });

  it("adds current Studionet only when the wallet reports unknown chain", async () => {
    const unknownChain = Object.assign(new Error("Unknown chain"), { code: 4902 });
    const request = vi
      .fn()
      .mockRejectedValueOnce(unknownChain)
      .mockResolvedValueOnce(null);

    await ensureStudionet({ request } as Eip1193Provider);

    expect(request).toHaveBeenNthCalledWith(2, {
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0xf22f",
        chainName: "GenLayer Studionet",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: ["https://studio.genlayer.com/api"],
        blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
      }],
    });
  });
});
