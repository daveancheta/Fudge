"use client";

import { useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowUp, AudioLines, Folder, Mic, Pause, Play, Search, Settings2, Signal, SkipBack, SkipForward, Volume2 } from "lucide-react";

type ChatLine = { from: "user" | "assistant"; text: string };
type IslandPosition = { left: number; top: number };
export default function AppPreview() {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [position, setPosition] = useState<IslandPosition | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; left: number; top: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && (target.closest("button, input") || (expanded && !target.closest("[data-drag-handle]")))) return;
    const stage = stageRef.current;
    if (!stage) return;
    const islandRect = event.currentTarget.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      left: islandRect.left - stageRect.left,
      top: islandRect.top - stageRect.top,
      dragging: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    const stage = stageRef.current;
    if (!start || !stage) return;
    if (!start.dragging) {
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 5) return;
      start.dragging = true;
    }
    const maxLeft = Math.max(0, stage.clientWidth - event.currentTarget.offsetWidth);
    const maxTop = Math.max(0, stage.clientHeight - event.currentTarget.offsetHeight);
    setPosition({
      left: Math.max(0, Math.min(maxLeft, start.left + event.clientX - start.x)),
      top: Math.max(0, Math.min(maxTop, start.top + event.clientY - start.y)),
    });
  }

  function endDrag() {
    suppressClick.current = dragStart.current?.dragging ?? false;
    dragStart.current = null;
    if (suppressClick.current) setTimeout(() => { suppressClick.current = false; }, 0);
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessages((current) => [...current, { from: "user", text }, { from: "assistant", text: "Got it. Let’s take it one step at a time." }]);
    setMessage("");
  }

  return (
    <section aria-labelledby="preview-title" className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-9 sm:pb-24">
      <audio ref={audioRef} src="/What%20If%20I%20Call%20(Merry%20Christmas,%20i%20miss%20you)%20-%20Alex%20Crichton.mp3" preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold tracking-[.18em] text-[#a8775c]">THE FUDGE DYNAMIC ISLAND</p>
          <h2 id="preview-title" className="mt-3 text-3xl font-medium tracking-[-.06em] sm:text-4xl">Meet the island.</h2>
        </div>
        <p className="max-w-sm text-[12px] leading-6 text-[#817a70]">Click the island to expand it. Chat and media controls are interactive in this preview.</p>
      </div>

      <div className="mx-auto max-w-[900px]">
        {/* Flat monitor illustration */}
        <div className="rounded-[20px] border-[5px] border-[#343330] bg-[#171716] p-[5px] shadow-[0_20px_55px_rgba(38,35,30,.2)] sm:rounded-[26px] sm:border-[7px] sm:p-[7px]">
          <div className="relative overflow-hidden rounded-[12px] bg-cover bg-center px-3 pb-7 pt-5 sm:rounded-[16px] sm:px-6 sm:pb-9 sm:pt-7 md:px-9" style={{ backgroundImage: "url('/wallpaper.jpg')" }}>
            <span aria-hidden="true" className="absolute left-1/2 top-2 size-1 -translate-x-1/2 rounded-full bg-[#58625c]/45 sm:top-2.5" />
            <div aria-hidden="true" className="absolute inset-0 opacity-[.12]" style={{ backgroundImage: "radial-gradient(#fff 0.7px, transparent 0.7px)", backgroundSize: "5px 5px" }} />
            <div ref={stageRef} className="relative mx-auto min-h-[350px] max-w-[730px] px-0 pb-4 sm:min-h-[460px] sm:px-4 sm:pb-3">
              <div
                aria-label={expanded ? "Expanded Dynamic Island preview" : "Collapsed Dynamic Island preview"}
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={() => {
                  if (expanded) return;
                  if (suppressClick.current) {
                    suppressClick.current = false;
                    return;
                  }
                  setPosition(null);
                  setExpanded(true);
                }}
                className={`absolute z-10 flex select-none flex-col overflow-hidden border border-white/[.11] bg-[#171615] text-[#f5f1e9] shadow-[0_20px_55px_rgba(25,23,20,.35)] ${expanded ? "" : "cursor-grab active:cursor-grabbing"}`}
                style={{
                  width: expanded ? "min(560px, 100%)" : "min(250px, 100%)",
                  height: expanded ? "min(360px, calc(100vw - 48px))" : 44,
                  left: position?.left ?? "50%",
                  top: position?.top ?? 12,
                  transform: position ? undefined : "translateX(-50%)",
                  borderRadius: expanded ? 32 : 9999,
                  transition: expanded
                    ? "width 280ms cubic-bezier(0.32,0.72,0,1), height 320ms 280ms cubic-bezier(0.32,0.72,0,1), border-radius 500ms cubic-bezier(0.32,0.72,0,1)"
                    : "height 280ms cubic-bezier(0.32,0.72,0,1), width 320ms 280ms cubic-bezier(0.32,0.72,0,1), border-radius 500ms cubic-bezier(0.32,0.72,0,1)",
                }}
              >
                {expanded ? (
                  <>
                    <header data-drag-handle className="flex shrink-0 cursor-grab items-center justify-between border-b border-white/[.08] px-4 py-3.5 active:cursor-grabbing sm:px-5">
                      <div className="flex items-center gap-3">
                        <img src="/icon.svg" alt="" width="32" height="32" className="size-8 rounded-[9px]" />
                        <span className="flex flex-col gap-0.5"><span className="text-[11px] font-semibold tracking-[.01em] text-white/90">Fudge</span></span>
                        <span className="flex items-center gap-1.5 rounded-full border border-[#d99476]/25 bg-[#d99476]/10 px-2 py-1 font-mono text-[9px] tabular-nums text-white/85"><span className="size-1.5 rounded-full bg-[#d99476]" /><span className="font-sans text-[8px] font-semibold tracking-wide text-[#e3a58a]">FOCUS</span>24:18</span>
                      </div>
                    </header>

                    <div className="mx-3 mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-white/[.06] bg-white/[.04] px-2 py-1.5">
                      <span aria-hidden="true" className="size-8 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: "url('/alex_crichton.jpg')" }} />
                      <span className="flex min-w-0 flex-col"><span className="truncate text-[11px] font-medium text-white/90">What If I Call (Merry Christmas, I Miss You)</span><span className="truncate text-[10px] text-white/50">Alex Crichton · Music</span></span>
                      <div className="ml-auto flex shrink-0 items-center gap-0.5">
                        <button type="button" aria-label="Previous track unavailable in preview" disabled className="grid size-6 place-items-center rounded-md text-white/25"><SkipBack aria-hidden="true" className="size-3" /></button>
                        <button type="button" aria-label={playing ? "Pause playback" : "Play preview song"} onClick={togglePlayback} className="grid size-6 place-items-center rounded-md text-white/75 transition hover:bg-white/10 hover:text-white">{playing ? <Pause aria-hidden="true" className="size-3" /> : <Play aria-hidden="true" className="size-3" />}</button>
                        <button type="button" aria-label="Next track unavailable in preview" disabled className="grid size-6 place-items-center rounded-md text-white/25"><SkipForward aria-hidden="true" className="size-3" /></button>
                      </div>
                      <span aria-hidden="true" className="ml-1 flex h-5 shrink-0 items-center gap-[2px] px-1">{["h-2", "h-4", "h-2.5", "h-5", "h-3", "h-4"].map((height, index) => <span key={index} className={`${playing ? "music-bar" : "music-bar-still"} w-[3px] rounded-full bg-[#d99476] ${height}`} style={{ animationDelay: `${index * 90}ms` }} />)}</span>
                    </div>

                    <ol aria-live="polite" className="scrollable-div flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto px-4 py-3 text-xs sm:px-5">
                      <li className="flex max-w-[92%] items-end self-start"><div className="rounded-2xl rounded-bl-md border border-white/[.08] bg-white/[.035] px-3.5 py-3 text-[11px] leading-[1.65] text-white/55"><p className="mb-1.5 text-[15px] font-medium tracking-[-.03em] text-white/90">What can I help with?</p>Ask a question, search the web, read your screen, or open an app like <span className="rounded-md bg-white/[.08] px-1 py-0.5 font-medium text-white/85">“open Chrome”</span>.</div></li>
                      {messages.map((item, index) => <li key={`${index}-${item.text}`} className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-[1.6] ${item.from === "user" ? "self-end rounded-br-md bg-[#d99476] text-[#211e1a]" : "self-start rounded-bl-md border border-white/[.08] bg-white/[.045] text-white/75"}`}>{item.text}</li>)}
                    </ol>

                    <form onSubmit={sendMessage} className="shrink-0 border-t border-white/[.08] px-3.5 pb-3 pt-2.5 sm:px-4">
                      <div className="flex items-center gap-2 rounded-xl border border-white/[.12] bg-[#211f1d] p-1.5 pl-3.5 focus-within:border-[#d99476]/60">
                        <input aria-label="Chat message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message Fudge…" className="h-8 min-w-0 flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-white/30" />
                        <button type="button" aria-label={listening ? "Stop voice preview" : "Start voice preview"} onClick={() => setListening((value) => !value)} className={`grid size-8 place-items-center rounded-lg transition ${listening ? "bg-[#d99476]/20 text-[#e3a58a]" : "text-white/45 hover:bg-white/[.08]"}`}><Mic aria-hidden="true" className="size-4" /></button>
                        <button type="submit" disabled={!message.trim()} aria-label="Send message" className="grid size-8 place-items-center rounded-lg bg-[#d99476] text-[#211e1a] transition hover:bg-[#e3a58a] disabled:bg-white/[.07] disabled:text-white/25"><ArrowUp aria-hidden="true" className="size-4" /></button>
                      </div>
                      <p className="mt-2 text-center text-[9px] text-white/25">{listening ? "Voice preview is listening" : "Try ‘open [app name]’ · ‘what can you do?’"}</p>
                    </form>

                    <button type="button" aria-label="Collapse Dynamic Island" title="Collapse" onClick={() => setExpanded(false)} className="absolute right-2 top-2 z-20 grid size-6 place-items-center rounded-full transition hover:bg-white/[.08] focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/60"><span aria-hidden="true" className="size-2 rounded-full bg-white" /></button>
                  </>
                ) : (
                  <div role="button" tabIndex={0} aria-label="Expand Dynamic Island" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPosition(null); setExpanded(true); } }} className="flex h-full w-full items-center justify-between gap-2 px-3 text-left">
                      <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true" className="flex h-5 shrink-0 items-center gap-[2px]">{["h-2", "h-4", "h-2.5", "h-5", "h-3", "h-4"].map((height, index) => <span key={index} className={`${playing ? "music-bar" : "music-bar-still"} w-[3px] rounded-full bg-[#d99476] ${height}`} style={{ animationDelay: `${index * 90}ms` }} />)}</span>
                      <span className="flex min-w-0 flex-col text-left"><span className="truncate text-[10px] font-medium text-white/90">What If I Call</span><span className="truncate text-[9px] text-white/45">Alex Crichton</span></span>
                    </span>
                    <span aria-hidden="true" className="size-8 shrink-0 rounded-full bg-cover bg-center" style={{ backgroundImage: "url('/alex_crichton.jpg')" }} />
                  </div>
                )}
              </div>
            </div>
            <div aria-label="Windows taskbar" className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center gap-1 border-t border-white/25 bg-[#f4f1eb]/55 px-2 backdrop-blur-md sm:h-9 sm:gap-1.5">
              <div aria-hidden="true" className="flex size-5 items-center justify-center rounded-md text-[#53677c] sm:size-6"><span className="grid grid-cols-2 gap-[2px]"><span className="size-1.5 rounded-[1px] bg-current sm:size-2" /><span className="size-1.5 rounded-[1px] bg-current sm:size-2" /><span className="size-1.5 rounded-[1px] bg-current sm:size-2" /><span className="size-1.5 rounded-[1px] bg-current sm:size-2" /></span></div>
              <div aria-hidden="true" className="flex h-5 w-[74px] items-center gap-1 rounded-full border border-[#8b948d]/20 bg-white/55 px-2 text-[#657068]/75 sm:h-6 sm:w-[112px] sm:gap-1.5"><Search className="size-2.5 sm:size-3" /><span className="text-[7px] sm:text-[8px]">Search</span></div>
              <span aria-hidden="true" className="grid size-5 place-items-center rounded-md text-[#607362] sm:size-6"><Folder className="size-3 sm:size-3.5" /></span>
              <span aria-hidden="true" className="grid size-5 place-items-center rounded-md bg-white/45 text-[#514c57] sm:size-6"><AudioLines className="size-3 sm:size-3.5" /></span>
              <div aria-hidden="true" className="absolute right-2 flex items-center gap-1 text-[#424840]/70 sm:right-3 sm:gap-1.5"><Signal className="size-2.5 sm:size-3" /><Volume2 className="size-2.5 sm:size-3" /><span className="hidden text-[7px] sm:inline sm:text-[8px]">10:24</span></div>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="mx-auto h-8 w-[12%] bg-[#d3d0c9] sm:h-11" />
        <div aria-hidden="true" className="mx-auto h-2 w-[24%] rounded-full bg-[#c4c1ba]" />
      </div>
      <p className="mt-4 text-right text-[9px] text-[#a19a90]">Illustrative monitor and interface preview. Controls are simulated here.</p>
    </section>
  );
}
