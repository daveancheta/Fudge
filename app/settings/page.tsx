"use client";

import { useEffect, useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import { createAuthClient } from "better-auth/react";
const authClient = createAuthClient();

const SETTINGS_STORAGE_KEY = "fudge-settings";
type FudgeSettings = { waveColor: string; randomWaveColor: boolean; animateWave: boolean };
const DEFAULT_SETTINGS: FudgeSettings = { waveColor: "#ff637d", randomWaveColor: true, animateWave: true };

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [accountMessage, setAccountMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const signIn = async () => {
    setAccountMessage("");
    setSigningIn(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/settings",
      });
      if (error) setAccountMessage(error.message || "Google sign-in failed.");
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    setAccountMessage("");
    setSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error) setAccountMessage(error.message || "Could not sign out.");
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  };

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
          <p className="mt-1 text-xs text-white/45">
            {sessionPending
              ? "Checking your account…"
              : session?.user
                ? "Your Fudge account"
                : "Sign in to use Fudge across your devices."}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          {sessionPending ? (
            <div role="status" aria-label="Loading account" className="flex items-center gap-3">
              <span className="size-11 shrink-0 animate-pulse rounded-full bg-white/10" />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="h-3 w-28 animate-pulse rounded bg-white/10" />
                <span className="h-2.5 w-40 max-w-full animate-pulse rounded bg-white/[0.06]" />
              </span>
              <span className="h-8 w-14 animate-pulse rounded-lg bg-white/[0.06]" />
              <span className="sr-only">Checking your sign-in status</span>
            </div>
          ) : session?.user ? (
            <div className="flex items-center gap-3">
              {session.user.image ? (
                // Google profile photos are external URLs, so use a regular img element.
                <img src={session.user.image} alt="" className="size-11 rounded-full bg-white/10 object-cover" />
              ) : (
                <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white/75">
                  {session.user.name?.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{session.user.name || "Signed in"}</span>
                <span className="block truncate text-xs text-white/45">{session.user.email}</span>
              </span>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="cursor-pointer rounded-lg px-3 py-2 text-xs text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-wait disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={signIn}
              disabled={signingIn}
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-wait disabled:opacity-60"
            >
              <GoogleMark />
              {signingIn ? "Connecting…" : "Continue with Google"}
            </button>
          )}
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
