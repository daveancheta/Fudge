import { createHmac } from "node:crypto";

export function getSettingsRealtimeTopic(userId: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET must be configured for settings Realtime.");
  const token = createHmac("sha256", secret).update(userId).digest("base64url");
  return `fudge-settings:${token}`;
}
