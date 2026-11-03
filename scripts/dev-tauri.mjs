import { spawn } from "node:child_process";

const child = spawn("npm", ["run", "dev"], {
  env: { ...process.env, SYSTEM: "desktop" },
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
