import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ActivityEntry, ActivityScope } from '../transactions/activityHistory';
const scope: ActivityScope = { account: `0x${'a'.repeat(40)}`, contractAddress: `0x${'b'.repeat(40)}`, network: 'studionet' };
const emptyHistory = async () => [];
const entry: ActivityEntry = { hash: `0x${'1'.repeat(64)}`, grantId: 'restored-root', label: 'Create root grant', createdAt: '2026-08-30T22:05:30.000Z', stage: 'FINALIZED' };

import { ActivityPage } from "./ActivityPage";
import {
  TransactionProvider,
  useTransactions,
} from "../transactions/TransactionProvider";

function ActivityHarness() {
  const { run } = useTransactions();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void run("Create root grant", "root-1", async () => ({
            hash: entry.hash,
            async wait() { return "FINALIZED"; },
          }));
        }}
      >
        Record finalized activity
      </button>
      <ActivityPage />
    </>
  );
}

describe("ActivityPage", () => {
  it("shows the real transaction stage kept by the session provider", async () => {
    const user = userEvent.setup();
    render(
      <TransactionProvider scope={scope} loadHistory={emptyHistory}>
        <ActivityHarness />
      </TransactionProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Record finalized activity" }));

    expect(await screen.findByText("Create root grant")).toBeInTheDocument();
    expect(screen.getByText("Finalized on Studionet")).toBeInTheDocument();
    expect(screen.getByText(entry.hash)).toBeInTheDocument();
  });

  it('asks to connect and does not display session or network history while disconnected', () => {
    render(<TransactionProvider scope={null}><ActivityPage /></TransactionProvider>);
    expect(screen.getByRole('heading', { name: 'Connect wallet to view activity' })).toBeInTheDocument();
  });
  it('shows a network notice for the wrong network', () => {
    render(<TransactionProvider scope={null} inactiveReason="network"><ActivityPage /></TransactionProvider>);
    expect(screen.getByRole('heading', { name: 'Switch to Studionet to view activity' })).toBeInTheDocument();
  });
  it('does not call missing configuration an empty history', () => {
    render(<TransactionProvider scope={null} inactiveReason="configuration"><ActivityPage /></TransactionProvider>);
    expect(screen.getByRole('heading', { name: 'Activity is not configured' })).toBeInTheDocument();
  });
  it('shows loading before a genuine empty result', async () => {
    let resolve!: (entries: ActivityEntry[]) => void;
    const loader = () => new Promise<ActivityEntry[]>(done => { resolve = done; });
    render(<TransactionProvider scope={scope} loadHistory={loader}><ActivityPage /></TransactionProvider>);
    expect(screen.getByText('Loading wallet activity…')).toBeInTheDocument();
    expect(screen.queryByText('No transactions for this wallet yet')).not.toBeInTheDocument();
    resolve([]);
    expect(await screen.findByRole('heading', { name: 'No transactions for this wallet yet' })).toBeInTheDocument();
  });
  it('shows unavailable with retry rather than a false empty history', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([entry]);
    render(<TransactionProvider scope={scope} loadHistory={loader}><ActivityPage /></TransactionProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Activity history unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Grant restored-root')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View transaction' })).toHaveAttribute('href', `https://explorer-studio.genlayer.com/tx/${entry.hash}`);
    expect(screen.getByText(entry.hash)).toHaveClass('activity-hash');
    expect(document.querySelector('time')).toHaveAttribute('datetime', entry.createdAt);
  });
  it('paginates all retrieved entries without losing older history', async () => {
    const entries = Array.from({ length: 21 }, (_, i) => ({ ...entry, hash: `0x${i.toString(16).padStart(64, '0')}`, grantId: `grant-${i}`, createdAt: new Date(Date.UTC(2026, 7, 30, i)).toISOString() }));
    const loader = async () => entries;
    render(<TransactionProvider scope={scope} loadHistory={loader}><ActivityPage /></TransactionProvider>);
    await screen.findByText('Grant grant-20');
    expect(screen.queryByText('Grant grant-0')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Grant grant-0')).toBeInTheDocument();
    expect(screen.queryByText('Grant grant-20')).not.toBeInTheDocument();
  });
  it('reloads history when Activity is re-entered', async () => {
    const loader = vi.fn(async () => [entry]);
    const view = render(<TransactionProvider scope={scope} loadHistory={loader}><ActivityPage /></TransactionProvider>);
    await screen.findByText('Grant restored-root');
    view.rerender(<TransactionProvider scope={scope} loadHistory={loader}><p>Other page</p></TransactionProvider>);
    const previousCalls = loader.mock.calls.length;
    view.rerender(<TransactionProvider scope={scope} loadHistory={loader}><ActivityPage /></TransactionProvider>);
    await waitFor(() => expect(loader.mock.calls.length).toBeGreaterThan(previousCalls));
  });
});
