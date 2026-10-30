"use client";

import { useEffect, useState } from "react";

const SETTINGS_STORAGE_KEY = "fudge-settings";
type FudgeSettings = { waveColor: string; randomWaveColor: boolean; animateWave: boolean };
const DEFAULT_SETTINGS: FudgeSettings = { waveColor: "#ff637d", randomWaveColor: true, animateWave: true };

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    } catch { /* Keep defaults if saved preferences cannot be read. */ }
  }, []);

  const update = (next: FudgeSettings) => {
    setSettings(next);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <main className="h-screen overflow-y-auto bg-[#0b0b0c] px-8 py-7 text-white">
      <header className="mb-8">
        <p className="text-xs font-medium tracking-wide text-white/40">FUDGE</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-medium">Music wave</h2>
          <p className="mt-1 text-xs text-white/45">Choose how the island looks while music is playing.</p>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
          <span>
            <span className="block text-sm">Random color</span>
            <span className="mt-1 block text-xs text-white/45">Change color for each track</span>
          </span>
          <input
            type="checkbox"
            checked={settings.randomWaveColor}
            onChange={(event) => update({ ...settings, randomWaveColor: event.target.checked })}
            className="size-4 accent-white"
          />
        </label>

        <label className={`flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 ${settings.randomWaveColor ? "opacity-40" : ""}`}>
          <span>
            <span className="block text-sm">Wave color</span>
            <span className="mt-1 block text-xs text-white/45">Used when random color is off</span>
          </span>
          <input
            aria-label="Wave color"
            type="color"
            value={settings.waveColor}
            disabled={settings.randomWaveColor}
            onChange={(event) => update({ ...settings, waveColor: event.target.value })}
            className="size-8 cursor-pointer rounded-md border-0 bg-transparent disabled:cursor-default"
          />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
          <span>
            <span className="block text-sm">Animate wave</span>
            <span className="mt-1 block text-xs text-white/45">Show the dancing music bars</span>
          </span>
          <input
            type="checkbox"
            checked={settings.animateWave}
            onChange={(event) => update({ ...settings, animateWave: event.target.checked })}
            className="size-4 accent-white"
          />
        </label>
      </section>
    </main>
  );
}
