import { ADDRESS, loadHistory } from '../server/activity-history.mjs';

export default async function handler(request, response, options = {}) {
  response.setHeader('Cache-Control', 'private, no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).length !== 1 || typeof body.account !== 'string' || !ADDRESS.test(body.account)) {
    response.status(400).json({ error: 'A wallet address is required' });
    return;
  }
  const env = options.env ?? process.env;
  const contractAddress = env.VITE_GENLAYER_CONTRACT_ADDRESS ?? env.VITE_CONTRACT_ADDRESS;
  const network = env.VITE_GENLAYER_NETWORK ?? 'studionet';
  if (!ADDRESS.test(contractAddress) || network !== 'studionet') {
    response.status(503).json({ error: 'Activity history is not configured' });
    return;
  }
  const scope = { account: body.account.toLowerCase(), contractAddress: contractAddress.toLowerCase(), network };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);
  try {
    const activities = await loadHistory(scope, options.fetchImpl ?? fetch, controller.signal);
    response.status(200).json({ scope, activities });
  } catch {
    response.status(502).json({ error: 'Activity history unavailable. Try again.' });
  } finally {
    clearTimeout(timer);
  }
}
