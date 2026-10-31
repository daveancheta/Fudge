"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  getCurrentWindow,
  primaryMonitor,
  LogicalSize,
  LogicalPosition,
} from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useFudgeSettings } from "@/lib/use-fudge-settings";
import { useSyncedChat, type SyncedChatMessage } from "@/lib/use-synced-chat";
import { redirect } from "next/navigation";

const COLLAPSED = { w: 180, h: 36 };
const PLAYING = { w: 250, h: 44 };
const EXPANDED = { w: 560, h: 360 };
const TOP_MARGIN = 6;
const POSITION_STORAGE_KEY = "fudge-island-position";
type InstalledApp = { id: string; name: string };
type MediaPlayback = {
  title: string;
  artist: string;
  artwork: string | null;
  sourceId: string;
  appName: string;
  isPlaying: boolean;
  canPlay: boolean;
  canPause: boolean;
  canSkipPrevious: boolean;
  canSkipNext: boolean;
};

type SavedPosition = { centerX: number; topY: number };


function getSavedPosition(): SavedPosition | null {
  try {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!saved) return null;
    const position = JSON.parse(saved) as SavedPosition;
    return Number.isFinite(position.centerX) && Number.isFinite(position.topY) ? position : null;
  } catch {
    return null;
  }
}

async function placeWindow(w: number, h: number) {
  const win = getCurrentWindow();
  const monitor = await primaryMonitor();
  if (!monitor) return;
  const scale = monitor.scaleFactor;
  const screenW = monitor.size.width / scale;
  const saved = getSavedPosition();
  const x = saved ? saved.centerX - w / 2 : monitor.position.x / scale + (screenW - w) / 2;
  const y = saved?.topY ?? monitor.position.y / scale + TOP_MARGIN;
  await win.setSize(new LogicalSize(w, h));
  await win.setPosition(new LogicalPosition(x, y));
}

if (process.env.SYSTEM === "website") {
  redirect("/download")
}

export default function Island() {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [mediaPlayback, setMediaPlayback] = useState<MediaPlayback | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandedRef = useRef(false);
  const mediaPointer = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const suppressMediaClick = useRef(false);
  const chatListRef = useRef<HTMLOListElement>(null);
  const remoteCommandHandler = useRef<(message: SyncedChatMessage) => void>(() => undefined);
  const { data: session } = authClient.useSession();
  const { settings } = useFudgeSettings(session?.user?.id);
  const { messages: sentMessages, addMessage } = useSyncedChat(
    session?.user?.id,
    (incoming) => remoteCommandHandler.current(incoming),
  );
  const waveColor = mediaPlayback && settings.randomWaveColor
    ? `hsl(${trackHue(`${mediaPlayback.title}:${mediaPlayback.artist}`)} 90% 65%)`
    : settings.waveColor;

  useEffect(() => {
    const list = chatListRef.current;
    if (expanded && list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [expanded, sentMessages]);


  useEffect(() => {
    void placeWindow(COLLAPSED.w, COLLAPSED.h);
    const win = getCurrentWindow();
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void win.onMoved(({ payload }) => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const [size, scale] = await Promise.all([win.outerSize(), win.scaleFactor()]);
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({
            centerX: (payload.x + size.width / 2) / scale,
            topY: payload.y / scale,
          } satisfies SavedPosition));
        } catch {
          // Keep the island usable if position persistence is unavailable.
        }
      }, 120);
    }).then((stopListening) => {
      if (disposed) stopListening();
      else unlisten = stopListening;
    });

    invoke<InstalledApp[]>("list_installed_apps")
      .then(setInstalledApps)
      .catch(() => setInstalledApps([]));

    return () => {
      disposed = true;
      if (saveTimer) clearTimeout(saveTimer);
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refreshPlayback = async () => {
      try {
        const next = await invoke<MediaPlayback | null>("get_media_playback");
        if (!active) return;
        setMediaPlayback((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
      } catch {
        if (active) setMediaPlayback(null);
      }
    };

    void refreshPlayback();
    const interval = setInterval(refreshPlayback, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (expandedRef.current) return;
    const size = mediaPlayback ? PLAYING : COLLAPSED;
    void placeWindow(size.w, size.h);
  }, [mediaPlayback]);

  const expand = async () => {
    if (timer.current) clearTimeout(timer.current);
    expandedRef.current = true;
    setExpanded(true);
    await placeWindow(EXPANDED.w, EXPANDED.h);
  };

  const collapse = () => {
    setExpanded(false);
    timer.current = setTimeout(() => {
      expandedRef.current = false;
      const size = mediaPlayback ? PLAYING : COLLAPSED;
      void placeWindow(size.w, size.h);
    }, 450);
  };

  const compactSize = mediaPlayback ? PLAYING : COLLAPSED;

  const controlMedia = async (action: "previous" | "playPause" | "next") => {
    if (!mediaPlayback) return;
    try {
      await invoke("control_media_session", { sourceId: mediaPlayback.sourceId, action });
      const next = await invoke<MediaPlayback | null>("get_media_playback");
      setMediaPlayback(next);
    } catch (error) {
      console.error("Could not control media playback:", error);
    }
  };

  const executeDesktopCommand = useCallback(async (trimmedMessage: string) => {
    if (/^(?:please\s+)?(?:open|show|launch)\s+fudge\s+settings[.!?]*$/i.test(trimmedMessage)) {
      try {
        await invoke("open_settings");
        addMessage("Opening Fudge settings.", "assistant");
      } catch (error) {
        addMessage(String(error), "assistant");
      }
      return true;
    }

    const listRequest = /^(?:what|which|list)\s+(?:apps|applications)(?:\s+can\s+you\s+open)?[?!.]*$/i.test(trimmedMessage);
    if (listRequest) {
      const appNames = installedApps.map((app) => app.name).slice(0, 12);
      const response = appNames.length
        ? `I can open: ${appNames.join(", ")}${installedApps.length > appNames.length ? ", and more" : ""}.`
        : "I couldn't load the installed app list. Try restarting the island.";
      addMessage(response, "assistant");
      return true;
    }

    const normalize = (name: string) => name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const findInstalledApps = (name: string) => {
      const requestedName = normalize(name);
      const exactMatches = installedApps.filter((app) => normalize(app.name) === requestedName);
      return exactMatches.length
        ? exactMatches
        : installedApps.filter((app) => normalize(app.name).includes(requestedName));
    };

    const closeCommand = trimmedMessage.match(/^(?:please\s+)?(?:close|quit|exit|stop)\s+(?:the\s+)?(.+?)[.!?]*$/i);
    const openCommand = trimmedMessage.match(/^(?:please\s+)?(?:open|launch|start)\s+(?:the\s+)?(.+?)[.!?]*$/i);
    const command = closeCommand ?? openCommand;
    if (!command) return false;

    const matches = findInstalledApps(command[1]);
    if (!matches.length) {
      addMessage(installedApps.length
        ? `I couldn't find an installed app named "${command[1]}". Try "what apps can you open?".`
        : "I couldn't load the installed app list. Try restarting the island.", "assistant");
      return true;
    }
    if (matches.length > 1) {
      addMessage(`I found several matches: ${matches.slice(0, 5).map((app) => app.name).join(", ")}. Use a more specific name.`, "assistant");
      return true;
    }

    try {
      const response = await invoke<string>(closeCommand ? "close_installed_app" : "launch_installed_app", { appId: matches[0].id });
      addMessage(response, "assistant");
    } catch (error) {
      addMessage(String(error), "assistant");
    }
    return true;
  }, [addMessage, installedApps]);

  useEffect(() => {
    remoteCommandHandler.current = (incoming) => {
      if (incoming.from === "user" && incoming.source === "web") {
        void executeDesktopCommand(incoming.text);
      }
    };
  }, [executeDesktopCommand]);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    addMessage(trimmedMessage, "user", "island");
    setMessage("");
    await executeDesktopCommand(trimmedMessage);
  };

  return (
    <main className="flex h-screen w-screen justify-center">
      <section
        aria-label={expanded ? "Dynamic Island" : "Expand Dynamic Island"}
        role={expanded ? "region" : "button"}
        tabIndex={expanded ? undefined : 0}
        className={`relative flex shrink-0 flex-col overflow-hidden border border-white/[0.11] bg-[#171615] text-[#f5f1e9] ${expanded ? "cursor-move" : "cursor-pointer"}`}
      
      
        style={{
          width: expanded ? EXPANDED.w : compactSize.w,
          height: expanded ? EXPANDED.h : compactSize.h,
          borderRadius: expanded ? 32 : 9999,
          transition: expanded
            ? "width 280ms cubic-bezier(0.32,0.72,0,1), height 320ms 280ms cubic-bezier(0.32,0.72,0,1), border-radius 500ms cubic-bezier(0.32,0.72,0,1)"
            : "height 280ms cubic-bezier(0.32,0.72,0,1), width 320ms 280ms cubic-bezier(0.32,0.72,0,1), border-radius 500ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {expanded ? (
          <>
            <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
              <div className="flex items-center gap-3">
                <img src="/icon.svg" alt="" width="32" height="32" className="size-8 rounded-[9px]" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold tracking-[.01em] text-white/90">Fudge</span>
                </span>
              </div>
            </header>

            {mediaPlayback && (
              <div className="mx-3 mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-2 py-1.5">
                <span
                  aria-hidden="true"
                  className="size-8 shrink-0 rounded-lg bg-white/10 bg-cover bg-center"
                  style={mediaPlayback.artwork ? { backgroundImage: `url(${mediaPlayback.artwork})` } : undefined}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[11px] font-medium text-white/90">{mediaPlayback.title}</span>
                  <span className="truncate text-[10px] text-white/50">{mediaPlayback.artist} · {mediaPlayback.appName}</span>
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-0.5">
                  <MediaControlButton label="Previous track" disabled={!mediaPlayback.canSkipPrevious} onClick={() => void controlMedia("previous")}>
                    <SkipBack aria-hidden="true" className="size-3" />
                  </MediaControlButton>
                  <MediaControlButton label={mediaPlayback.isPlaying ? "Pause playback" : "Resume playback"} disabled={mediaPlayback.isPlaying ? !mediaPlayback.canPause : !mediaPlayback.canPlay} onClick={() => void controlMedia("playPause")}>
                    {mediaPlayback.isPlaying ? <Pause aria-hidden="true" className="size-3" /> : <Play aria-hidden="true" className="size-3" />}
                  </MediaControlButton>
                  <MediaControlButton label="Next track" disabled={!mediaPlayback.canSkipNext} onClick={() => void controlMedia("next")}>
                    <SkipForward aria-hidden="true" className="size-3" />
                  </MediaControlButton>
                </div>
                <span aria-hidden="true" className="flex h-5 shrink-0 items-center gap-[2px] px-1">
                  {["h-2", "h-4", "h-2.5", "h-5", "h-3", "h-4"].map((height, index) => (
                    <span
                      key={index}
                      className={`${mediaPlayback.isPlaying && settings.animateWave ? "music-bar" : "music-bar-still"} w-[3px] rounded-full ${height}`}
                      style={{
                        backgroundColor: waveColor,
                        animationDelay: `${index * 90}ms`,
                        animationDuration: `${560 + (index % 3) * 130}ms`,
                      }}
                    />
                  ))}
                </span>
              </div>
            )}

            <ol ref={chatListRef} aria-live="polite" className="scrollable-div flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto px-5 py-4 text-xs">
              <li className="flex max-w-[92%] items-end gap-2 self-start">
                <div className="rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 text-[11px] leading-[1.65] text-white/55">
                  <p className="mb-1.5 text-[15px] font-medium tracking-[-.03em] text-white/90">What can I help with?</p>
                  I can open or close apps on your computer. Try <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-medium text-white/85">&quot;open Chrome&quot;</span> or <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-medium text-white/85">&quot;close Chrome&quot;</span>.
                </div>
              </li>
              {sentMessages.map((sentMessage, index) => (
                <li
                  key={`${index}-${sentMessage.text}`}
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-[1.6] ${sentMessage.from === "user"
                    ? "self-end rounded-br-md bg-[#d99476] text-[#211e1a]"
                    : "self-start rounded-bl-md border border-white/[0.08] bg-white/[0.045] text-white/75"}`}
                >
                  {sentMessage.text}
                </li>
              ))}
            </ol>

            <form onSubmit={sendMessage} className="shrink-0 border-t border-white/[0.08] px-4 pb-3.5 pt-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#211f1d] p-1.5 pl-3.5 focus-within:border-[#d99476]/60">
                <Input
                  aria-label="Chat message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onFocus={() => {
                    if (timer.current) clearTimeout(timer.current);
                  }}
                  placeholder="Message Fudge…"
                  className="h-8 min-w-0 flex-1 cursor-text border-0 bg-transparent px-0 text-[11px] text-white placeholder:text-white/30 shadow-none focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  disabled={!message.trim()}
                  size="icon-sm"
                  aria-label="Send command"
                  className="size-8 cursor-pointer rounded-lg bg-[#d99476] text-[#211e1a] shadow-none hover:bg-[#e3a58a] disabled:bg-white/[0.07] disabled:text-white/25"
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </Button>
              </div>
              <p className="mt-2 text-center text-[9px] text-white/25">Try “open [app name]” · “what apps can you open?”</p>
            </form>
          </>
        ) : mediaPlayback ? (
          <p
            aria-label={`Now playing ${mediaPlayback.title} by ${mediaPlayback.artist} in ${mediaPlayback.appName}`}
            className="flex h-full cursor-pointer items-center justify-between gap-2 px-3"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              mediaPointer.current = { x: event.clientX, y: event.clientY, dragging: false };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const pointer = mediaPointer.current;
              if (!pointer || pointer.dragging) return;
              if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 7) return;
              pointer.dragging = true;
              void getCurrentWindow().startDragging().catch(() => undefined);
            }}
            onPointerUp={() => {
              suppressMediaClick.current = mediaPointer.current?.dragging ?? false;
              mediaPointer.current = null;
              if (suppressMediaClick.current) {
                setTimeout(() => { suppressMediaClick.current = false; }, 0);
              }
            }}
            onPointerCancel={() => {
              mediaPointer.current = null;
              suppressMediaClick.current = true;
            }}
            onClick={() => {
              if (suppressMediaClick.current) {
                suppressMediaClick.current = false;
                return;
              }
              void expand();
            }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="flex h-5 shrink-0 items-center gap-[2px]">
                {["h-2", "h-4", "h-2.5", "h-5", "h-3", "h-4"].map((height, index) => (
                  <span
                    key={index}
                    className={`${mediaPlayback.isPlaying && settings.animateWave ? "music-bar" : "music-bar-still"} w-[3px] rounded-full ${height}`}
                    style={{
                      backgroundColor: waveColor,
                      animationDelay: `${index * 90}ms`,
                      animationDuration: `${560 + (index % 3) * 130}ms`,
                    }}
                  />
                ))}
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate text-[10px] font-medium text-white/90">{limitText(mediaPlayback.title, 14)}</span>
                <span className="truncate text-[9px] text-white/45">{limitText(mediaPlayback.artist, 14)} · {mediaPlayback.appName}</span>
              </span>
            </span>
            <span
              aria-hidden="true"
              className="size-8 shrink-0 rounded-full bg-white/10 bg-cover bg-center"
              style={mediaPlayback.artwork ? { backgroundImage: `url(${mediaPlayback.artwork})` } : undefined}
            />
          </p>
        ) : (
          <div
            aria-label="Dynamic Island collapsed"
            className="flex h-full w-full items-center justify-center"
            onMouseDown={(event) => {
              if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button"))) return;
              void getCurrentWindow().startDragging().catch(() => undefined);
            }}
          >
          </div>
        )}
        {(!mediaPlayback || expanded) && <button
          type="button"
          aria-label={expanded ? "Collapse Dynamic Island" : "Expand Dynamic Island"}
          title={expanded ? "Collapse" : "Open"}
          onClick={expanded ? collapse : () => void expand()}
          className="absolute z-20 flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent transition-[left,top] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/60"
          style={{ left: expanded ? 520 : 78, top: expanded ? 8 : 6 }}
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-white" />
        </button>}
      </section>
    </main>
  );
}

function MediaControlButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="size-6 rounded-md text-white/65 hover:bg-white/10 hover:text-white disabled:text-white/20"
    >
      {children}
    </Button>
  );
}

function trackHue(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % 360;
}

function limitText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}
