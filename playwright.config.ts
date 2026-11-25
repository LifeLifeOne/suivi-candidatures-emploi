import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3100";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    // Base dédiée aux tests : ne jamais écrire dans vos vraies candidatures.
    env: {
      DB_FILE_NAME: process.env.E2E_DB_FILE_NAME ?? "data/e2e/jobs.db",
      UPLOAD_DIR: process.env.E2E_UPLOAD_DIR ?? "data/e2e/uploads",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
