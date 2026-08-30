import activityHandler from '../api/activity.mjs';

export function createActivityDevMiddleware({ handler = activityHandler, env }) {
  return async function activityDevMiddleware(request, response) {
    let text = '';
    try {
      for await (const chunk of request) {
        text += chunk.toString('utf8');
        if (Buffer.byteLength(text, 'utf8') > 16_384) {
          response.statusCode = 413;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ error: 'Request body too large' }));
          return;
        }
      }
      let body;
      try { body = text ? JSON.parse(text) : null; } catch {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ error: 'Valid JSON required' }));
        return;
      }
      const adapter = {
        setHeader: (name, value) => response.setHeader(name, value),
        status(code) { response.statusCode = code; return adapter; },
        json(value) { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(value)); },
      };
      await handler({ method: request.method, body }, adapter, { env });
    } catch {
      if (!response.writableEnded) {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    }
  };
}

export function activityDevPlugin(env) {
  return {
    name: 'grantlattice-activity-dev-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/activity', createActivityDevMiddleware({ env }));
    },
  };
}
