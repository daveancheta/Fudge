import { OPTIONS as preflight, POST as proxyPost } from "@/lib/meta-focus-proxy";

export const maxDuration = 120;

export function OPTIONS(request: Request) {
  return preflight(request);
}

export function POST(request: Request) {
  return proxyPost(request);
}
