export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
  providers?: Eip1193Provider[];
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isBraveWallet?: boolean;
}

export interface WalletProviderInfo {
  id: string;
  name: string;
  rdns: string;
  icon?: string;
  provider: Eip1193Provider;
  selected: false;
}

export interface WalletWindow extends EventTarget {
  ethereum?: Eip1193Provider;
  okxwallet?: Eip1193Provider & { ethereum?: Eip1193Provider };
  rabby?: Eip1193Provider;
  coinbaseWalletExtension?: Eip1193Provider;
  braveEthereum?: Eip1193Provider;
}

export interface Eip6963Announcement {
  info: {
    uuid: string;
    name: string;
    rdns: string;
    icon?: string;
  };
  provider: Eip1193Provider;
}
