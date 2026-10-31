import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/index";
import { userSettings } from "@/db/schema";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserRealtimeTopic } from "@/lib/settings-realtime";
import { DEFAULT_FUDGE_SETTINGS, type FudgeSettings } from "@/lib/fudge-settings";

export const runtime = "nodejs";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id;
}

function validSettings(value: unknown): value is FudgeSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FudgeSettings>;
  return typeof candidate.waveColor === "string"
    && /^#[\da-f]{6}$/i.test(candidate.waveColor)
    && typeof candidate.randomWaveColor === "boolean"
    && typeof candidate.animateWave === "boolean";
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Sign in to load your settings." }, { status: 401 });

  try {
    const [data] = await db.select({
      waveColor: userSettings.waveColor,
      randomWaveColor: userSettings.randomWaveColor,
      animateWave: userSettings.animateWave,
    }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

    return Response.json({
      settings: data ?? DEFAULT_FUDGE_SETTINGS,
      realtimeTopic: getUserRealtimeTopic(userId, "settings"),
    });
  } catch (error) {
    console.error("Could not load settings", error);
    return Response.json({ error: "Could not load settings from the database." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Sign in to save your settings." }, { status: 401 });

  let settings: unknown;
  try {
    settings = await request.json();
  } catch {
    return Response.json({ error: "Invalid settings payload." }, { status: 400 });
  }
  if (!validSettings(settings)) return Response.json({ error: "Invalid settings values." }, { status: 400 });

  try {
    await db.insert(userSettings).values({
      userId,
      waveColor: settings.waveColor,
      randomWaveColor: settings.randomWaveColor,
      animateWave: settings.animateWave,
    }).onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        waveColor: settings.waveColor,
        randomWaveColor: settings.randomWaveColor,
        animateWave: settings.animateWave,
        updatedAt: new Date(),
      },
    });

    const topic = getUserRealtimeTopic(userId, "settings");
    try {
      const broadcastResult = await supabase
        .channel(topic, { config: { private: false } })
        .httpSend("settings-updated", { settings });
      if (!broadcastResult.success) console.error("Could not broadcast settings change", broadcastResult.error);
    } catch (error) {
      console.error("Could not broadcast settings change", error);
    }

    return Response.json({ settings });
  } catch (error) {
    console.error("Could not save settings", error);
    return Response.json({ error: "Could not save settings to the database." }, { status: 503 });
  }
}
