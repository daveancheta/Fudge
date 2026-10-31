import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Tauri ships a static frontend. Its API requests use NEXT_PUBLIC_REMOTE_API_URL,
// so replace server-only route handlers with static placeholders during export.
// Keep originals in memory and restore them after Next finishes, even on failure.
const apiDirectory = resolve("app", "api");
const routeFiles = [];

function findRouteFiles(directory) {
  if (!existsSync(directory)) return;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) findRouteFiles(path);
    else if (/^route\.(js|jsx|ts|tsx)$/.test(entry.name)) routeFiles.push(path);
  }
}

findRouteFiles(apiDirectory);
const originalRoutes = new Map(routeFiles.map((path) => [path, readFileSync(path, "utf8")]));

let exitCode = 1;

try {
  for (const path of routeFiles) {
    const isDynamicRoute = /\[[^/\\]+\]/.test(path.slice(apiDirectory.length));
    const staticParams = isDynamicRoute
      ? 'export const dynamicParams = false;\nexport function generateStaticParams() { return [{ all: ["__tauri_static_placeholder__"] }]; }\n'
      : "";
    writeFileSync(path, `export const dynamic = "force-static";\n${staticParams}export async function GET() { return Response.json({}); }\n`);
  }

  const result = spawnSync("npm", ["run", "build"], {
    env: { ...process.env, TAURI_BUILD: "true" },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  exitCode = result.status ?? 1;
} finally {
  for (const [path, source] of originalRoutes) writeFileSync(path, source);
}

process.exit(exitCode);
