import app from "./app.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database.config.js";
import { config } from "./config/env.config.js";

// Connect before listening: an unreachable database fails the process at startup
// instead of turning every request into a 500.
await connectDatabase();

const server = app.listen(config.port, (): void => {
  console.warn(
    `campushub-backend listening on port ${config.port} [${config.nodeEnv}]`,
  );
});

function shutdown(signal: NodeJS.Signals): void {
  console.warn(`${signal} received, shutting down`);
  server.close((): void => {
    disconnectDatabase().catch((err: unknown): void => {
      console.error(err);
      process.exitCode = 1;
    });
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
