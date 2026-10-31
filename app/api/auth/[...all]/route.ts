import { auth } from "@/lib/auth";
import { apiCorsOptions, withApiCors } from "@/lib/api-cors";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export const GET = withApiCors((request) => handlers.GET(request));
export const POST = withApiCors((request) => handlers.POST(request));
export function OPTIONS(request: Request) {
  return apiCorsOptions(request);
}
