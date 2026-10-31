"use client";
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  getCurrentWindow,
  primaryMonitor,
  LogicalSize,
  LogicalPosition,
} from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, AudioLines, Command, Sparkles } from "lucide-react";
import { createAuthClient } from "better-auth/react";
import { useFudgeSettings } from "@/lib/use-fudge-settings";

const COLLAPSED = { w: 180, h: 36 };
const PLAYING = { w: 250, h: 44 };
const EXPANDED = { w: 560, h: 360 };
const TOP_MARGIN = 6;
const POSITION_STORAGE_KEY = "fudge-island-position";
type InstalledApp = { id: string; name: string };
type SpotifyPlayback = { title: string; artist: string; artwork: string | null };

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

const authClient = createAuthClient();

export default function Island() {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [sentMessages, setSentMessages] = useState<{ text: string; from: "user" | "assistant" }[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [spotifyPlayback, setSpotifyPlayback] = useState<SpotifyPlayback | null>(null);
  const [waveColor, setWaveColor] = useState("#ff637d");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageInputFocused = useRef(false);
  const expandedRef = useRef(false);
  const chatListRef = useRef<HTMLOListElement>(null);
  const { data: session } = authClient.useSession();
  const { settings } = useFudgeSettings(session?.user.id);

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
        const next = await invoke<SpotifyPlayback | null>("get_spotify_playback");
        if (!active) return;
        setSpotifyPlayback((current) => current?.title === next?.title
          && current?.artist === next?.artist
          && current?.artwork === next?.artwork ? current : next);
      } catch {
        if (active) setSpotifyPlayback(null);
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
    if (spotifyPlayback) {
      setWaveColor(settings.randomWaveColor
        ? `hsl(${Math.floor(Math.random() * 360)} 90% 65%)`
        : settings.waveColor);
    }
  }, [spotifyPlayback?.title, spotifyPlayback?.artist, settings]);

  useEffect(() => {
    if (expandedRef.current) return;
    const size = spotifyPlayback ? PLAYING : COLLAPSED;
    void placeWindow(size.w, size.h);
  }, [spotifyPlayback]);

  const expand = async () => {
    if (timer.current) clearTimeout(timer.current);
    await placeWindow(EXPANDED.w, EXPANDED.h);
    expandedRef.current = true;
    setExpanded(true);
  };

  const collapse = () => {
    if (messageInputFocused.current) return;
    setExpanded(false);
    timer.current = setTimeout(() => {
      expandedRef.current = false;
      const size = spotifyPlayback ? PLAYING : COLLAPSED;
      void placeWindow(size.w, size.h);
    }, 450);
  };

  const compactSize = spotifyPlayback ? PLAYING : COLLAPSED;

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    setSentMessages((messages) => [...messages, { text: trimmedMessage, from: "user" }]);
    setMessage("");

    if (/^(?:please\s+)?(?:open|show|launch)\s+fudge\s+settings[.!?]*$/i.test(trimmedMessage)) {
      try {
        await invoke("open_settings");
        setSentMessages((messages) => [...messages, { text: "Opening Fudge settings.", from: "assistant" }]);
      } catch (error) {
        setSentMessages((messages) => [...messages, { text: String(error), from: "assistant" }]);
      }
      return;
    }

    const listRequest = /^(?:what|which|list)\s+(?:apps|applications)(?:\s+can\s+you\s+open)?[?!.]*$/i.test(trimmedMessage);
    if (listRequest) {
      const appNames = installedApps.map((app) => app.name).slice(0, 12);
      const response = appNames.length
        ? `I can open: ${appNames.join(", ")}${installedApps.length > appNames.length ? ", and more" : ""}.`
        : "I couldn't load the installed app list. Try restarting the island.";
      setSentMessages((messages) => [...messages, { text: response, from: "assistant" }]);
      return;
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
    if (closeCommand) {
      const matches = findInstalledApps(closeCommand[1]);
      if (!matches.length) {
        setSentMessages((messages) => [...messages, {
          text: installedApps.length
            ? `I couldn't find an installed app named "${closeCommand[1]}". Try "what apps can you open?".`
            : "I couldn't load the installed app list. Try restarting the island.",
          from: "assistant",
        }]);
        return;
      }
      if (matches.length > 1) {
        setSentMessages((messages) => [...messages, {
          text: `I found several matches: ${matches.slice(0, 5).map((app) => app.name).join(", ")}. Use a more specific name.`,
          from: "assistant",
        }]);
        return;
      }

      try {
        const response = await invoke<string>("close_installed_app", { appId: matches[0].id });
        setSentMessages((messages) => [...messages, { text: response, from: "assistant" }]);
      } catch (error) {
        setSentMessages((messages) => [...messages, { text: String(error), from: "assistant" }]);
      }
      return;
    }

    const command = trimmedMessage.match(/^(?:please\s+)?(?:open|launch|start)\s+(?:the\s+)?(.+?)[.!?]*$/i);
    if (!command) return;

    const matches = findInstalledApps(command[1]);

    if (!matches.length) {
      setSentMessages((messages) => [...messages, {
        text: installedApps.length
          ? `I couldn't find an installed app named "${command[1]}". Try "what apps can you open?".`
          : "I couldn't load the installed app list. Try restarting the island.",
        from: "assistant",
      }]);
      return;
    }
    if (matches.length > 1) {
      setSentMessages((messages) => [...messages, {
        text: `I found several matches: ${matches.slice(0, 5).map((app) => app.name).join(", ")}. Use a more specific name.`,
        from: "assistant",
      }]);
      return;
    }

    try {
      const response = await invoke<string>("launch_installed_app", { appId: matches[0].id });
      setSentMessages((messages) => [...messages, { text: response, from: "assistant" }]);
    } catch (error) {
      setSentMessages((messages) => [...messages, { text: String(error), from: "assistant" }]);
    }
  };

  return (
    <main className="flex h-screen w-screen justify-center" onMouseEnter={expand} onMouseLeave={collapse}>
      <section
        aria-label="Dynamic Island"
        className="flex shrink-0 cursor-move flex-col overflow-hidden border border-white/10 bg-black text-white transition-[width,height,border-radius] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          if (event.target instanceof Element && event.target.closest("input, button")) return;
          void getCurrentWindow().startDragging().catch(() => undefined);
        }}
        style={{
          width: expanded ? EXPANDED.w : compactSize.w,
          height: expanded ? EXPANDED.h : compactSize.h,
          borderRadius: expanded ? 32 : 9999,
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

            {spotifyPlayback && (
              <p className="mx-3 mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-2 py-1.5">
                <span
                  aria-hidden="true"
                  className="size-8 shrink-0 rounded-lg bg-white/10 bg-cover bg-center"
                  style={spotifyPlayback.artwork ? { backgroundImage: `url(${spotifyPlayback.artwork})` } : undefined}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[11px] font-medium text-white/90">{spotifyPlayback.title}</span>
                  <span className="truncate text-[10px] text-white/50">{spotifyPlayback.artist}</span>
                </span>
                <span aria-hidden="true" className="ml-auto flex h-5 shrink-0 items-center gap-[2px] px-1">
                  {["h-2", "h-4", "h-2.5", "h-5", "h-3", "h-4"].map((height, index) => (
                    <span
                      key={index}
                      className={`${settings.animateWave ? "music-bar" : "music-bar-still"} w-[3px] rounded-full ${height}`}
                      style={{
                        backgroundColor: waveColor,
                        animationDelay: `${index * 90}ms`,
                        animationDuration: `${560 + (index % 3) * 130}ms`,
                      }}
                    />
                  ))}
                </span>
              </p>
            )}

            <ol ref={chatListRef} aria-live="polite" className="scrollable-div flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto px-4 py-4 text-xs">
              <li className="flex max-w-[92%] items-end gap-2 self-start">
                <div className="rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.055] px-3.5 py-2.5 text-[11px] leading-[1.65] text-white/65">
                  <p className="mb-1 font-medium text-white/90">Hey, I’m Fudge.</p>
                  I can open or close apps on your computer. Try <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-medium text-white/85">&quot;open Chrome&quot;</span> or <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-medium text-white/85">&quot;close Chrome&quot;</span>.
                </div>
              </li>
              {sentMessages.map((sentMessage, index) => (
                <li
                  key={`${index}-${sentMessage.text}`}
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-[1.6] ${sentMessage.from === "user"
                    ? "self-end rounded-br-md bg-white text-black shadow-[0_4px_16px_rgba(255,99,125,0.18)]"
                    : "self-start rounded-bl-md border border-white/[0.07] bg-white/[0.055] text-white/75"}`}
                >
                  {sentMessage.text}
                </li>
              ))}
            </ol>

            <form onSubmit={sendMessage} className="shrink-0 border-t border-white/[0.08] bg-white/[0.015] px-3 pb-3 pt-2.5">
              <div className="flex items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.045] p-1.5 pl-3 focus-within:border-white/20 focus-within:bg-white/[0.06]">
                <Input
                  aria-label="Chat message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onFocus={() => {
                    messageInputFocused.current = true;
                    if (timer.current) clearTimeout(timer.current);
                  }}
                  onBlur={() => { messageInputFocused.current = false; }}
                  placeholder="Ask Fudge or try ‘close Chrome’..."
                  className="h-8 min-w-0 flex-1 cursor-text border-0 bg-transparent px-0 text-[11px] text-white placeholder:text-white/35 shadow-none focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  disabled={!message.trim()}
                  size="icon-sm"
                  aria-label="Send command"
                  className="size-8 cursor-pointer rounded-xl bg-white text-black shadow-none hover:bg-white/85 disabled:bg-white/10 disabled:text-white/30"
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </Button>
              </div>
              <p className="mt-2 text-center text-[9px] text-white/25">Try “open [app name]” · “what apps can you open?”</p>
            </form>
          </>
        ) : spotifyPlayback ? (
          <p aria-label={`Now playing ${spotifyPlayback.title} by ${spotifyPlayback.artist}`} className="flex h-full items-center justify-between gap-2 px-3">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="flex h-5 shrink-0 items-center gap-[2px]">
                {["h-2", "h-4", "h-2.5", "h-5", "h-3", "h-4"].map((height, index) => (
                  <span
                    key={index}
                    className={`${settings.animateWave ? "music-bar" : "music-bar-still"} w-[3px] rounded-full ${height}`}
                    style={{
                      backgroundColor: waveColor,
                      animationDelay: `${index * 90}ms`,
                      animationDuration: `${560 + (index % 3) * 130}ms`,
                    }}
                  />
                ))}
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate text-[10px] font-medium text-white/90">{spotifyPlayback.title}</span>
                <span className="truncate text-[9px] text-white/45">{spotifyPlayback.artist}</span>
              </span>
            </span>
            <span
              aria-hidden="true"
              className="size-8 shrink-0 rounded-full bg-white/10 bg-cover bg-center"
              style={spotifyPlayback.artwork ? { backgroundImage: `url(${spotifyPlayback.artwork})` } : undefined}
            />
          </p>
        ) : (
          <p aria-label="Dynamic Island collapsed" className="flex h-full items-center justify-center">
            <span aria-hidden="true" className="size-2 rounded-full bg-white" />
          </p>
        )}
      </section>
    </main>
  );
}
