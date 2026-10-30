"use client";

import { useEffect, useState } from "react";
import { MonitorSmartphone } from "lucide-react";

const SETTINGS_STORAGE_KEY = "fudge-settings";
type FudgeSettings = { waveColor: string; randomWaveColor: boolean; animateWave: boolean };
const DEFAULT_SETTINGS: FudgeSettings = { waveColor: "#ff637d", randomWaveColor: true, animateWave: true };

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [accountMessage, setAccountMessage] = useState("");

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

      <section className="mt-9 space-y-4 border-t border-white/10 pt-6">
        <div>
          <h2 className="text-sm font-medium">Account</h2>
          <p className="mt-1 text-xs text-white/45">Sign in to use Fudge across your devices.</p>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <button
            type="button"
            onClick={() => setAccountMessage("Google sign-in is not connected yet.")}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white text-sm font-medium text-black transition-colors hover:bg-white/90"
          >
            <GoogleMark />
            Continue with Google
          </button>
          {accountMessage && <p role="status" className="mt-3 text-center text-xs text-white/50">{accountMessage}</p>}
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/70">
            <MonitorSmartphone aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm">Other devices</span>
            <span className="mt-1 block text-xs leading-relaxed text-white/45">Sign in with Google to sync your settings across devices.</span>
          </span>
        </div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-[18px]">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
      <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
    </svg>
  );
}
