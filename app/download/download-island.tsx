"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, AudioLines } from 'lucide-react';

export default function DownloadIsland() {
  const [expanded, setExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [message, setMessage] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pointerStart = useRef<{ x: number; y: number; left: number; top: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const chatListRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = chatListRef.current;
    if (expanded && list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [expanded, sentMessages]);

  return (
    <div
      aria-label="Draggable Dynamic Island preview"
      className={`fixed z-50 touch-none ${expanded ? "cursor-default" : "cursor-pointer"} select-none`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if (event.target instanceof Element && event.target.closest("input, button")) return;
        const rect = event.currentTarget.getBoundingClientRect();
        pointerStart.current = {
          x: event.clientX,
          y: event.clientY,
          left: rect.left,
          top: rect.top,
          dragging: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setPosition({ left: rect.left, top: rect.top });
      }}
      onPointerMove={(event) => {
        const start = pointerStart.current;
        if (!start) return;
        if (!start.dragging) {
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 7) return;
          start.dragging = true;
        }
        const width = event.currentTarget.offsetWidth;
        const height = event.currentTarget.offsetHeight;
        setPosition({
          left: Math.max(8, Math.min(window.innerWidth - width - 8, start.left + event.clientX - start.x)),
          top: Math.max(8, Math.min(window.innerHeight - height - 8, start.top + event.clientY - start.y)),
        });
      }}
      onPointerUp={() => {
        suppressClick.current = pointerStart.current?.dragging ?? false;
        pointerStart.current = null;
        if (suppressClick.current) setTimeout(() => { suppressClick.current = false; }, 0);
      }}
      onPointerCancel={() => {
        pointerStart.current = null;
        suppressClick.current = true;
        setTimeout(() => { suppressClick.current = false; }, 0);
      }}
      onClick={() => {
        if (expanded || suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        setExpanded(true);
      }}
      style={{
        left: position?.left ?? "50%",
        top: position?.top ?? 10,
        transform: position ? undefined : "translateX(-50%)",
      }}
    >
      <audio
        ref={audioRef}
        src="/What%20If%20I%20Call%20(Merry%20Christmas,%20i%20miss%20you)%20-%20Alex%20Crichton.mp3"
        autoPlay
        loop
        preload="metadata"
        onCanPlay={() => {
          void audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <div
        aria-label="Dynamic Island"
        className="relative flex flex-col overflow-hidden border border-white/[0.11] bg-[#171615] text-white shadow-[0_16px_50px_rgba(30,25,19,.25)]"
        style={{
          width: expanded ? "min(560px, calc(100vw - 24px))" : 250,
          height: expanded ? "min(360px, calc(100dvh - 24px))" : 44,
          borderRadius: expanded ? 32 : 9999,
          transition: expanded
            ? "width 280ms cubic-bezier(0.32,0.72,0,1), height 320ms 280ms cubic-bezier(0.32,0.72,0,1), border-radius 500ms cubic-bezier(0.32,0.72,0,1)"
            : "height 280ms cubic-bezier(0.32,0.72,0,1), width 320ms 280ms cubic-bezier(0.32,0.72,0,1), border-radius 500ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {expanded ? (
          <>
            <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-2.5">
                  <div className="relative z-10 flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-[13px] bg-white text-[#25231f] shadow-[0_5px_15px_rgba(44,37,27,.13)] transition-transform group-hover:-rotate-6">
                    <AudioLines className="size-[17px]" strokeWidth={2.2} />
                  </span>
                </div>
                <span className="flex flex-col">
                  <span className="text-xs font-semibold tracking-wide text-white/95">Fudge assistant</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/40">
                    <span className="size-1.5 rounded-full bg-emerald-400" /> Ready to help
                  </span>
                </span>
              </div>
            </header>
            <p className="mx-3 mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-2 py-1.5">
              <span aria-hidden="true" className="size-8 shrink-0 rounded-lg border border-white/10 bg-cover bg-center" style={{ backgroundImage: "url('/alex_crichton.jpg')" }} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[11px] font-medium text-white/90">What If I Call (Merry Christmas, i miss you)</span>
                <span className="truncate text-[10px] text-white/50">Alex Crichton</span>
              </span>
              <span aria-hidden="true" className="ml-auto flex h-5 shrink-0 items-center gap-[2px] px-1">
                {["h-2", "h-4", "h-2.5", "h-5", "h-3", "h-4"].map((height, index) => (
                  <span key={index} className={`${isPlaying ? "music-bar" : "music-bar-still"} w-[3px] rounded-full bg-[#ff637d] ${height}`} style={{ animationDelay: `${index * 90}ms`, animationDuration: `${560 + (index % 3) * 130}ms` }} />
                ))}
              </span>
            </p>
            <ol ref={chatListRef} aria-live="polite" className="flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto px-4 py-4 text-xs scrollable-div">
              <li className="flex max-w-[92%] items-end gap-2 self-start">
                <div className="rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.055] px-3.5 py-2.5 text-[11px] leading-[1.65] text-white/65">
                  <p className="mb-1 font-medium text-white/90">Hey, I’m Fudge.</p>
                  I can open apps on your computer. Try <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-medium text-white/85">&quot;open Chrome&quot;</span> or ask what I can open.
                </div>
              </li>
              {sentMessages.map((sentMessage, index) => (
                <li key={`${index}-${sentMessage}`} className="max-w-[86%] self-end rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-[11px] leading-[1.6] text-black shadow-[0_4px_16px_rgba(255,99,125,0.18)]">
                  {sentMessage}
                </li>
              ))}
            </ol>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = message.trim();
                if (!trimmed) return;
                setSentMessages((messages) => [...messages, trimmed]);
                setMessage("");
              }}
              className="shrink-0 border-t border-white/[0.08] bg-white/[0.015] px-3 pb-3 pt-2.5"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.045] p-1.5 pl-3 focus-within:border-white/20 focus-within:bg-white/[0.06]">
                <input
                  aria-label="Chat message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask Fudge or try ‘open Chrome’..."
                  className="h-8 min-w-0 flex-1 bg-transparent px-0 text-[11px] text-white outline-none placeholder:text-white/35"
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  aria-label="Send command"
                  className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-black transition hover:bg-white/85 disabled:bg-white/10 disabled:text-white/30"
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[9px] text-white/25">Try &quot;open [app name]&quot; · &quot;what apps can you open?&quot;</p>
            </form>
          </>
        ) : (
          <p aria-label="Now playing What If I Call by Alex Crichton" className="flex h-full items-center justify-between gap-2 px-3">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="flex h-5 shrink-0 items-center gap-[2px]">
                {["h-2", "h-4", "h-2.5", "h-5", "h-3", "h-4"].map((height, index) => (
                  <span key={index} className={`${isPlaying ? "music-bar" : "music-bar-still"} w-[3px] rounded-full bg-[#ff637d] ${height}`} style={{ animationDelay: `${index * 90}ms`, animationDuration: `${560 + (index % 3) * 130}ms` }} />
                ))}
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate text-[10px] font-medium text-white/90">What If I Call</span>
                <span className="truncate text-[9px] text-white/45">Alex Crichton</span>
              </span>
            </span>
            <span aria-hidden="true" className="size-8 shrink-0 rounded-full border border-white/10 bg-cover bg-center" style={{ backgroundImage: "url('/alex_crichton.jpg')" }} />
          </p>
        )}
        {expanded && <button
          type="button"
          aria-label={expanded ? "Collapse Dynamic Island" : "Expand Dynamic Island"}
          title={expanded ? "Collapse" : "Open"}
          onClick={() => setExpanded((current) => !current)}
          className="absolute z-20 flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent transition-[left,top] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/60"
          style={{
            left: expanded ? "calc(min(560px, 100vw - 24px) - 36px)" : 112,
            top: expanded ? 8 : 10,
          }}
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-white" />
        </button>}
      </div>
    </div>
  );
}
