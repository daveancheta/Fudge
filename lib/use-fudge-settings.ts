"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_FUDGE_SETTINGS, type FudgeSettings } from "@/lib/fudge-settings";

const STORAGE_KEY = "fudge-settings";

function readSettings(): FudgeSettings {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<FudgeSettings> | null;
    if (value && typeof value.waveColor === "string" && /^#[\da-f]{6}$/i.test(value.waveColor)
      && typeof value.randomWaveColor === "boolean" && typeof value.animateWave === "boolean") {
      return { ...DEFAULT_FUDGE_SETTINGS, ...value };
    }
  } catch { /* Use defaults when storage is unavailable or invalid. */ }
  return DEFAULT_FUDGE_SETTINGS;
}

export function useFudgeSettings() {
  const [settings, setSettings] = useState<FudgeSettings>(DEFAULT_FUDGE_SETTINGS);

  useEffect(() => {
    setSettings(readSettings());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setSettings(readSettings());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const saveSettings = useCallback((next: FudgeSettings) => {
    setSettings(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep in-memory settings usable. */ }
  }, []);

  return { settings, saveSettings };
}
