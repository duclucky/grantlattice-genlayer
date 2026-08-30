export function activityDevPlugin(environment: Record<string, string>): {
  name: string;
  configureServer(server: { middlewares: { use(path: string, handler: unknown): void } }): void;
};
