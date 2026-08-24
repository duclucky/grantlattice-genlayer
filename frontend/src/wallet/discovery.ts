import type {
  Eip1193Provider,
  Eip6963Announcement,
  WalletProviderInfo,
  WalletWindow,
} from "./types";

interface Fallback {
  id: string;
  name: string;
  rdns: string;
  provider?: Eip1193Provider;
}

function identity(provider: Eip1193Provider, index: number): Omit<Fallback, "provider"> {
  if (provider.isRabby) return { id: `rabby-${index}`, name: "Rabby", rdns: "io.rabby" };
  if (provider.isCoinbaseWallet) return { id: `coinbase-${index}`, name: "Coinbase Wallet", rdns: "com.coinbase.wallet" };
  if (provider.isBraveWallet) return { id: `brave-${index}`, name: "Brave Wallet", rdns: "com.brave.wallet" };
  if (provider.isMetaMask) return { id: `metamask-${index}`, name: "MetaMask", rdns: "io.metamask" };
  return { id: `browser-${index}`, name: "Browser wallet", rdns: `injected.browser.${index}` };
}

export async function discoverProviders(
  target: WalletWindow = window as unknown as WalletWindow,
): Promise<WalletProviderInfo[]> {
  const discovered: WalletProviderInfo[] = [];
  const seenProviders = new Set<Eip1193Provider>();
  const seenRdns = new Set<string>();

  const add = (item: Fallback & { icon?: string }) => {
    if (!item.provider || seenProviders.has(item.provider) || seenRdns.has(item.rdns)) return;
    seenProviders.add(item.provider);
    seenRdns.add(item.rdns);
    discovered.push({ ...item, provider: item.provider, selected: false });
  };

  const announce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963Announcement>).detail;
    if (!detail?.info || !detail.provider) return;
    add({
      id: detail.info.uuid,
      name: detail.info.name,
      rdns: detail.info.rdns,
      icon: detail.info.icon,
      provider: detail.provider,
    });
  };

  target.addEventListener("eip6963:announceProvider", announce);
  target.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  target.removeEventListener("eip6963:announceProvider", announce);

  const okx = target.okxwallet?.ethereum ?? target.okxwallet;
  add({ id: "okx-injected", name: "OKX Wallet", rdns: "com.okex.wallet", provider: okx });
  add({ id: "rabby-injected", name: "Rabby", rdns: "io.rabby", provider: target.rabby });
  add({ id: "coinbase-injected", name: "Coinbase Wallet", rdns: "com.coinbase.wallet", provider: target.coinbaseWalletExtension });
  add({ id: "brave-injected", name: "Brave Wallet", rdns: "com.brave.wallet", provider: target.braveEthereum });

  const injected = target.ethereum?.providers ?? (target.ethereum ? [target.ethereum] : []);
  injected.forEach((provider, index) => add({ ...identity(provider, index), provider }));

  return discovered;
}
