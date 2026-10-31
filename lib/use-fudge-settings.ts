"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_FUDGE_SETTINGS, type FudgeSettings } from "@/lib/fudge-settings";
import { supabase } from "@/lib/supabase";

export function useFudgeSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<FudgeSettings>(DEFAULT_FUDGE_SETTINGS);
  const [settingsError, setSettingsError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return null;
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error || "Could not load settings.");
      const result = (await response.json()) as { settings: FudgeSettings; realtimeTopic: string };
      setSettings({ ...DEFAULT_FUDGE_SETTINGS, ...result.settings });
      setSettingsError("");
      return result;
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not load settings.");
      return null;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSettings(DEFAULT_FUDGE_SETTINGS);
      return;
    }

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    void refresh().then((result) => {
      if (!active || !result) return;
      channel = supabase
        .channel(result.realtimeTopic, { config: { private: false } })
        .on("broadcast", { event: "settings-updated" }, ({ payload }) => {
          const next = payload?.settings as FudgeSettings | undefined;
          if (next && isFudgeSettings(next)) {
            setSettings({ ...DEFAULT_FUDGE_SETTINGS, ...next });
            setSettingsError("");
          } else {
            void refresh();
          }
        })
        .subscribe((status) => {
          // Re-read after joining to cover a write that happened during the initial fetch.
          if (status === "SUBSCRIBED") void refresh();
        });
    });

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [refresh, userId]);

  const saveSettings = useCallback(async (next: FudgeSettings) => {
    if (!userId) {
      setSettingsError("Sign in to save and sync your settings.");
      return;
    }
    setSettings(next);
    setSettingsError("");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!response.ok) throw new Error((await response.json()).error || "Could not save settings.");
      } catch (error) {
        setSettingsError(error instanceof Error ? error.message : "Could not save settings.");
        void refresh();
      }
    }, 100);
  }, [refresh, userId]);

  return { settings, saveSettings, settingsError };
}

function isFudgeSettings(value: FudgeSettings): boolean {
  return typeof value.waveColor === "string"
    && /^#[\da-f]{6}$/i.test(value.waveColor)
    && typeof value.randomWaveColor === "boolean"
    && typeof value.animateWave === "boolean";
}
