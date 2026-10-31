const configuredOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_REMOTE_API_URL,
  "http://tauri.localhost",
  ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"]),
];

const allowedOrigins = new Set(configuredOrigins.flatMap((value) => {
  if (!value) return [];
  try {
    return [new URL(value).origin];
  } catch {
    return [];
  }
}));

export function withApiCors(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => addCorsHeaders(request, await handler(request));
}

export function apiCorsOptions(request: Request) {
  return addCorsHeaders(request, new Response(null, { status: 204 }));
}

function addCorsHeaders(request: Request, response: Response) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins.has(origin)) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  headers.set("Access-Control-Allow-Headers", request.headers.get("access-control-request-headers") || "Content-Type, Authorization");
  headers.append("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
