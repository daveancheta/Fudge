"use client";

import { useFudgeSettings } from "@/lib/use-fudge-settings";

export default function SettingsPage() {
  const { settings, saveSettings } = useFudgeSettings();

  return (
    <main className="h-screen overflow-y-auto bg-[#0b0b0c] px-8 py-7 text-white">
      <header className="mb-8">
        <p className="text-xs font-medium tracking-wide text-white/40">FUDGE</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
      </header>
      <section className="space-y-5">
        <div>
          <h2 className="text-sm font-medium">Voice feedback</h2>
          <p className="mt-1 text-xs text-white/45">Choose whether Fudge speaks replies to voice commands.</p>
        </div>
        <label className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
          <span><span className="block text-sm">Speak replies</span><span className="mt-1 block text-xs text-white/45">Turn spoken responses on or off</span></span>
          <input type="checkbox" checked={settings.voiceFeedback} onChange={(event) => saveSettings({ ...settings, voiceFeedback: event.target.checked })} className="size-4 accent-white" />
        </label>
        <div>
          <h2 className="text-sm font-medium">Music wave</h2>
          <p className="mt-1 text-xs text-white/45">Choose how the island looks while music is playing.</p>
        </div>
        <label className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
          <span><span className="block text-sm">Random color</span><span className="mt-1 block text-xs text-white/45">Change color for each track</span></span>
          <input type="checkbox" checked={settings.randomWaveColor} onChange={(event) => saveSettings({ ...settings, randomWaveColor: event.target.checked })} className="size-4 accent-white" />
        </label>
        <label className={`flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 ${settings.randomWaveColor ? "opacity-40" : ""}`}>
          <span><span className="block text-sm">Wave color</span><span className="mt-1 block text-xs text-white/45">Used when random color is off</span></span>
          <input aria-label="Wave color" type="color" value={settings.waveColor} disabled={settings.randomWaveColor} onChange={(event) => saveSettings({ ...settings, waveColor: event.target.value })} className="size-8 cursor-pointer rounded-md border-0 bg-transparent disabled:cursor-default" />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
          <span><span className="block text-sm">Animate wave</span><span className="mt-1 block text-xs text-white/45">Show the dancing music bars</span></span>
          <input type="checkbox" checked={settings.animateWave} onChange={(event) => saveSettings({ ...settings, animateWave: event.target.checked })} className="size-4 accent-white" />
        </label>
        <p className="pt-2 text-xs text-white/35">Settings are saved on this device.</p>
      </section>
    </main>
  );
}
