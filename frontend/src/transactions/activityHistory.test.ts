import { describe, expect, it, vi } from 'vitest';
import { loadActivityHistory, type ActivityScope } from './activityHistory';
const scope: ActivityScope = { account: `0x${'a'.repeat(40)}`, contractAddress: `0x${'b'.repeat(40)}`, network: 'studionet' };
const entry = { hash: `0x${'1'.repeat(64)}`, label: 'Create root grant', grantId: 'root-1', createdAt: '2026-08-30T22:05:30.000Z', stage: 'FINALIZED' };
async function load(body: unknown, ok = true) {
  const fetchImpl = vi.fn(async () => ({ ok, json: async () => body }));
  const signal = new AbortController().signal;
  const entries = await loadActivityHistory(scope, signal, fetchImpl as unknown as typeof fetch);
  return { entries, fetchImpl, signal };
}
describe('activity history client', () => {
  it('loads real history through a cancellable same-origin request', async () => {
    const { entries, fetchImpl, signal } = await load({ scope, activities: [entry] });
    expect(entries).toEqual([entry]);
    expect(fetchImpl).toHaveBeenCalledWith('/api/activity', expect.objectContaining({ method: 'POST', signal, cache: 'no-store', body: JSON.stringify({ account: scope.account }) }));
  });
  it.each([
    { ...scope, account: `0x${'c'.repeat(40)}` },
    { ...scope, contractAddress: `0x${'c'.repeat(40)}` },
    { ...scope, network: 'other' },
  ])('rejects another scope', async wrongScope => {
    await expect(load({ scope: wrongScope, activities: [entry] })).rejects.toThrow();
  });
  it.each([
    { ...entry, stage: 'FAKE_SUCCESS' }, { ...entry, hash: 'javascript:bad' },
    { ...entry, createdAt: 'bad' }, { ...entry, grantId: '' },
    { ...entry, label: 'unexpected' }, null,
  ])('rejects malformed entries', async badEntry => {
    await expect(load({ scope, activities: [badEntry] })).rejects.toThrow();
  });
  it('rejects invalid history shape and unsuccessful HTTP', async () => {
    await expect(load({ scope, activities: {} })).rejects.toThrow();
    await expect(load({ scope, activities: [] }, false)).rejects.toThrow();
  });
  it('copies only safe fields into frontend state', async () => {
    const { entries } = await load({ scope, activities: [{ ...entry, rawReceipt: 'PRIVATE_SENTINEL' }] });
    expect(entries).toEqual([entry]);
  });
});
