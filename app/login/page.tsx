"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ArrowUpRight, AudioLines } from "lucide-react";

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

export default function LoginPage() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const signInWithGoogle = async () => {
    setSigningIn(true);
    setError("");
    try {
      const { error: authError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/web/chat",
      });
      if (authError) setError(authError.message || "Google sign-in couldn’t start. Please try again.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in couldn’t start. Please try again.");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <main className="login-shell relative flex h-dvh min-h-0 touch-pan-y flex-col overflow-x-hidden px-5 py-5 text-[#24221f] sm:px-10 sm:py-8 lg:px-[5.3vw]">
      <div aria-hidden="true" className="login-glow login-glow-one" />
      <div aria-hidden="true" className="login-glow login-glow-two" />

      <header className="relative z-10 flex items-center justify-between">
        <a href="/login" aria-label="Fudge home" className="group inline-flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[13px] bg-[#25231f] text-white shadow-[0_5px_15px_rgba(44,37,27,.13)] transition-transform group-hover:-rotate-6">
            <AudioLines className="size-[17px]" strokeWidth={2.2} />
          </span>
          <span className="text-[19px] font-semibold tracking-[-0.055em]">fudge</span>
        </a>
        <div className="flex items-center gap-2 sm:gap-5">
          <span className="hidden text-[11px] font-medium tracking-[.16em] text-[#89847d] md:block">A LITTLE MORE IN YOUR FLOW</span>
          <a href="/download" className="inline-flex items-center gap-1.5 rounded-full border border-[#e8dfd4] bg-white/65 px-3 py-2 text-[10px] font-semibold text-[#625a50] transition hover:border-[#d5c5b4] hover:bg-white sm:px-3.5 sm:text-[11px]">
            Download app <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1160px] flex-1 items-center gap-14 py-14 lg:grid-cols-[1.07fr_.93fr] lg:gap-20 lg:py-10">
        <div className="mx-auto w-full max-w-[520px] lg:mx-0">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e9dfd1] bg-white/55 px-3.5 py-2 text-[11px] font-medium tracking-[.08em] text-[#6e675c] shadow-[0_3px_12px_rgba(74,55,30,.04)] backdrop-blur">
            <AudioLines className="size-[17px]" strokeWidth={2.2} />
            YOUR DESKTOP, WITH A LITTLE MAGIC
          </div>
          <h1 className="max-w-[540px] text-[clamp(3.4rem,7vw,6.25rem)] font-medium leading-[.91] tracking-[-.075em] text-[#25231f]">
            Make room
            <br />
            for your <span className="login-italic">flow.</span>
          </h1>
          <p className="mt-7 max-w-[390px] text-[15px] leading-7 text-[#777168] sm:text-[16px]">
            Control your device with a few simple words. Open apps, see what’s playing, and keep everyday tasks moving—all from the top of your screen.
          </p>

          <div className="relative mt-12 h-[180px] max-w-[420px]">
            <div className="login-orbit login-orbit-one" />
            <div className="login-orbit login-orbit-two" />
            <div className="relative mx-auto flex h-[124px] w-[238px] items-center justify-center rounded-[38px] border border-white/80 bg-[#171715] shadow-[0_26px_65px_rgba(48,38,26,.2),inset_0_1px_1px_rgba(255,255,255,.13)]">
              <div className="absolute left-5 flex items-center gap-[3px]" aria-hidden="true">
                {[14, 22, 17, 26, 18].map((height, index) => (
                  <span key={index} className="w-[3px] rounded-full bg-[#fd7894]" style={{ height }} />
                ))}
              </div>
              <div className="flex flex-col items-center text-white">
                <span className="text-[12px] font-medium tracking-[-.02em]">just the right amount</span>
                <span className="mt-1 text-[10px] text-white/40">of everything</span>
              </div>
              <div className="absolute right-4 size-9 rounded-[12px] border border-white/10 bg-[linear-gradient(145deg,#f2a777,#d96178_55%,#8f528d)] shadow-[0_4px_12px_rgba(0,0,0,.25)]" />
              <span className="absolute -bottom-2 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-[#fd7894]/70 blur-[4px]" />
            </div>
            <div className="absolute -right-2 top-0 flex -rotate-3 items-center gap-2.5 rounded-2xl border border-white/80 bg-[#fffdf9] px-3.5 py-3 shadow-[0_12px_34px_rgba(57,42,24,.11)] sm:right-1">
              <span className="grid size-8 place-items-center rounded-xl bg-[#f7ebdf] text-[#bd7958]"><AudioLines className="size-4" /></span>
              <span className="pr-1"><span className="block text-[10px] font-semibold text-[#3b3935]">Good things</span><span className="mt-0.5 block text-[9px] text-[#9d978d]">On repeat · 3:42</span></span>
            </div>
            <div className="absolute -bottom-7 left-0 flex rotate-2 items-center gap-2 rounded-full border border-white/80 bg-[#fffdf9] px-3 py-2 shadow-[0_10px_25px_rgba(57,42,24,.08)] sm:left-2">
              <span className="size-1.5 rounded-full bg-[#83a780]" />
              <span className="text-[9px] font-medium text-[#777168]">A calmer way to get things done</span>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[410px] lg:mr-0">
          <div className="login-card relative overflow-hidden rounded-[30px] border border-white/80 bg-[#fffdf9]/80 p-7 shadow-[0_30px_90px_rgba(76,58,34,.12)] backdrop-blur-xl sm:p-10">
            <div aria-hidden="true" className="absolute -right-16 -top-20 size-48 rounded-full bg-[#f8e8d8]/75 blur-[44px]" />
            <div className="relative">
              <p className="text-[10px] font-semibold tracking-[.19em] text-[#b18468]">WELCOME TO FUDGE</p>
              <h2 className="mt-4 text-[32px] font-medium tracking-[-.055em] text-[#292722]">Find your flow.</h2>
              <p className="mt-2 text-[13px] leading-6 text-[#89847b]">Sign in to make your desktop feel a little more like yours.</p>

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={signingIn}
                className="group mt-8 flex h-[54px] w-full cursor-pointer items-center justify-center gap-3 rounded-[15px] border border-[#e8e3dc] bg-white px-5 text-[13px] font-semibold text-[#33312d] shadow-[0_2px_4px_rgba(42,35,26,.03)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d7c9b9] hover:shadow-[0_8px_20px_rgba(54,43,29,.09)] disabled:cursor-wait disabled:opacity-65"
              >
                <GoogleMark />
                <span>{signingIn ? "Connecting to Google…" : "Continue with Google"}</span>
                {!signingIn && <ArrowUpRight aria-hidden="true" className="ml-auto size-4 text-[#aaa39a] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
              </button>
              {error && <p role="alert" className="mt-3 text-center text-xs text-[#b54747]">{error}</p>}

              <p className="mt-6 text-center text-[11px] leading-5 text-[#9a958d]">
                By continuing, you agree to our <a href="#terms" className="text-[#665f55] underline decoration-[#d9d0c5] underline-offset-2 hover:text-[#292722]">Terms</a> and <a href="#privacy" className="text-[#665f55] underline decoration-[#d9d0c5] underline-offset-2 hover:text-[#292722]">Privacy Policy</a>.
              </p>
              <div className="my-8 h-px bg-[#eee9e2]" />
              <div className="flex items-center justify-center gap-2.5 text-[11px] text-[#8d887f]">
                <span className="flex -space-x-1.5" aria-hidden="true">
                  <span className="size-5 rounded-full border-2 border-[#fffdf9] bg-[#e9b99e]" />
                  <span className="size-5 rounded-full border-2 border-[#fffdf9] bg-[#aab9a1]" />
                  <span className="size-5 rounded-full border-2 border-[#fffdf9] bg-[#d9b9c3]" />
                </span>
                <span>A little corner of calm, made for you.</span>
              </div>
            </div>
          </div>
          <p className="mt-5 text-center text-[10px] tracking-[.04em] text-[#a29b91]">SIMPLE TO START. LOVELY TO LIVE WITH.</p>
        </div>
      </section>

      <footer className="relative z-10 flex items-center justify-between border-t border-[#e4ddd2]/75 pt-4 text-[10px] text-[#9c958b]">
        <span>© 2026 Fudge</span>
        <span className="hidden sm:block">A softer landing for your day.</span>
      </footer>
    </main>
  );
}
