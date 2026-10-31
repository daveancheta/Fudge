import { createAuthClient } from "better-auth/react";

// In desktop production builds auth is hosted with the rest of the API. During
// development the web app and auth server share localhost:3000.
const baseURL = process.env.NODE_ENV === "production"
  ? process.env.NEXT_PUBLIC_REMOTE_API_URL
  : undefined;

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: { credentials: "include" },
});
