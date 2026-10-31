"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createAuthClient } from "better-auth/react";
import { Check, MonitorSmartphone, Moon, Sun, Laptop } from "lucide-react";
import { setWebTheme, WEB_THEME_KEY, type WebTheme } from "../theme-provider";
import { useFudgeSettings } from "@/lib/use-fudge-settings";

const authClient = createAuthClient();

export default function WebSettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const { settings, saveSettings, settingsError } = useFudgeSettings(session?.user.id);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<WebTheme>("system");

  useEffect(() => {
    const savedTheme = localStorage.getItem(WEB_THEME_KEY) as WebTheme | null;
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") setTheme(savedTheme);
  }, []);

  const update = (next: typeof settings) => {
    void saveSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const updateTheme = (value: WebTheme) => {
    setTheme(value);
    setWebTheme(value);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
    <header className="mb-9 flex items-start justify-between gap-4"><div><p className="text-xs text-white/40">FUDGE WORKSPACE</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1><p className="mt-2 text-sm text-white/45">Make your desktop island feel like yours.</p></div>{saved && <span role="status" className="mt-5 flex items-center gap-1.5 text-xs text-emerald-300"><Check className="size-3.5" /> Saved</span>}</header>
    <section className="space-y-4">
      <div><h2 className="text-sm font-medium">Appearance</h2><p className="mt-1 text-xs text-white/40">Choose how Fudge looks in your web workspace.</p></div>
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 p-2">
        {([ ["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Laptop] ] as const).map(([value, label, Icon]) => <button key={value} type="button" role="radio" aria-checked={theme === value} onClick={() => updateTheme(value)} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition ${theme === value ? "bg-white text-black" : "text-white/55 hover:bg-white/[0.06] hover:text-white"}`}><Icon className="size-4" />{label}</button>)}
      </div>
    </section>
    <section className="mt-8 space-y-4">
      <div><h2 className="text-sm font-medium">Music wave</h2><p className="mt-1 text-xs text-white/40">Choose how the island looks while music is playing.</p></div>
      {settingsError && <p role="status" className="rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-200/80">{settingsError}</p>}
      <SettingRow title="Random color" detail="Change color for each track"><input aria-label="Random color" type="checkbox" checked={settings.randomWaveColor} disabled={isPending || !session?.user} onChange={(e) => update({ ...settings, randomWaveColor: e.target.checked })} className="size-4 accent-[#ff8295] disabled:cursor-not-allowed" /></SettingRow>
      <SettingRow title="Wave color" detail="Used when random color is off" muted={settings.randomWaveColor}><input aria-label="Wave color" type="color" value={settings.waveColor} disabled={settings.randomWaveColor || isPending || !session?.user} onChange={(e) => update({ ...settings, waveColor: e.target.value })} className="size-8 cursor-pointer rounded-lg border-0 bg-transparent disabled:cursor-default" /></SettingRow>
      <SettingRow title="Animate wave" detail="Show the dancing music bars"><input aria-label="Animate wave" type="checkbox" checked={settings.animateWave} disabled={isPending || !session?.user} onChange={(e) => update({ ...settings, animateWave: e.target.checked })} className="size-4 accent-[#ff8295] disabled:cursor-not-allowed" /></SettingRow>
    </section>
    <section className="mt-9 border-t border-white/10 pt-7">
      <h2 className="text-sm font-medium">Account</h2><p className="mt-1 text-xs text-white/40">Manage the account linked to this web workspace.</p>
      <div className="mt-4 flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 p-4">
        {session?.user?.image ? <img src={session.user.image} alt="" className="size-10 shrink-0 rounded-full object-cover" /> : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.07] text-sm">{session?.user?.name?.[0]?.toUpperCase() || <MonitorSmartphone className="size-4" />}</span>}
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{isPending ? "Checking account" : session?.user?.name || "Fudge account"}</span><span className="block truncate text-xs text-white/40">{session?.user?.email || (isPending ? "Please wait" : "Sign in to connect your account")}</span></span>
        {session?.user ? <span className="shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">Connected</span> : !isPending && <Link href="/login" className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs transition hover:bg-white/[0.06]">Sign in</Link>}
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl px-1 py-2 text-xs text-white/40"><MonitorSmartphone className="size-4 shrink-0" /> Preferences use Fudge’s shared device setting, so the island can apply them right away.</div>
    </section>
  </div>;
}

function SettingRow({ title, detail, children, muted = false }: { title: string; detail: string; children: React.ReactNode; muted?: boolean }) {
  return <label className={`flex min-h-[68px] items-center justify-between gap-4 rounded-2xl border border-white/10 px-4 py-3 transition ${muted ? "opacity-45" : "hover:border-white/15"}`}><span><span className="block text-sm">{title}</span><span className="mt-1 block text-xs text-white/40">{detail}</span></span>{children}</label>;
}
