import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TransactionProvider, useTransactions } from './TransactionProvider';
import type { ActivityEntry, ActivityScope, HistoryLoader } from './activityHistory';
import type { WriteRequest } from '../domain/types';

const a: ActivityScope = { account: `0x${'a'.repeat(40)}`, contractAddress: `0x${'b'.repeat(40)}`, network: 'studionet' };
const b: ActivityScope = { ...a, account: `0x${'c'.repeat(40)}` };
const entry: ActivityEntry = { hash: `0x${'1'.repeat(64)}`, label: 'Create root grant', grantId: 'root-a', createdAt: '2026-08-30T22:05:30.000Z', stage: 'FINALIZED' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function Probe({ request }: { request?: () => Promise<WriteRequest> }) {
  const { activities, historyState, refresh, run } = useTransactions();
  return <>
    <output aria-label="History state">{historyState}</output>
    <button onClick={refresh}>Refresh</button>
    <button onClick={() => { if (request) void run('Create root grant', 'root-a', request); }}>Write</button>
    {activities.map(item => <p key={item.hash}>{item.grantId}:{item.stage}</p>)}
  </>;
}
function tree(scope: ActivityScope | null, loader: HistoryLoader, request?: () => Promise<WriteRequest>) {
  return <TransactionProvider scope={scope} loadHistory={loader}><Probe request={request} /></TransactionProvider>;
}
describe('wallet-scoped activity state', () => {
  it('restores history on mount and remount without submitting anything', async () => {
    const loader = vi.fn(async () => [entry]);
    const first = render(tree(a, loader));
    expect(await screen.findByText('root-a:FINALIZED')).toBeInTheDocument();
    first.unmount();
    render(tree(a, loader));
    expect(await screen.findByText('root-a:FINALIZED')).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });
  it('does not load or show entries without a connected scope', () => {
    const loader = vi.fn(async () => [entry]);
    render(tree(null, loader));
    expect(loader).not.toHaveBeenCalled();
    expect(screen.queryByText('root-a:FINALIZED')).not.toBeInTheDocument();
  });
  it('hides A immediately on switch and ignores a late A response', async () => {
    const late = deferred<ActivityEntry[]>();
    const loader = vi.fn().mockImplementationOnce(() => late.promise).mockResolvedValueOnce([{ ...entry, grantId: 'root-b' }]);
    const view = render(tree(a, loader));
    const signal = loader.mock.calls[0][1];
    view.rerender(tree(b, loader));
    expect(signal.aborted).toBe(true);
    expect(await screen.findByText('root-b:FINALIZED')).toBeInTheDocument();
    await act(async () => late.resolve([entry]));
    expect(screen.queryByText('root-a:FINALIZED')).not.toBeInTheDocument();
  });
  it('clears completed history on logout and reconnects from the network', async () => {
    const loader = vi.fn(async () => [entry]);
    const view = render(tree(a, loader));
    await screen.findByText('root-a:FINALIZED');
    view.rerender(tree(null, loader));
    expect(screen.queryByText('root-a:FINALIZED')).not.toBeInTheDocument();
    view.rerender(tree(a, loader));
    await screen.findByText('root-a:FINALIZED');
    expect(loader).toHaveBeenCalledTimes(2);
  });
  it('ignores the first A response after A to B to A', async () => {
    const oldA = deferred<ActivityEntry[]>();
    const loader = vi.fn().mockImplementationOnce(() => oldA.promise).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const view = render(tree(a, loader));
    view.rerender(tree(b, loader));
    view.rerender(tree(a, loader));
    await waitFor(() => expect(screen.getByLabelText('History state')).toHaveTextContent('ready'));
    await act(async () => oldA.resolve([entry]));
    expect(screen.queryByText('root-a:FINALIZED')).not.toBeInTheDocument();
  });
  it('ignores a submitted request that resolves after logout', async () => {
    const pending = deferred<WriteRequest>();
    const loader = vi.fn(async () => []);
    const view = render(tree(a, loader, () => pending.promise));
    await userEvent.click(screen.getByText('Write'));
    view.rerender(tree(null, loader));
    await act(async () => pending.resolve({ hash: entry.hash, wait: async () => 'FINALIZED' }));
    expect(screen.queryByText('root-a:FINALIZED')).not.toBeInTheDocument();
    view.rerender(tree(a, loader));
    await waitFor(() => expect(screen.getByLabelText('History state')).toHaveTextContent('ready'));
    expect(screen.queryByText('root-a:FINALIZED')).not.toBeInTheDocument();
  });
  it('separates unavailable history from successful empty history and supports retry', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    render(tree(a, loader));
    await waitFor(() => expect(screen.getByLabelText('History state')).toHaveTextContent('error'));
    await userEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(screen.getByLabelText('History state')).toHaveTextContent('ready'));
  });
  it('deduplicates session and history, preferring confirmed receipts to a wait failure', async () => {
    const loader = vi.fn(async () => [entry]);
    render(tree(a, loader, async () => ({ hash: entry.hash, wait: async () => { throw new Error('timeout'); } })));
    await screen.findByText('root-a:FINALIZED');
    await userEvent.click(screen.getByText('Write'));
    expect(screen.getAllByText('root-a:FINALIZED')).toHaveLength(1);
    expect(screen.queryByText('root-a:FAILED')).not.toBeInTheDocument();
  });
  it('does not regress newer live progress to an older pending snapshot', async () => {
    const loader = vi.fn(async () => [{ ...entry, stage: 'SUBMITTED' as const }]);
    render(tree(a, loader, async () => ({ hash: entry.hash, wait: async () => 'FINALIZED' })));
    await screen.findByText('root-a:SUBMITTED');
    await userEvent.click(screen.getByText('Write'));
    expect(await screen.findByText('root-a:FINALIZED')).toBeInTheDocument();
  });
  it('clears history when the configured contract changes', async () => {
    const loader = vi.fn().mockResolvedValueOnce([entry]).mockResolvedValueOnce([]);
    const view = render(tree(a, loader));
    await screen.findByText('root-a:FINALIZED');
    view.rerender(tree({ ...a, contractAddress: `0x${'d'.repeat(40)}` }, loader));
    expect(screen.queryByText('root-a:FINALIZED')).not.toBeInTheDocument();
  });
});
