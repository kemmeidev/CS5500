import { createDefaultEsmPreset } from "ts-jest";
import type { Config } from "jest";

// ESM end to end, matching "type": "module" + module nodenext. Run through
// `npm test` (or with NODE_OPTIONS=--experimental-vm-modules) so Jest can load ESM.
const config: Config = {
  ...createDefaultEsmPreset({ tsconfig: "<rootDir>/tsconfig.json" }),
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  // Source imports end in .js (nodenext); map them back to the .ts files.
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  // The first run downloads a MongoDB binary for mongodb-memory-server.
  testTimeout: 60_000,
  collectCoverageFrom: ["src/services/**/*.ts", "src/controllers/**/*.ts"],
  coverageReporters: ["text", "text-summary", "lcov"],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};

export default config;
