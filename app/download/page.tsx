import type { Metadata } from "next";
import { ArrowDownToLine, ArrowUpRight, AudioLines, Check, Download } from "lucide-react";
import DownloadIsland from "./download-island";

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
      <DownloadIsland />
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
        <a href="/login" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium text-[#777168] transition hover:bg-white/70 hover:text-[#28251f]">
          Sign in <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 pb-14 pt-8 text-center sm:px-9 sm:pb-20 sm:pt-12">
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
          Fudge brings your favorite apps and what’s playing into one quiet, useful spot on your desktop.
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

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-[#e7e0d7] px-5 py-5 text-[10px] text-[#a19a90] sm:px-9">
        <span>© {new Date().getFullYear()} Fudge</span>
        <span className="inline-flex items-center gap-1.5"><AudioLines aria-hidden="true" className="size-3.5" /> A little more in your flow</span>
      </footer>
    </main>
  );
}
