import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { TransactionStage, WriteRequest } from '../domain/types';
import { loadActivityHistory, type ActivityEntry, type ActivityScope, type HistoryLoader } from './activityHistory';

type HistoryState = 'idle' | 'loading' | 'ready' | 'error';
export type ActivityInactiveReason = 'wallet' | 'network' | 'configuration';
interface TransactionContextValue {
  scope: ActivityScope | null;
  activities: ActivityEntry[];
  historyState: HistoryState;
  inactiveReason: ActivityInactiveReason | null;
  refresh(): void;
  run(label: string, grantId: string, createRequest: () => Promise<WriteRequest>): Promise<TransactionStage>;
}
interface TransactionProviderProps extends PropsWithChildren {
  scope?: ActivityScope | null;
  loadHistory?: HistoryLoader;
  inactiveReason?: ActivityInactiveReason;
}
const TransactionContext = createContext<TransactionContextValue | null>(null);
const stageRank = { UNCONFIRMED: 0, SUBMITTED: 1, ACCEPTED: 2, RETRYABLE: 3, FAILED: 4, FINALIZED: 4 };

export function TransactionProvider({ scope = null, inactiveReason = 'wallet', ...props }: TransactionProviderProps) {
  const key = scope ? `${scope.network}:${scope.contractAddress}:${scope.account}`.toLowerCase() : 'disconnected';
  // A new scope gets new state, request handles and callback lifetime.
  return <ScopedTransactionProvider key={key} scope={scope} inactiveReason={inactiveReason} {...props} />;
}

function ScopedTransactionProvider({ children, scope = null, loadHistory = loadActivityHistory, inactiveReason = 'wallet' }: TransactionProviderProps) {
  const [session, setSession] = useState<ActivityEntry[]>([]);
  const [history, setHistory] = useState<ActivityEntry[]>([]);
  const [historyState, setHistoryState] = useState<HistoryState>(scope ? 'loading' : 'idle');
  const alive = useRef(true);
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(() => {
    if (!scope || !alive.current) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setHistoryState('loading');
    void loadHistory(scope, controller.signal).then(entries => {
      if (!alive.current || controller.signal.aborted) return;
      setHistory(entries);
      setHistoryState('ready');
    }).catch(() => {
      if (alive.current && !controller.signal.aborted) setHistoryState('error');
    });
  }, [scope, loadHistory]);
  useEffect(() => {
    alive.current = true;
    refresh();
    return () => { alive.current = false; pending.current?.abort(); };
  }, [refresh]);

  const run = useCallback<TransactionContextValue['run']>(async (label, grantId, createRequest) => {
    if (!scope || !alive.current) throw new Error('Connect a Studionet wallet before submitting');
    const request = await createRequest();
    if (!alive.current) return 'FAILED';
    const hash = request.hash.toLowerCase();
    const submitted: ActivityEntry = { hash, label, grantId, createdAt: new Date().toISOString(), stage: 'SUBMITTED' };
    setSession(current => [submitted, ...current.filter(entry => entry.hash !== hash)]);
    const update = (stage: ActivityEntry['stage']) => {
      if (alive.current) setSession(current => current.map(entry => entry.hash === hash ? { ...entry, stage } : entry));
    };
    try {
      const stage = await request.wait(update);
      update(stage);
      refresh();
      return stage;
    } catch {
      update('UNCONFIRMED');
      refresh();
      // The caller cannot proceed, but a wait failure does not prove a chain failure.
      return 'FAILED';
    }
  }, [scope, refresh]);

  const activities = useMemo(() => {
    const merged = new Map(session.map(entry => [entry.hash, entry]));
    for (const entry of history) {
      const live = merged.get(entry.hash);
      const finalReceipt = entry.stage === 'FINALIZED' || entry.stage === 'FAILED';
      merged.set(entry.hash, live && !finalReceipt && stageRank[live.stage] > stageRank[entry.stage]
        ? { ...entry, stage: live.stage } : entry);
    }
    return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.hash.localeCompare(b.hash));
  }, [history, session]);
  const value = useMemo(() => ({ scope, activities, historyState, inactiveReason: scope ? null : inactiveReason, refresh, run }), [scope, activities, historyState, inactiveReason, refresh, run]);
  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
}

export function useTransactions(): TransactionContextValue {
  const value = useContext(TransactionContext);
  if (!value) throw new Error('useTransactions must be used inside TransactionProvider');
  return value;
}
