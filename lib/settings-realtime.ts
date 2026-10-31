import { createHmac } from "node:crypto";

export function getUserRealtimeTopic(userId: string, channel: "settings" | "chat") {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET must be configured for Realtime.");
  const token = createHmac("sha256", secret).update(`${channel}:${userId}`).digest("base64url");
  return `fudge-${channel}:${token}`;
}
