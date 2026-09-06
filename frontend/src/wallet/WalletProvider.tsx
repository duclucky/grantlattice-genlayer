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

const SELECTED_PROVIDER_KEY = "grantlattice.wallet.provider.rdns";

function readSelectedProviderRdns(): string | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage.getItem(SELECTED_PROVIDER_KEY);
  } catch {
    return null;
  }
}

function writeSelectedProviderRdns(rdns: string): void {
  try {
    if (typeof window !== "undefined") window.sessionStorage.setItem(SELECTED_PROVIDER_KEY, rdns);
  } catch {
    // An unavailable session store must not block a valid wallet connection.
  }
}

function clearSelectedProviderRdns(): void {
  try {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(SELECTED_PROVIDER_KEY);
  } catch {
    // Logout still clears in-memory state when storage is unavailable.
  }
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
    clearSelectedProviderRdns();
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

  const setConnectedProvider = useCallback((info: WalletProviderInfo, nextAccount: string, chainId: string) => {
    removeListeners();
    const accountsChanged = (...args: unknown[]) => {
      const accounts = args[0];
      setAccount(Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null);
    };
    const chainChanged = (...args: unknown[]) => {
      const nextChainId = args[0];
      setNetworkState(
        typeof nextChainId === "string" && nextChainId.toLowerCase() === STUDIONET.chainId
          ? "ready"
          : "wrong",
      );
    };
    info.provider.on?.("accountsChanged", accountsChanged);
    info.provider.on?.("chainChanged", chainChanged);
    listeners.current = { provider: info.provider, accountsChanged, chainChanged };
    setSelectedProvider(info);
    setAccount(nextAccount);
    setNetworkState(chainId.toLowerCase() === STUDIONET.chainId ? "ready" : "wrong");
  }, [removeListeners]);

  useEffect(() => {
    let alive = true;

    async function initialize() {
      let nextProviders: WalletProviderInfo[];
      try {
        nextProviders = await discover();
      } catch {
        if (alive) {
          setProviders([]);
          setError("Wallet discovery failed. No wallet was selected.");
        }
        return;
      }
      if (!alive) return;
      setProviders(nextProviders);

      const rdns = readSelectedProviderRdns();
      if (!rdns) return;
      const selected = nextProviders.find((item) => item.rdns === rdns);
      if (!selected) return;

      try {
        const accounts = await selected.provider.request({ method: "eth_accounts" });
        const nextAccount = Array.isArray(accounts) && typeof accounts[0] === "string"
          ? accounts[0]
          : null;
        if (!nextAccount || !alive) return;

        const chainId = await selected.provider.request({ method: "eth_chainId" });
        if (typeof chainId !== "string" || !alive) return;

        setConnectedProvider(selected, nextAccount, chainId);
      } catch {
        // Silent restoration is best effort and must never create a ready state.
      }
    }

    void initialize();
    return () => {
      alive = false;
      removeListeners();
    };
  }, [discover, removeListeners, setConnectedProvider]);

  const connect = useCallback(async (info: WalletProviderInfo) => {
    clearSelectedProviderRdns();
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

      const chainId = await info.provider.request({ method: "eth_chainId" });
      if (typeof chainId !== "string") throw new Error("No chain returned");
      setConnectedProvider(info, nextAccount, chainId);
      writeSelectedProviderRdns(info.rdns);
    } catch {
      setSelectedProvider(null);
      setAccount(null);
      setNetworkState("error");
      setError("Wallet connection or Studionet setup failed.");
    } finally {
      setConnecting(false);
    }
  }, [removeListeners, setConnectedProvider]);

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
