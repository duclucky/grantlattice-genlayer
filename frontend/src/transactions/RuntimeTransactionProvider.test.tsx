import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WalletProvider, useWallet } from '../wallet/WalletProvider';
import type { WalletProviderInfo } from '../wallet/types';
import { useTransactions } from './TransactionProvider';
import { RuntimeTransactionProvider as Runtime } from './RuntimeTransactionProvider';
import type { ActivityEntry, ActivityScope } from './activityHistory';
const account = `0x${'a'.repeat(40)}`;
const contractAddress = `0x${'b'.repeat(40)}` as const;
describe('runtime activity wallet binding', () => {
  it('loads only after connecting, and clears on chain change and logout', async () => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const request = vi.fn(async ({ method }: { method: string }) => method === 'eth_requestAccounts' ? [account] : null);
    const info: WalletProviderInfo = { id: 'test', name: 'Test', rdns: 'test.wallet', selected: false,
      provider: { request, on: (name, fn) => { listeners.set(name, fn); }, removeListener: name => { listeners.delete(name); } } };
    function Probe() {
      const wallet = useWallet(); const tx = useTransactions();
      return <><button onClick={() => { void wallet.connect(info); }}>Connect</button><button onClick={wallet.disconnect}>Logout</button>
        <output>{tx.scope?.account ?? 'hidden'}</output>{tx.activities.map(x => <p key={x.hash}>{x.grantId}</p>)}</>;
    }
    const loader = vi.fn(async (_scope: ActivityScope): Promise<ActivityEntry[]> => [{ hash: `0x${'1'.repeat(64)}`, grantId: 'restored-root', label: 'Create root grant', createdAt: '2026-08-30T22:05:30.000Z', stage: 'FINALIZED' }]);
    render(<WalletProvider discover={async () => [info]}><Runtime config={{ contractAddress, network: 'studionet', icRpcPath: '/api/genlayer' }} loadHistory={loader}><Probe /></Runtime></WalletProvider>);
    expect(loader).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText('Connect'));
    await screen.findByText('restored-root');
    expect(loader.mock.calls[0][0]).toMatchObject({ account, contractAddress, network: 'studionet' });
    act(() => listeners.get('chainChanged')?.('0x1'));
    expect(screen.queryByText('restored-root')).not.toBeInTheDocument();
    act(() => listeners.get('chainChanged')?.('0xf22f'));
    await screen.findByText('restored-root');
    act(() => listeners.get('accountsChanged')?.([`0x${'c'.repeat(40)}`]));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(3));
    await userEvent.click(screen.getByText('Logout'));
    expect(screen.queryByText('restored-root')).not.toBeInTheDocument();
    expect(request.mock.calls.some(([x]) => x.method === 'eth_sendTransaction')).toBe(false);
  });
});
