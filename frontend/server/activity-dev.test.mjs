import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

const modulePath = './activity-dev.mjs';
const implementation = await import(/* @vite-ignore */ modulePath).catch(() => ({}));
function response() {
  return { statusCode: 200, headers: {}, body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(body = '') { this.body = body; },
  };
}
async function invoke(body, handler = vi.fn(async (_request, reply) => reply.status(200).json({ ok: true }))) {
  expect(implementation.createActivityDevMiddleware).toBeTypeOf('function');
  const middleware = implementation.createActivityDevMiddleware({ handler, env: { VITE_CONTRACT_ADDRESS: `0x${'b'.repeat(40)}` } });
  const request = Readable.from(body == null ? [] : [body]);
  request.method = 'POST';
  const reply = response();
  const next = vi.fn();
  await middleware(request, reply, next);
  return { reply, handler, next };
}
describe('local Activity endpoint parity', () => {
  it('parses a bounded request and uses the production handler', async () => {
    const { reply, handler, next } = await invoke(JSON.stringify({ account: `0x${'a'.repeat(40)}` }));
    expect(reply.statusCode).toBe(200);
    expect(JSON.parse(reply.body)).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', body: { account: `0x${'a'.repeat(40)}` } }), expect.anything(), expect.objectContaining({ env: expect.any(Object) }));
    expect(next).not.toHaveBeenCalled();
  });
  it('returns 400 for malformed JSON without invoking the endpoint', async () => {
    const handler = vi.fn();
    const { reply } = await invoke('{', handler);
    expect(reply.statusCode).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });
  it('returns 413 for oversized bodies', async () => {
    const handler = vi.fn();
    const { reply } = await invoke('x'.repeat(16_385), handler);
    expect(reply.statusCode).toBe(413);
    expect(handler).not.toHaveBeenCalled();
  });
});
