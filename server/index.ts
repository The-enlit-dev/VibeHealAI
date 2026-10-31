import { createBackend } from "./backend.js";
import { ConfigError, loadConfig } from "./config.js";
import { createLogger } from "./security/logger.js";

// Entry point for the local development backend. Start it with `npm run dev:server`.

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      process.stderr.write(`${error.message}\n\nSee .env.example and README.md ("Local setup").\n`);
      process.exit(1);
    }
    throw error;
  }

  const logger = createLogger({ level: config.logLevel });
  const backend = await createBackend({ config, logger });

  if (config.allowNonLoopback) {
    logger.warn("Listening on a non-loopback address. Only do this behind TLS with hosted identity in place (BK-1, P-9).");
  }

  backend.server.listen(config.port, config.host, () => {
    const github = "appId" in config.providers.github ? "configured" : "not configured";
    logger.info(`BrixoAI backend listening on ${config.host}:${config.port}`, { github });
  });

  const shutdown = (): void => {
    backend.server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  process.stderr.write(`Backend failed to start: ${error instanceof Error ? error.name : "unknown error"}\n`);
  process.exit(1);
});
