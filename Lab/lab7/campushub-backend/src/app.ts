import express from "express";
import type { Express } from "express";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/health.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import resourceRoutes from "./routes/resource.routes.js";

// Assembly only: no database connection and no listen, so tests can drive the app
// through Supertest. src/server.ts is the runtime entry point.
const app: Express = express();

app.use(express.json());

app.use("/api/v1", healthRoutes);
app.use("/api/v1", resourceRoutes);
app.use("/api/v1", reservationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
