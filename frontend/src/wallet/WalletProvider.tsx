import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { discoverProviders } from "./discovery";
import { ensureStudionet, STUDIONET } from "./network";
import type { Eip1193Provider, WalletProviderInfo } from "./types";

export type WalletNetworkState = "idle" | "switching" | "ready" | "wrong" | "error";

interface WalletContextValue {
  providers: WalletProviderInfo[];
  selectedProvider: WalletProviderInfo | null;
  provider: Eip1193Provider | null;
  account: string | null;
  connecting: boolean;
  networkState: WalletNetworkState;
  error: string | null;
  refreshProviders(): Promise<void>;
  connect(info: WalletProviderInfo): Promise<void>;
  disconnect(): void;
}

interface WalletProviderProps extends PropsWithChildren {
  discover?: typeof discoverProviders;
}

interface ListenerRecord {
  provider: Eip1193Provider;
  accountsChanged: (...args: unknown[]) => void;
  chainChanged: (...args: unknown[]) => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({
  children,
  discover = discoverProviders,
}: WalletProviderProps) {
  const [providers, setProviders] = useState<WalletProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<WalletProviderInfo | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [networkState, setNetworkState] = useState<WalletNetworkState>("idle");
  const [error, setError] = useState<string | null>(null);
  const listeners = useRef<ListenerRecord | null>(null);

  const removeListeners = useCallback(() => {
    const current = listeners.current;
    if (!current) return;
    current.provider.removeListener?.("accountsChanged", current.accountsChanged);
    current.provider.removeListener?.("chainChanged", current.chainChanged);
    listeners.current = null;
  }, []);

  const disconnect = useCallback(() => {
    removeListeners();
    setSelectedProvider(null);
    setAccount(null);
    setConnecting(false);
    setNetworkState("idle");
    setError(null);
  }, [removeListeners]);

  const refreshProviders = useCallback(async () => {
    try {
      setProviders(await discover());
      setError(null);
    } catch {
      setProviders([]);
      setError("Wallet discovery failed. No wallet was selected.");
    }
  }, [discover]);

  useEffect(() => {
    void refreshProviders();
    return removeListeners;
  }, [refreshProviders, removeListeners]);

  const connect = useCallback(async (info: WalletProviderInfo) => {
    removeListeners();
    setConnecting(true);
    setError(null);
    setAccount(null);
    setSelectedProvider(null);
    setNetworkState("switching");
    try {
      await ensureStudionet(info.provider);
      const response = await info.provider.request({ method: "eth_requestAccounts" });
      const nextAccount = Array.isArray(response) && typeof response[0] === "string"
        ? response[0]
        : null;
      if (!nextAccount) throw new Error("No account returned");

      const accountsChanged = (...args: unknown[]) => {
        const accounts = args[0];
        setAccount(Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null);
      };
      const chainChanged = (...args: unknown[]) => {
        const chainId = args[0];
        setNetworkState(
          typeof chainId === "string" && chainId.toLowerCase() === STUDIONET.chainId
            ? "ready"
            : "wrong",
        );
      };
      info.provider.on?.("accountsChanged", accountsChanged);
      info.provider.on?.("chainChanged", chainChanged);
      listeners.current = { provider: info.provider, accountsChanged, chainChanged };
      setSelectedProvider(info);
      setAccount(nextAccount);
      setNetworkState("ready");
    } catch {
      setSelectedProvider(null);
      setAccount(null);
      setNetworkState("error");
      setError("Wallet connection or Studionet setup failed.");
    } finally {
      setConnecting(false);
    }
  }, [removeListeners]);

  const value = useMemo<WalletContextValue>(() => ({
    providers,
    selectedProvider,
    provider: selectedProvider?.provider ?? null,
    account,
    connecting,
    networkState,
    error,
    refreshProviders,
    connect,
    disconnect,
  }), [
    providers,
    selectedProvider,
    account,
    connecting,
    networkState,
    error,
    refreshProviders,
    connect,
    disconnect,
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
