import { describe, expect, it, vi } from 'vitest';
import { abi } from 'genlayer-js';

const modulePath = './activity.mjs';
const implementation = await import(/* @vite-ignore */ modulePath).catch(() => ({}));
const account = `0x${'a'.repeat(40)}`;
const contractAddress = `0x${'b'.repeat(40)}`;
const env = { VITE_CONTRACT_ADDRESS: contractAddress };
function recorder() {
  return { code: 200, headers: {}, body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; },
  };
}
const result = value => ({ ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: value }) });
async function call(request, options) {
  expect(implementation.default, 'history endpoint must be implemented').toBeTypeOf('function');
  const response = recorder();
  await implementation.default(request, response, { env, ...options });
  return response;
}
const request = { method: 'POST', body: { account } };

describe('activity API', () => {
  it('returns a safe, non-cacheable response bound to wallet and server configuration', async () => {
    const tx = {
      hash: `0x${'1'.repeat(64)}`, from_address: account, to_address: contractAddress,
      created_at: '2026-08-30T22:05:30Z', status: 'FINALIZED', execution_result: 'SUCCESS', result: 6,
      data: { calldata: Buffer.from(abi.calldata.encode(abi.calldata.makeCalldataObject('create_root_grant', ['root-1', 'PRIVATE_SENTINEL']))).toString('base64') },
      node_config: 'PRIVATE_SENTINEL',
    };
    const fetchImpl = vi.fn().mockResolvedValueOnce(result('0xf22f')).mockResolvedValueOnce(result([tx]));
    const response = await call(request, { fetchImpl });
    expect(response.code).toBe(200);
    expect(response.headers['Cache-Control']).toContain('no-store');
    expect(response.body.scope).toEqual({ account, contractAddress, network: 'studionet' });
    expect(response.body.activities[0]).toMatchObject({ grantId: 'root-1', stage: 'FINALIZED' });
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_SENTINEL');
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toMatchObject({ method: 'sim_getTransactionsForAddress', params: [contractAddress] });
    expect(fetchImpl.mock.calls[0][1].signal).toBeDefined();
  });
  it.each([
    [{ method: 'GET' }, 405], [{ method: 'POST', body: {} }, 400],
    [{ method: 'POST', body: { account: 'bad' } }, 400],
    [{ method: 'POST', body: { account, contractAddress } }, 400],
  ])('rejects invalid requests before any RPC read', async (input, status) => {
    const fetchImpl = vi.fn();
    const response = await call(input, { fetchImpl });
    expect(response.code).toBe(status);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it.each([{}, { VITE_CONTRACT_ADDRESS: 'bad' }, { ...env, VITE_GENLAYER_NETWORK: 'other' }])('rejects missing or wrong server configuration', async badEnv => {
    const fetchImpl = vi.fn();
    expect((await call(request, { fetchImpl, env: badEnv })).code).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it.each([
    { ok: false }, { ok: true, json: async () => ({ error: { message: 'PRIVATE_SENTINEL' } }) },
    result('0x1'), { ok: true, json: async () => { throw new Error('PRIVATE_SENTINEL'); } },
  ])('returns a generic unavailable result for chain/upstream failures', async reply => {
    const response = await call(request, { fetchImpl: vi.fn(async () => reply) });
    expect(response.code).toBe(502);
    expect(response.body).toEqual({ error: 'Activity history unavailable. Try again.' });
  });
  it('does not turn malformed transaction history into empty success', async () => {
    const response = await call(request, { fetchImpl: vi.fn().mockResolvedValueOnce(result('0xf22f')).mockResolvedValueOnce(result({})) });
    expect(response.code).toBe(502);
  });
  it('returns a successful empty array only for a valid empty response', async () => {
    const response = await call(request, { fetchImpl: vi.fn().mockResolvedValueOnce(result('0xf22f')).mockResolvedValueOnce(result([])) });
    expect(response.code).toBe(200);
    expect(response.body.activities).toEqual([]);
  });
  it('aborts a stalled upstream request', async () => {
    const fetchImpl = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    expect((await call(request, { fetchImpl, timeoutMs: 5 })).code).toBe(502);
  });
  it('resolves incomplete history consensus using a matching transaction receipt', async () => {
    const tx = { hash: `0x${'1'.repeat(64)}`, from_address: account, to_address: contractAddress,
      created_at: '2026-08-30T22:05:30Z', status: 'FINALIZED', execution_result: 'SUCCESS', result: '',
      data: { calldata: Buffer.from(abi.calldata.encode(abi.calldata.makeCalldataObject('create_root_grant', ['root-1']))).toString('base64') } };
    const fetchImpl = vi.fn().mockResolvedValueOnce(result('0xf22f')).mockResolvedValueOnce(result([tx]))
      .mockResolvedValueOnce(result({ ...tx, result: 6 }));
    const response = await call(request, { fetchImpl });
    expect(response.body.activities[0].stage).toBe('FINALIZED');
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toMatchObject({ method: 'eth_getTransactionByHash', params: [tx.hash] });
  });
  it('keeps an unknown result unconfirmed if receipt lookup fails or targets another hash', async () => {
    const tx = { hash: `0x${'1'.repeat(64)}`, from_address: account, to_address: contractAddress,
      created_at: '2026-08-30T22:05:30Z', status: 'FINALIZED', execution_result: 'SUCCESS', result: '',
      data: { calldata: Buffer.from(abi.calldata.encode(abi.calldata.makeCalldataObject('create_root_grant', ['root-1']))).toString('base64') } };
    for (const receipt of [null, { ...tx, hash: `0x${'2'.repeat(64)}`, result: 6 }]) {
      const fetchImpl = vi.fn().mockResolvedValueOnce(result('0xf22f')).mockResolvedValueOnce(result([tx])).mockResolvedValueOnce(result(receipt));
      expect((await call(request, { fetchImpl })).body.activities[0].stage).toBe('UNCONFIRMED');
    }
  });
});
