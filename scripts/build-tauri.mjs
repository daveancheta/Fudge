import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

// Tauri ships a static frontend. Its API requests use NEXT_PUBLIC_REMOTE_API_URL,
// so server-only Next route handlers must not be included in the export build.
const apiDirectory = resolve("app/api");
const apiBackup = resolve(".tauri-api-backup");

if (existsSync(apiBackup)) {
  throw new Error(`Refusing to overwrite existing API backup at ${apiBackup}`);
}

let apiWasMoved = false;
let exitCode = 1;

try {
  if (existsSync(apiDirectory)) {
    renameSync(apiDirectory, apiBackup);
    apiWasMoved = true;
  }

  const result = spawnSync("npm", ["run", "build"], {
    env: { ...process.env, TAURI_BUILD: "true" },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  exitCode = result.status ?? 1;
} finally {
  if (apiWasMoved) renameSync(apiBackup, apiDirectory);
}

process.exit(exitCode);
