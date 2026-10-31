import { isTauri } from "@tauri-apps/api/core";

export function appFetch(path: string, init?: RequestInit) {
  const useRemoteApi = process.env.NODE_ENV === "production" && isTauri();
  const apiBase = useRemoteApi ? process.env.NEXT_PUBLIC_REMOTE_API_URL?.replace(/\/$/, "") || "" : "";
  return fetch(`${apiBase}${path}`, {
    ...init,
    credentials: useRemoteApi ? "include" : init?.credentials,
  });
}
