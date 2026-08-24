const STUDIONET_RPC = "https://studio.genlayer.com/api";

export default async function handler(request, response, options = {}) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!request.body || typeof request.body !== "object") {
    response.status(400).json({ error: "JSON-RPC body required" });
    return;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const upstream = await fetchImpl(STUDIONET_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body),
    });
    const body = await upstream.text();
    response.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") ?? "application/json",
    );
    response.status(upstream.status).send(body);
  } catch {
    response.status(502).json({ error: "GenLayer RPC unavailable" });
  }
}
