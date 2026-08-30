import type { Address, TransactionStage } from '../domain/types';

export interface ActivityScope {
  account: Address;
  contractAddress: Address;
  network: 'studionet';
}
export interface ActivityEntry {
  hash: string;
  label: string;
  grantId: string;
  createdAt: string;
  stage: TransactionStage | 'UNCONFIRMED';
}
export type HistoryLoader = (scope: ActivityScope, signal: AbortSignal) => Promise<ActivityEntry[]>;

const STAGES = new Set(['SUBMITTED', 'ACCEPTED', 'FINALIZED', 'FAILED', 'RETRYABLE', 'UNCONFIRMED']);
const LABELS = new Set(['Create root grant', 'Propose child grant', 'Review child grant', 'Revoke grant']);
const ADDRESS = /^0x[a-fA-F0-9]{40}$/u;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid activity response');
  return value as Record<string, unknown>;
}

export async function loadActivityHistory(scope: ActivityScope, signal: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<ActivityEntry[]> {
  if (!ADDRESS.test(scope.account) || !ADDRESS.test(scope.contractAddress) || scope.network !== 'studionet') throw new Error('Invalid activity scope');
  const response = await fetchImpl('/api/activity', {
    method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store', signal,
    body: JSON.stringify({ account: scope.account }),
  });
  if (!response.ok) throw new Error('Activity history unavailable');
  const body = object(await response.json());
  const returnedScope = object(body.scope);
  if (typeof returnedScope.account !== 'string' || returnedScope.account.toLowerCase() !== scope.account.toLowerCase()
    || typeof returnedScope.contractAddress !== 'string' || returnedScope.contractAddress.toLowerCase() !== scope.contractAddress.toLowerCase()
    || returnedScope.network !== scope.network || !Array.isArray(body.activities)) throw new Error('Activity scope mismatch');
  return body.activities.map(value => {
    const entry = object(value);
    if (typeof entry.hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/u.test(entry.hash)
      || typeof entry.grantId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(entry.grantId)
      || typeof entry.label !== 'string' || !LABELS.has(entry.label)
      || typeof entry.stage !== 'string' || !STAGES.has(entry.stage)
      || typeof entry.createdAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/u.test(entry.createdAt)
      || !Number.isFinite(Date.parse(entry.createdAt))) throw new Error('Invalid activity entry');
    return { hash: entry.hash.toLowerCase(), label: entry.label, grantId: entry.grantId,
      createdAt: new Date(entry.createdAt).toISOString(), stage: entry.stage as ActivityEntry['stage'] };
  });
}
