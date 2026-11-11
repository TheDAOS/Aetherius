import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROME_PATH ||
        (process.env.CI ? undefined : "/usr/bin/google-chrome"),
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "pnpm --filter web dev --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54329",
      VITE_SUPABASE_ANON_KEY: "local-test-key",
    },
  },
});
