import { abi } from 'genlayer-js';

export const ADDRESS = /^0x[a-fA-F0-9]{40}$/u;
const HASH = /^0x[a-fA-F0-9]{64}$/u;
const OPERATIONS = new Map([
  ['create_root_grant', ['Create root grant', 0]],
  ['propose_child_grant', ['Propose child grant', 1]],
  ['review_child_grant', ['Review child grant', 0]],
  ['revoke_grant', ['Revoke grant', 0]],
]);

function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid history record');
  return value;
}

function transactionStage(tx) {
  const status = tx.statusName ?? tx.status_name ?? tx.status;
  if (status === 'ACCEPTED' || status === 5) return 'ACCEPTED';
  if (['PENDING', 'ACTIVATED', 'PROPOSING', 'COMMITTING', 'REVEALING', 0, 1, 2, 3, 4].includes(status)) return 'SUBMITTED';
  if (status !== 'FINALIZED' && status !== 7) return 'UNCONFIRMED';
  const leader = tx.consensus_data?.leader_receipt?.[0];
  const rawExecution = tx.txExecutionResultName ?? tx.executionResultName ?? tx.execution_result ?? leader?.execution_result;
  const execution = typeof rawExecution === 'object' && rawExecution !== null
    ? rawExecution.result ?? rawExecution.name ?? rawExecution.status : rawExecution;
  const consensus = tx.resultName ?? tx.result_name ?? tx.result;
  if (['ERROR', 'REVERTED', 'FAILED', 'FINISHED_WITH_ERROR'].includes(execution)) return 'FAILED';
  if (execution === 'FINISHED_WITH_RETURN' || (execution === 'SUCCESS' && ['MAJORITY_AGREE', 6].includes(consensus))) return 'FINALIZED';
  return 'UNCONFIRMED';
}

function projectTransaction(value, scope) {
  const tx = object(value);
  const sender = tx.from_address ?? tx.fromAddress ?? tx.from;
  const recipient = tx.to_address ?? tx.toAddress ?? tx.to;
  if (!ADDRESS.test(sender) || !ADDRESS.test(recipient)) throw new Error('Invalid history binding');
  if (sender.toLowerCase() !== scope.account.toLowerCase() || recipient.toLowerCase() !== scope.contractAddress.toLowerCase()) return null;
  if (tx.chainId != null && Number(tx.chainId) !== 61999) return null;
  // A deployment is not a user grant operation.
  if (tx.data?.code || tx.data?.contract_code) return null;
  const calldata = typeof tx.data?.calldata === 'string' ? tx.data.calldata : tx.data?.calldata?.base64;
  if (typeof calldata !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/u.test(calldata)) throw new Error('Invalid history calldata');
  const decoded = abi.calldata.decode(Buffer.from(calldata, 'base64'));
  const get = key => decoded instanceof Map ? decoded.get(key) : decoded?.[key];
  const operation = OPERATIONS.get(get('method'));
  if (!operation) return null;
  const args = get('args');
  const grantId = Array.isArray(args) ? args[operation[1]] : undefined;
  const hash = tx.hash ?? tx.transactionHash;
  const createdAt = tx.created_at ?? tx.createdAt;
  if (!HASH.test(hash) || typeof grantId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(grantId)
    || typeof createdAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/u.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error('Invalid history fields');
  }
  // Explicit allowlist: never forward calldata, receipts or validator internals.
  return { hash: hash.toLowerCase(), label: operation[0], grantId, createdAt: new Date(createdAt).toISOString(), stage: transactionStage(tx) };
}

export function projectHistory(records, scope) {
  if (!Array.isArray(records) || scope.network !== 'studionet' || !ADDRESS.test(scope.account) || !ADDRESS.test(scope.contractAddress)) {
    throw new Error('Invalid history response or scope');
  }
  const entries = new Map();
  for (const record of records) {
    const entry = projectTransaction(record, scope);
    if (!entry) continue;
    const previous = entries.get(entry.hash);
    if (previous && JSON.stringify(previous) !== JSON.stringify(entry)) throw new Error('Conflicting transaction history');
    entries.set(entry.hash, entry);
  }
  return [...entries.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.hash.localeCompare(b.hash));
}

export async function loadHistory(scope, fetchImpl, signal) {
  const rpc = async (method, params) => {
    const response = await fetchImpl('https://studio.genlayer.com/api', {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!response.ok) throw new Error('History upstream unavailable');
    const body = object(await response.json());
    if (body.error || !Object.hasOwn(body, 'result')) throw new Error('History RPC unavailable');
    return body.result;
  };
  if (await rpc('eth_chainId', []) !== '0xf22f') throw new Error('Wrong history network');
  // Studio currently rejects the SDK's optional direction parameter (-32602).
  // Fetch only this contract, then enforce both sender and recipient locally.
  const entries = projectHistory(await rpc('sim_getTransactionsForAddress', [scope.contractAddress]), scope);
  // The list response can omit consensus even for finalized transactions.
  // Resolve only incomplete entries, with bounded parallelism and strict binding.
  for (let offset = 0; offset < entries.length; offset += 4) {
    await Promise.all(entries.slice(offset, offset + 4).map(async entry => {
      if (entry.stage !== 'UNCONFIRMED') return;
      try {
        const receipt = await rpc('eth_getTransactionByHash', [entry.hash]);
        const verified = projectHistory([receipt], scope)[0];
        if (verified?.hash === entry.hash && verified.grantId === entry.grantId && verified.label === entry.label) entry.stage = verified.stage;
      } catch {
        if (signal.aborted) throw new Error('History request timed out');
        // Keep UNCONFIRMED; a failed lookup is not evidence of success/failure.
      }
    }));
  }
  return entries;
}
