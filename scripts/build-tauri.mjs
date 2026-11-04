import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

// Static exports cannot include request-time POST Route Handlers. Keep the
// hosted API route in the web build, but omit it while generating Tauri assets.
const focusRoute = resolve("app", "api", "focus", "route.ts");
const hiddenFocusRoute = resolve("app", "api", "focus", "route.tauri-build.ts.disabled");
let routeHidden = false;
if (existsSync(focusRoute)) {
  renameSync(focusRoute, hiddenFocusRoute);
  routeHidden = true;
}

let result;
try {
  result = spawnSync("npm", ["run", "build"], {
    env: { ...process.env, TAURI_BUILD: "true", SYSTEM: "desktop" },
    shell: process.platform === "win32",
    stdio: "inherit",
  });
} finally {
  if (routeHidden) renameSync(hiddenFocusRoute, focusRoute);
}

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
