import express from "express";
import type { Express } from "express";
import { config } from "./config/env.config.js";
import { handleError, notFound } from "./controllers/error.controller.js";
import healthRoutes from "./routes/health.routes.js";

const app: Express = express();

app.use(express.json());

app.use("/api/v1", healthRoutes);

app.use(notFound);
app.use(handleError);

app.listen(config.port, (): void => {
  console.warn(
    `campushub-backend listening on port ${config.port} [${config.nodeEnv}]`,
  );
});
