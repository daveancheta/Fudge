import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const result = spawnSync("npm", ["run", "build"], {
  env: { ...process.env, TAURI_BUILD: "true", SYSTEM: "desktop" },
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.status === 0) {
  // Installer downloads belong to the download page, not the desktop app.
  const staticDownloads = resolve("out", "downloads");
  if (existsSync(staticDownloads)) {
    for (const filename of readdirSync(staticDownloads)) {
      if (/\.(exe|msi)$/i.test(filename)) rmSync(join(staticDownloads, filename), { force: true });
    }
  }
}

process.exit(result.status ?? 1);
