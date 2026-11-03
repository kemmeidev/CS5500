import { config } from "../config/env.config.js";

export interface IHealthStatus {
  status: "ok";
  service: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

export function getHealthStatus(): IHealthStatus {
  return {
    status: "ok",
    service: "campushub-backend",
    environment: config.nodeEnv,
    uptimeSeconds: Math.round(process.uptime() * 1000) / 1000,
    timestamp: new Date().toISOString(),
  };
}
