import express from "express";
import type { Express } from "express";
import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database.config.js";
import { config } from "./config/env.config.js";
import { handleError, notFound } from "./controllers/error.controller.js";
import healthRoutes from "./routes/health.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import resourceRoutes from "./routes/resource.routes.js";

const app: Express = express();

app.use(express.json());

app.use("/api/v1", healthRoutes);
app.use("/api/v1", resourceRoutes);
app.use("/api/v1", reservationRoutes);

app.use(notFound);
app.use(handleError);

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
