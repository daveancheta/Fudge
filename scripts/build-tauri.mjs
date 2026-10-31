import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["run", "build"], {
  env: { ...process.env, TAURI_BUILD: "true" },
  shell: process.platform === "win32",
  stdio: "inherit",
});

process.exit(result.status ?? 1);
