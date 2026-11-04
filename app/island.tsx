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
import { useFudgeSettings } from "@/lib/use-fudge-settings";
import { useChatHistory } from "@/lib/use-chat-history";

const COLLAPSED = { w: 180, h: 36 };
const PLAYING = { w: 250, h: 44 };
const EXPANDED = { w: 560, h: 360 };
const TOP_MARGIN = 6;
const SCREEN_GAP = 8;
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
  const screenH = monitor.size.height / scale;
  const screenLeft = monitor.position.x / scale;
  const screenTop = monitor.position.y / scale;
  const saved = getSavedPosition();
  const maxX = screenLeft + screenW - w - SCREEN_GAP;
  const maxY = screenTop + screenH - h - SCREEN_GAP;
  const desiredX = saved ? saved.centerX - w / 2 : screenLeft + (screenW - w) / 2;
  const desiredY = saved?.topY ?? screenTop + TOP_MARGIN;
  // Keep the whole island visible when expanding near a monitor edge.
  const x = Math.max(screenLeft + SCREEN_GAP, Math.min(maxX, desiredX));
  const y = Math.max(screenTop + SCREEN_GAP, Math.min(maxY, desiredY));
  await win.setSize(new LogicalSize(w, h));
  await win.setPosition(new LogicalPosition(x, y));
}

export default function Island() {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [mediaPlayback, setMediaPlayback] = useState<MediaPlayback | null>(null);
  const [pendingMusicApps, setPendingMusicApps] = useState<InstalledApp[]>([]);
  const [listening, setListening] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandedRef = useRef(false);
  const mediaPointer = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const suppressMediaClick = useRef(false);
  const speechRecognition = useRef<{ start: () => void; stop: () => void; abort: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null } | null>(null);
  const pushToTalkPressed = useRef(false);
  const pushToTalkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressPushToTalkClick = useRef(false);
  const chatListRef = useRef<HTMLOListElement>(null);
  const { settings } = useFudgeSettings();
  const { messages: sentMessages, addMessage } = useChatHistory();
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

  const addAssistantReply = useCallback((text: string, speak = false) => {
    addMessage(text, "assistant");
    if (!speak || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }, [addMessage]);

  const executeDesktopCommand = useCallback(async (trimmedMessage: string, speakReplies = false) => {
    const pendingChoice = pendingMusicApps.find((app) => trimmedMessage.toLocaleLowerCase().includes(app.name.toLocaleLowerCase()));
    const yesToMusicApp = /^(?:yes|yeah|yep|sure|okay|ok|please do)[.!?]*$/i.test(trimmedMessage.trim());
    if (pendingChoice || (yesToMusicApp && pendingMusicApps.length === 1)) {
      const app = pendingChoice ?? pendingMusicApps[0];
      setPendingMusicApps([]);
      addAssistantReply(`Opening ${app.name}.`, speakReplies);
      try {
        await invoke<string>("launch_installed_app", { appId: app.id });
      } catch (error) {
        addAssistantReply(String(error), speakReplies);
      }
      return true;
    }
    if (pendingMusicApps.length > 1 && yesToMusicApp) {
      addAssistantReply(`Which one should I open: ${pendingMusicApps.map((app) => app.name).join(", ")}?`, speakReplies);
      return true;
    }
    if (pendingMusicApps.length && /^(?:no|nope|nah|not now|don't|do not)[.!?]*$/i.test(trimmedMessage.trim())) {
      setPendingMusicApps([]);
      addAssistantReply("Okay, I won't open it.", speakReplies);
      return true;
    }

    if (/^(?:please\s+)?(?:open|show|launch)\s+fudge\s+settings[.!?]*$/i.test(trimmedMessage)) {
      try {
        await invoke("open_settings");
        addAssistantReply("Opening Fudge settings.", speakReplies);
      } catch (error) {
        addAssistantReply(String(error), speakReplies);
      }
      return true;
    }

    const musicAction = /\b(?:play|resume)\b.*\b(?:music|song|track|playback|audio)\b/i.test(trimmedMessage)
      ? "play"
      : /\b(?:pause|stop)\b.*\b(?:music|song|track|playback|audio)\b/i.test(trimmedMessage)
        ? "pause"
      : /\b(?:next(?:\s+(?:track|song))?|skip(?:\s+(?:to\s+)?(?:the\s+)?(?:next\s+)?(?:track|song))?)\b/i.test(trimmedMessage)
        ? "next"
        : /\b(?:previous|prev|back)(?:\s+(?:track|song))?\b/i.test(trimmedMessage)
          ? "previous"
          : null;
    if (musicAction) {
      if (!mediaPlayback) {
        if (musicAction === "play") {
          const musicApps = installedApps.filter((app) => /spotify|youtube|apple music|amazon music|deezer|tidal|vlc|foobar|winamp|groove music|media player|itunes|music/i.test(app.name));
          if (musicApps.length) {
            setPendingMusicApps(musicApps);
            addAssistantReply(`No media app is open. These music apps are installed: ${musicApps.map((app) => app.name).join(", ")}. Which one would you like me to open?`, speakReplies);
          } else {
            addAssistantReply("I can't find an open media app or an installed music player. Do you want me to help you find one?", speakReplies);
          }
        } else {
          addAssistantReply("I can't find an open media app with music to control.", speakReplies);
        }
        return true;
      }
      if (musicAction === "play" && mediaPlayback.isPlaying) {
        addAssistantReply("The music is already playing.", speakReplies);
        return true;
      }
      if (musicAction === "pause" && !mediaPlayback.isPlaying) {
        addAssistantReply("The music is already paused.", speakReplies);
        return true;
      }
      const reply = musicAction === "pause" ? "Pausing the music."
        : musicAction === "play" ? "Playing the music."
          : musicAction === "next" ? "Skipping to the next track." : "Going to the previous track.";
      addAssistantReply(reply, speakReplies);
      try {
        await invoke("control_media_session", { sourceId: mediaPlayback.sourceId, action: musicAction === "previous" || musicAction === "next" ? musicAction : "playPause" });
        const nextPlayback = await invoke<MediaPlayback | null>("get_media_playback");
        setMediaPlayback(nextPlayback);
      } catch (error) {
        addAssistantReply(String(error), speakReplies);
      }
      return true;
    }

    const listRequest = /^(?:what|which|list)\s+(?:apps|applications)(?:\s+can\s+you\s+open)?[?!.]*$/i.test(trimmedMessage);
    if (listRequest) {
      const appNames = installedApps.map((app) => app.name).slice(0, 12);
      const response = appNames.length
        ? `I can open: ${appNames.join(", ")}${installedApps.length > appNames.length ? ", and more" : ""}.`
        : "I couldn't load the installed app list. Try restarting the island.";
      addAssistantReply(response, speakReplies);
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
      addAssistantReply(installedApps.length
        ? `I couldn't find an installed app named "${command[1]}". Try "what apps can you open?".`
        : "I couldn't load the installed app list. Try restarting the island.", speakReplies);
      return true;
    }
    if (matches.length > 1) {
      addAssistantReply(`I found several matches: ${matches.slice(0, 5).map((app) => app.name).join(", ")}. Use a more specific name.`, speakReplies);
      return true;
    }

    addAssistantReply(`${closeCommand ? "Closing" : "Opening"} ${matches[0].name}…`, speakReplies);
    try {
      await invoke<string>(closeCommand ? "close_installed_app" : "launch_installed_app", { appId: matches[0].id });
    } catch (error) {
      addAssistantReply(String(error), speakReplies);
    }
    return true;
  }, [addAssistantReply, installedApps, mediaPlayback, pendingMusicApps]);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    addMessage(trimmedMessage, "user");
    setMessage("");
    await executeDesktopCommand(trimmedMessage);
  };

  const startPushToTalk = () => {
    if (pushToTalkPressed.current) return;
    pushToTalkPressed.current = true;
    const SpeechRecognition = (window as Window & {
      SpeechRecognition?: new () => NonNullable<typeof speechRecognition.current>;
      webkitSpeechRecognition?: new () => NonNullable<typeof speechRecognition.current>;
    }).SpeechRecognition ?? (window as Window & {
      webkitSpeechRecognition?: new () => NonNullable<typeof speechRecognition.current>;
    }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addMessage("Voice input isn't supported by this app version.", "assistant");
      pushToTalkPressed.current = false;
      return;
    }

    const recognition = new SpeechRecognition();
    speechRecognition.current = recognition;
    recognition.onresult = (event) => {
      const spokenText = event.results[0]?.[0]?.transcript.trim();
      if (!spokenText) return;
      addMessage(spokenText, "user");
      void executeDesktopCommand(spokenText, settings.voiceFeedback);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      setListening(false);
      speechRecognition.current = null;
    };
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      speechRecognition.current = null;
    }
  };

  const stopPushToTalk = () => {
    if (pushToTalkTimer.current) clearTimeout(pushToTalkTimer.current);
    pushToTalkTimer.current = null;
    if (!pushToTalkPressed.current) return;
    pushToTalkPressed.current = false;
    suppressPushToTalkClick.current = true;
    speechRecognition.current?.stop();
  };

  return (
    <main className="flex h-screen w-screen justify-center">
      <section
        aria-label={expanded ? "Dynamic Island" : "Expand Dynamic Island"}
        role={expanded ? "region" : "button"}
        tabIndex={expanded ? undefined : 0}
        className={`relative flex shrink-0 flex-col select-none overflow-hidden border border-white/[0.11] bg-[#171615] text-[#f5f1e9] ${expanded ? "" : "cursor-pointer"}`}
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
                  className="h-8 min-w-0 flex-1 cursor-text select-text border-0 bg-transparent px-0 text-[11px] text-white placeholder:text-white/30 shadow-none focus-visible:ring-0"
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
          onClick={() => {
            if (suppressPushToTalkClick.current) {
              suppressPushToTalkClick.current = false;
              return;
            }
            if (expanded) collapse();
            else void expand();
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            pushToTalkTimer.current = setTimeout(startPushToTalk, 350);
          }}
          onPointerUp={stopPushToTalk}
          onPointerCancel={stopPushToTalk}
          onLostPointerCapture={stopPushToTalk}
          onContextMenu={(event) => event.preventDefault()}
          className="absolute z-20 flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent transition-[left,top] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/60"
          style={{ left: expanded ? 520 : 78, top: expanded ? 8 : 6 }}
        >
          <span aria-hidden="true" className={`size-2 rounded-full ${listening ? "bg-[#d99476] shadow-[0_0_8px_#d99476]" : "bg-white"}`} />
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
