import { describe, expect, it } from 'vitest';
import { abi } from 'genlayer-js';

const modulePath = './activity-history.mjs';
const implementation = await import(/* @vite-ignore */ modulePath).catch(() => ({}));
const scope = { account: `0x${'a'.repeat(40)}`, contractAddress: `0x${'b'.repeat(40)}`, network: 'studionet' };
function transaction(overrides = {}, method = 'create_root_grant', args = ['root-1']) {
  return {
    hash: `0x${'1'.repeat(64)}`, from_address: scope.account, to_address: scope.contractAddress,
    created_at: '2026-08-30T22:05:30+00:00', status: 'FINALIZED', result: 6,
    data: { calldata: Buffer.from(abi.calldata.encode(abi.calldata.makeCalldataObject(method, args))).toString('base64') },
    consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS', node_config: 'PRIVATE_SENTINEL' }] },
    ...overrides,
  };
}
function project(records) {
  expect(implementation.projectHistory, 'history projection must be implemented').toBeTypeOf('function');
  return implementation.projectHistory(records, scope);
}

describe('safe wallet activity projection', () => {
  it('returns only the allowed fields for a finalized root creation', () => {
    expect(project([transaction()])).toEqual([{
      hash: `0x${'1'.repeat(64)}`, label: 'Create root grant', grantId: 'root-1',
      createdAt: '2026-08-30T22:05:30.000Z', stage: 'FINALIZED',
    }]);
  });
  it('excludes another wallet, contract and explicitly different chain', () => {
    expect(project([
      transaction({ from_address: `0x${'c'.repeat(40)}` }),
      transaction({ to_address: `0x${'c'.repeat(40)}` }),
      transaction({ chainId: 1 }),
    ])).toEqual([]);
  });
  it.each([
    ['propose_child_grant', ['parent', 'child'], 'Propose child grant', 'child'],
    ['review_child_grant', ['child'], 'Review child grant', 'child'],
    ['revoke_grant', ['root-1'], 'Revoke grant', 'root-1'],
  ])('maps %s to its own grant ID', (method, args, label, grantId) => {
    expect(project([transaction({}, method, args)])[0]).toMatchObject({ label, grantId });
  });
  it('ignores deployment/unknown methods instead of inventing a grant event', () => {
    expect(project([transaction({}, '__init__', []), transaction({}, 'unrelated', [])])).toEqual([]);
  });
  it('supports normalized receipt fields and calldata wrappers', () => {
    const tx = transaction();
    delete tx.consensus_data;
    tx.data.calldata = { base64: tx.data.calldata, readable: 'PRIVATE_SENTINEL' };
    expect(project([{ ...tx, status: 7, txExecutionResultName: 'SUCCESS', resultName: 'MAJORITY_AGREE' }])[0].stage).toBe('FINALIZED');
  });
  it.each([
    [{ status: 'ACCEPTED' }, 'ACCEPTED'],
    [{ status: 'PENDING' }, 'SUBMITTED'],
    [{ status: 'UNKNOWN' }, 'UNCONFIRMED'],
    [{ consensus_data: {} }, 'UNCONFIRMED'],
    [{ execution_result: 'ERROR' }, 'FAILED'],
    [{ execution_result: 'SUCCESS', result: 0 }, 'UNCONFIRMED'],
  ])('does not invent finality for %j', (overrides, expected) => {
    expect(project([transaction(overrides)])[0].stage).toBe(expected);
  });
  it.each([
    { hash: 'bad' }, { created_at: 'bad' }, { data: { calldata: 'bad!' } },
    { from_address: null },
  ])('rejects malformed records instead of reporting an empty history: %j', overrides => {
    expect(() => project([transaction(overrides)])).toThrow();
  });
  it('rejects a malformed list', () => { expect(() => project({})).toThrow(); });
  it('deduplicates identical records and sorts newest first', () => {
    const old = transaction();
    const recent = transaction({ hash: `0x${'2'.repeat(64)}`, created_at: '2026-08-31T00:00:00Z' });
    expect(project([old, old, recent]).map(x => x.hash)).toEqual([recent.hash, old.hash]);
  });
  it('rejects conflicting duplicate hashes', () => {
    expect(() => project([transaction(), transaction({}, 'revoke_grant', ['other'])])).toThrow();
  });
});
