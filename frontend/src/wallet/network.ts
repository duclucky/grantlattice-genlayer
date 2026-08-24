import type { Eip1193Provider } from "./types";

export const STUDIONET = {
  chainId: "0xf22f",
  chainName: "GenLayer Studionet",
  rpcUrl: "https://studio.genlayer.com/api",
  explorerUrl: "https://explorer-studio.genlayer.com",
} as const;

export async function ensureStudionet(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET.chainId }],
    });
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== 4902) {
      throw error;
    }
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: STUDIONET.chainId,
        chainName: STUDIONET.chainName,
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: [STUDIONET.rpcUrl],
        blockExplorerUrls: [STUDIONET.explorerUrl],
      }],
    });
  }
}
