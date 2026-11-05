import type { Metadata } from "next";
import { ArrowDownToLine, AudioLines, Check, Download, ArrowUpRight } from "lucide-react";
import AppPreview from "./app-preview";

export const metadata: Metadata = {
  title: "Download Fudge for Windows",
  description: "Download Fudge for Windows. Choose the recommended setup installer or the MSI package.",
};

const installers = [
  {
    name: "Fudge Setup",
    detail: "Recommended for most people",
    file: "fudge_0.1.0_x64-setup.exe",
    size: "10.94 MiB",
    href: "/downloads/fudge_0.1.0_x64-setup.exe",
    primary: true,
  },
  {
    name: "Windows Installer",
    detail: "MSI package",
    file: "fudge_0.1.0_x64_en-US.msi",
    size: "11.80 MiB",
    href: "/downloads/fudge_0.1.0_x64_en-US.msi",
    primary: false,
  },
];

export default function DownloadPage() {
  return (
    <main className="relative isolate flex h-dvh min-h-[560px] flex-col overflow-x-hidden overflow-y-auto bg-[#f7f5f0] text-[#27251f]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-52 size-[520px] rounded-full bg-[#f0e4d7]/60 blur-[100px]" />
        <div className="absolute -right-48 top-28 size-[540px] rounded-full bg-[#e7e9e4]/75 blur-[110px]" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-9 sm:py-7">
        <a href="/download" aria-label="Fudge downloads" className="group inline-flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[13px] bg-[#25231f] text-white shadow-[0_5px_15px_rgba(44,37,27,.13)] transition-transform group-hover:-rotate-6">
            <AudioLines className="size-[17px]" strokeWidth={2.2} />
          </span>
          <span className="text-[19px] font-semibold tracking-[-.055em]">fudge</span>
        </a>
        <nav aria-label="Page navigation" className="flex items-center gap-5 text-[12px] text-[#777168] sm:gap-7">
          <a href="#about" className="transition-colors hover:text-[#27251f]">About</a>
          <a href="#features" className="transition-colors hover:text-[#27251f]">Features</a>
          <a href="#download" className="inline-flex items-center gap-1.5 rounded-full bg-[#292722] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#514a41]">Get Fudge <ArrowUpRight aria-hidden="true" className="size-3.5" /></a>
        </nav>
      </header>

      <section id="download" className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-14 pt-8 text-center sm:px-9 sm:pb-20 sm:pt-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e8dfd4] bg-white/65 px-3.5 py-2 text-[10px] font-semibold tracking-[.14em] text-[#87796c] shadow-[0_3px_12px_rgba(74,55,30,.04)] backdrop-blur">
          <span className="size-1.5 rounded-full bg-[#88a27d]" />
          VERSION 0.1.0 <span className="text-[#d2c5b7]">/</span> WINDOWS
        </div>

        <h1 className="max-w-3xl text-[clamp(3.2rem,8vw,6.7rem)] font-medium leading-[.92] tracking-[-.078em] text-[#25231f]">
          A little more
          <br />
          in your <span className="italic text-[#b8785d]">flow.</span>
        </h1>
        <p className="mt-6 max-w-lg text-[14px] leading-7 text-[#777168] sm:text-[16px]">
          A small Windows companion for focus sessions, everyday questions, and the things you keep close while you work.
        </p>

        <div className="mt-11 grid w-full max-w-[760px] gap-3 text-left sm:mt-14 sm:grid-cols-2 sm:gap-4">
          {installers.map((installer) => (
            <article
              key={installer.file}
              className={`group relative flex min-h-[230px] flex-col rounded-[24px] border p-5 shadow-[0_16px_50px_rgba(54,43,29,.06)] backdrop-blur sm:p-6 ${installer.primary
                ? "border-[#2c2924] bg-[#292722] text-white shadow-[0_22px_60px_rgba(44,37,27,.16)]"
                : "border-white/90 bg-[#fffdf9]/80 text-[#292722]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-semibold tracking-[-.03em]">{installer.name}</h2>
                  <p className={`mt-1 text-[11px] ${installer.primary ? "text-white/45" : "text-[#928b81]"}`}>{installer.detail}</p>
                </div>
                <span className={`grid size-10 place-items-center rounded-[14px] ${installer.primary ? "bg-white/10 text-[#efc5a7]" : "bg-[#f3ece3] text-[#a8775c]"}`}>
                  {installer.primary ? <Download aria-hidden="true" className="size-[18px]" /> : <ArrowDownToLine aria-hidden="true" className="size-[18px]" />}
                </span>
              </div>

              <div className={`mt-6 flex items-center gap-2 border-t pt-4 text-[10px] ${installer.primary ? "border-white/10 text-white/40" : "border-[#eee8df] text-[#948d83]"}`}>
                <span className="rounded-md bg-black/[.04] px-2 py-1 font-medium">{installer.file.endsWith(".exe") ? "EXE" : "MSI"}</span>
                <span>{installer.size}</span>
                <span className="ml-auto">Windows · x64</span>
              </div>

              <a
                href={installer.href}
                download={installer.file}
                className={`mt-auto flex h-12 items-center justify-center gap-2 rounded-[14px] text-[12px] font-semibold transition duration-200 hover:-translate-y-0.5 ${installer.primary
                  ? "bg-[#f4e8dc] text-[#2b2823] shadow-[0_5px_18px_rgba(0,0,0,.12)] hover:bg-white"
                  : "border border-[#e7dfd4] bg-white text-[#38342e] hover:border-[#d5c5b4] hover:bg-[#fffaf4]"
                }`}
              >
                <Download aria-hidden="true" className="size-4" />
                Download {installer.primary ? "Setup" : "MSI"}
              </a>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-[#928b81]">
          <span className="inline-flex items-center gap-1.5"><Check aria-hidden="true" className="size-3.5 text-[#829778]" /> Two installer formats</span>
          <span className="hidden size-1 rounded-full bg-[#d4c9bc] sm:block" />
          <span>Choose the setup file for a guided install</span>
        </div>
      </section>

      <AppPreview />

      <section id="about" className="border-y border-[#e8e1d8] bg-[#efe9df] px-5 py-16 sm:px-9 sm:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[.8fr_1.2fr] md:gap-16">
          <div>
            <p className="text-[10px] font-semibold tracking-[.18em] text-[#a8775c]">A DESKTOP FOCUS COMPANION</p>
            <h2 className="mt-4 text-4xl font-medium leading-[1.02] tracking-[-.065em] sm:text-5xl">What is Fudge?</h2>
          </div>
          <div className="max-w-2xl text-[14px] leading-7 text-[#777168] sm:text-[15px]">
            <p>Fudge is a Windows desktop companion built around one simple idea: make it easier to return to what you meant to be doing. It lives in a small island above your other windows, ready when you need it.</p>
            <p className="mt-4">Focus Mode is the heart of Fudge. Set a task, get a short plan, and work at your own pace. If you opt in, Fudge can check camera and shared-screen snapshots for clear signs of distraction and offer a gentle reminder. You choose when to begin and end, and whether to share your screen.</p>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-9 sm:py-24">
        <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-end md:gap-16">
          <div>
            <p className="text-[10px] font-semibold tracking-[.18em] text-[#a8775c]">THE TOOLKIT</p>
            <h2 className="mt-4 max-w-md text-4xl font-medium leading-[1.02] tracking-[-.065em] sm:text-5xl">A little structure.<br />A lot more room.</h2>
          </div>
          <p className="max-w-xl pb-1 text-[14px] leading-7 text-[#777168]">Focus is the main event. The rest of Fudge stays nearby for the small things that help your day move along.</p>
        </div>

        <div className="mt-10 overflow-hidden rounded-[28px] bg-[#292722] text-white sm:mt-14">
          <div className="grid md:grid-cols-[.78fr_1.22fr]">
            <div className="flex flex-col justify-between border-b border-white/10 p-6 sm:p-9 md:border-b-0 md:border-r">
              <span className="text-[10px] font-semibold tracking-[.16em] text-[#d9aa8e]">01 / FOCUS MODE</span>
              <div className="mt-12 md:mt-24">
                <h3 className="max-w-sm text-3xl font-medium leading-tight tracking-[-.055em] sm:text-4xl">Make space for one thing.</h3>
                <p className="mt-4 max-w-sm text-[13px] leading-6 text-white/55">Choose a task and Fudge helps you hold onto it, without turning your work into a dashboard.</p>
              </div>
            </div>
            <ol className="divide-y divide-white/10 px-6 sm:px-9">
              {[
                ["Set a clear task", "Fudge checks that your focus task is specific, then helps turn it into a short plan."],
                ["Stay gently accountable", "The session timer stays in the island. If you opt in, camera and screen snapshots can inform occasional distraction reminders."],
                ["Choose your level of sharing", "Camera checks run during a session. Screen checks are optional, use the Windows picker, and can be ended at any time."],
              ].map(([title, text], index) => (
                <li key={title} className="grid gap-2 py-6 sm:grid-cols-[34px_1fr] sm:gap-4 sm:py-7">
                  <span className="pt-0.5 font-mono text-[11px] text-[#d9aa8e]">0{index + 1}</span>
                  <div><h4 className="text-[14px] font-medium">{title}</h4><p className="mt-1.5 max-w-lg text-[12px] leading-6 text-white/50">{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-[10px] font-semibold tracking-[.16em] text-[#a8775c]">02 / TALK IT THROUGH</p>
            <ul className="mt-5 divide-y divide-[#e7e0d7] border-y border-[#e7e0d7]">
              {[
                ["Voice and chat", "Speak with push-to-talk or type; turn spoken replies on in Settings."],
                ["Questions and web search", "Ask general questions or search the web, including current news."],
                ["Read a selected screen", "Request a one-time screen reading using the Windows system picker."],
              ].map(([title, text]) => <li key={title} className="py-4"><h3 className="text-[13px] font-semibold">{title}</h3><p className="mt-1 text-[12px] leading-5 text-[#817a70]">{text}</p></li>)}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-[.16em] text-[#a8775c]">03 / KEEP IT CLOSE</p>
            <ul className="mt-5 divide-y divide-[#e7e0d7] border-y border-[#e7e0d7]">
              {[
                ["Task visuals", "Generate a wordless image related to your focus task, with a short spoken cue."],
                ["App shortcuts", "Find installed Windows apps, then ask Fudge to open or close one."],
                ["Media controls", "See supported Windows media sessions and adjust the music visualizer in Settings."],
              ].map(([title, text]) => <li key={title} className="py-4"><h3 className="text-[13px] font-semibold">{title}</h3><p className="mt-1 text-[12px] leading-5 text-[#817a70]">{text}</p></li>)}
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-3xl border-t border-[#e7e0d7] pt-5 text-center text-[11px] leading-6 text-[#9a9388]">Fudge is a lightweight focus aid, not a medical tool, time tracker, or employee monitoring system. Focus checks depend on permissions, camera availability, internet access, and the hosted AI service.</p>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-[#e7e0d7] px-5 py-5 text-[10px] text-[#a19a90] sm:px-9">
        <span>© {new Date().getFullYear()} Fudge</span>
        <span className="inline-flex items-center gap-1.5"><AudioLines aria-hidden="true" className="size-3.5" /> A little more in your flow</span>
      </footer>
    </main>
  );
}
