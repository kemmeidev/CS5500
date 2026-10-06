type NodeEnv = "development" | "test" | "production";

export interface IAppConfig {
  port: number;
  nodeEnv: NodeEnv;
  mongodbUri: string;
}

const NODE_ENVS: readonly NodeEnv[] = ["development", "test", "production"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(raw: string): number {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT: "${raw}" is not a TCP port between 1 and 65535`,
    );
  }
  return port;
}

function parseNodeEnv(raw: string): NodeEnv {
  const match = NODE_ENVS.find((candidate) => candidate === raw);
  if (match === undefined) {
    throw new Error(
      `Invalid NODE_ENV: "${raw}" must be one of ${NODE_ENVS.join(" | ")}`,
    );
  }
  return match;
}

function loadConfig(): IAppConfig {
  return {
    port: parsePort(requireEnv("PORT")),
    nodeEnv: parseNodeEnv(requireEnv("NODE_ENV")),
    mongodbUri: requireEnv("MONGODB_URI"),
  };
}

// Evaluated at import time so a missing or malformed variable fails the process
// at startup rather than on the first request that needs it.
export const config: IAppConfig = loadConfig();
