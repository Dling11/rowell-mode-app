import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";

if (existsSync(".local/browsers"))
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve(".local/browsers");
process.env.HUB_TEST_AUTH_SECRET ||= randomBytes(32).toString("hex");
const isolatedEnv = {
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  VERCEL: "",
  MONGODB_URI: "",
  MONGODB_DB: "",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
  GITHUB_RELEASE_TOKEN: "",
  BETTER_AUTH_SECRET: process.env.HUB_TEST_AUTH_SECRET,
  OWNER_SETUP_TOKEN: "",
};
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.browser.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  outputDir: ".private/test-results",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: [
    {
      command: `"${process.execPath}" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3105`,
      url: "http://127.0.0.1:3105/api/health",
      reuseExistingServer: false,
      env: {
        ...isolatedEnv,
        BETTER_AUTH_URL: "http://127.0.0.1:3105",
        MONGODB_URI: "mongodb://127.0.0.1:1",
        MONGODB_DB: "isolated-ui-never-connect",
      },
    },
    {
      command: `"${process.execPath}" node_modules/tsx/dist/cli.mjs --conditions=react-server tests/helpers/auth-service.ts`,
      url: "http://localhost:3104/",
      reuseExistingServer: false,
      env: {
        ...isolatedEnv,
        BETTER_AUTH_URL: "http://localhost:3104",
        OWNER_SETUP_TOKEN: "isolated-owner-setup-code",
      },
    },
    {
      command: `"${process.execPath}" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100`,
      url: "http://127.0.0.1:3100/api/health",
      reuseExistingServer: false,
      env: {
        ...isolatedEnv,
        BETTER_AUTH_URL: "http://127.0.0.1:3100",
        SITE_MODE: "",
      },
    },
    {
      command: `"${process.execPath}" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3101`,
      url: "http://127.0.0.1:3101/api/health",
      reuseExistingServer: false,
      env: {
        ...isolatedEnv,
        BETTER_AUTH_URL: "http://127.0.0.1:3101",
        SITE_MODE: "maintenance",
      },
    },
    {
      command: `"${process.execPath}" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3102`,
      url: "http://127.0.0.1:3102/api/health",
      reuseExistingServer: false,
      env: {
        ...isolatedEnv,
        BETTER_AUTH_URL: "http://127.0.0.1:3102",
        SITE_MODE: "downloads-paused",
      },
    },
    {
      command: `"${process.execPath}" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3103`,
      url: "http://127.0.0.1:3103/api/health",
      reuseExistingServer: false,
      env: {
        ...isolatedEnv,
        VERCEL: "1",
        BETTER_AUTH_URL: "http://127.0.0.1:3103",
        SITE_MODE: "",
      },
    },
  ],
});
