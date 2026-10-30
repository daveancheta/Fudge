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
import { ArrowUp } from "lucide-react";

const COLLAPSED = { w: 180, h: 36 };
const PLAYING = { w: 250, h: 44 };
const EXPANDED = { w: 400, h: 190 };
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
      setWaveColor(`hsl(${Math.floor(Math.random() * 360)} 90% 65%)`);
    }
  }, [spotifyPlayback?.title, spotifyPlayback?.artist]);

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

    const listRequest = /^(?:what|which|list)\s+(?:apps|applications)(?:\s+can\s+you\s+open)?[?!.]*$/i.test(trimmedMessage);
    if (listRequest) {
      const appNames = installedApps.map((app) => app.name).slice(0, 12);
      const response = appNames.length
        ? `I can open: ${appNames.join(", ")}${installedApps.length > appNames.length ? ", and more" : ""}.`
        : "I couldn't load the installed app list. Try restarting the island.";
      setSentMessages((messages) => [...messages, { text: response, from: "assistant" }]);
      return;
    }

    const command = trimmedMessage.match(/^(?:please\s+)?(?:open|launch|start)\s+(?:the\s+)?(.+?)[.!?]*$/i);
    if (!command) return;

    const normalize = (name: string) => name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const requestedName = normalize(command[1]);
    const exactMatches = installedApps.filter((app) => normalize(app.name) === requestedName);
    const partialMatches = installedApps.filter((app) => normalize(app.name).includes(requestedName));
    const matches = exactMatches.length ? exactMatches : partialMatches;

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
            {spotifyPlayback && (
              <p className="mx-3 mb-1 flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.06] px-2 py-1.5 mt-2">
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
                      className={`music-bar w-[3px] rounded-full ${height}`}
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

            <ol aria-live="polite" className="scrollable-div flex min-h-0 flex-1 list-none flex-col gap-1.5 overflow-y-auto px-4 py-1 text-xs">
              <li className="max-w-[85%] self-start rounded-2xl rounded-tl-md bg-white/10 px-3 py-2 text-white/75">
                Try <span className="text-white">"open Chrome"</span> or ask which apps I can open.
              </li>
              {sentMessages.map((sentMessage, index) => (
                <li
                  key={`${index}-${sentMessage.text}`}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${sentMessage.from === "user"
                    ? "self-end rounded-tr-md bg-white/15 text-white"
                    : "self-start rounded-tl-md bg-white/10 text-white/75"}`}
                >
                  {sentMessage.text}
                </li>
              ))}
            </ol>

            <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-white/10 px-3 pb-3 pt-2">
              <Input
                aria-label="Chat message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onFocus={() => {
                  messageInputFocused.current = true;
                  if (timer.current) clearTimeout(timer.current);
                }}
                onBlur={() => { messageInputFocused.current = false; }}
                placeholder="Message..."
                className="h-9 min-w-0 flex-1 cursor-text rounded-full border-white/10 bg-white/5 px-3 text-xs text-white placeholder:text-white/35 shadow-none focus-visible:border-white/25 focus-visible:ring-white/10"
              />
              <Button
                type="submit"
                disabled={!message.trim()}
                size="icon-sm"
                aria-label="Send command"
                className="size-9 cursor-pointer rounded-full bg-white text-black shadow-none hover:bg-white/85 disabled:bg-white/10 disabled:text-white/30"
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </Button>
            </form>
          </>
        ) : spotifyPlayback ? (
          <p aria-label={`Now playing ${spotifyPlayback.title} by ${spotifyPlayback.artist}`} className="flex h-full items-center justify-between gap-2 px-3">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="flex h-5 shrink-0 items-center gap-[2px]">
                {["h-2", "h-4", "h-2.5", "h-5", "h-3", "h-4"].map((height, index) => (
                  <span
                    key={index}
                    className={`music-bar w-[3px] rounded-full ${height}`}
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
