import { describe, expect, it, vi } from "vitest";

import handler from "./genlayer.mjs";

function responseRecorder() {
  const state = { status: 200, headers: {}, body: undefined };
  return {
    state,
    status(code) {
      state.status = code;
      return this;
    },
    setHeader(name, value) {
      state.headers[name] = value;
    },
    send(body) {
      state.body = body;
    },
    json(body) {
      state.body = body;
    },
  };
}

describe("production GenLayer same-origin proxy", () => {
  it("rejects non-POST requests without contacting Studionet", async () => {
    const fetchImpl = vi.fn();
    const response = responseRecorder();

    await handler({ method: "GET" }, response, { fetchImpl });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(response.state).toMatchObject({
      status: 405,
      body: { error: "Method not allowed" },
    });
    expect(response.state.headers.Allow).toBe("POST");
  });

  it("forwards only the JSON body to the locked Studionet endpoint", async () => {
    const fetchImpl = vi.fn(async () => ({
      status: 200,
      headers: { get: () => "application/json" },
      text: async () => '{"jsonrpc":"2.0","id":1,"result":"ok"}',
    }));
    const response = responseRecorder();
    const body = { jsonrpc: "2.0", id: 1, method: "gen_call", params: [] };

    await handler({ method: "POST", body, headers: { authorization: "secret" } }, response, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith("https://studio.genlayer.com/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.state).toMatchObject({
      status: 200,
      body: '{"jsonrpc":"2.0","id":1,"result":"ok"}',
    });
  });

  it("fails closed when the upstream is unavailable", async () => {
    const response = responseRecorder();

    await handler(
      { method: "POST", body: { jsonrpc: "2.0", id: 1 } },
      response,
      { fetchImpl: vi.fn(async () => { throw new Error("offline"); }) },
    );

    expect(response.state).toMatchObject({
      status: 502,
      body: { error: "GenLayer RPC unavailable" },
    });
  });
});
