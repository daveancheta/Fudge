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
import ReactMarkdown from "react-markdown";
import { ArrowUp, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useFudgeSettings } from "@/lib/use-fudge-settings";
import { useChatHistory } from "@/lib/use-chat-history";
import { audioBlobToWav, focusRequest } from "@/lib/focus-ai";

const COLLAPSED = { w: 180, h: 36 };
const PLAYING = { w: 250, h: 44 };
const EXPANDED = { w: 560, h: 360 };
const TOP_MARGIN = 6;
const SCREEN_GAP = 8;
const POSITION_STORAGE_KEY = "fudge-island-position";
type FocusSetup = { step: "preview" | "agenda"; preview: boolean; speak: boolean };
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
  const [thinking, setThinking] = useState(false);
  const [focusPreview, setFocusPreview] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandedRef = useRef(false);
  const mediaPointer = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const suppressMediaClick = useRef(false);
  const voiceRecorder = useRef<MediaRecorder | null>(null);
  const voiceStream = useRef<MediaStream | null>(null);
  const voiceChunks = useRef<Blob[]>([]);
  const focusVideo = useRef<HTMLVideoElement>(null);
  const focusSetup = useRef<FocusSetup | null>(null);
  const focusStream = useRef<MediaStream | null>(null);
  const focusActiveRef = useRef(false);
  const focusInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusInitialCheck = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusCheckInFlight = useRef(false);
  const focusPhoneDetections = useRef(0);
  const lastFocusNudge = useRef(0);
  const pushToTalkPressed = useRef(false);
  const pushToTalkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceLimitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  }, [expanded, sentMessages, thinking]);


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

  useEffect(() => () => {
    if (focusInterval.current) clearInterval(focusInterval.current);
    if (focusInitialCheck.current) clearTimeout(focusInitialCheck.current);
    focusStream.current?.getTracks().forEach((track) => track.stop());
    if (voiceLimitTimer.current) clearTimeout(voiceLimitTimer.current);
    if (voiceRecorder.current?.state === "recording") {
      voiceRecorder.current.onstop = null;
      voiceRecorder.current.stop();
    }
    voiceStream.current?.getTracks().forEach((track) => track.stop());
    window.speechSynthesis?.cancel();
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

  const addAssistantReply = useCallback((text: string, speak = settings.voiceFeedback) => {
    addMessage(text, "assistant");
    if (!speak || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }, [addMessage, settings.voiceFeedback]);

  const stopFocusMode = useCallback((speak = false) => {
    focusSetup.current = null;
    focusActiveRef.current = false;
    if (focusInterval.current) clearInterval(focusInterval.current);
    if (focusInitialCheck.current) clearTimeout(focusInitialCheck.current);
    focusInitialCheck.current = null;
    focusInterval.current = null;
    focusPhoneDetections.current = 0;
    setFocusPreview(false);
    focusStream.current?.getTracks().forEach((track) => track.stop());
    focusStream.current = null;
    if (focusVideo.current) focusVideo.current.srcObject = null;
    addAssistantReply("Focus mode is off. Camera monitoring has stopped.", speak);
  }, [addAssistantReply]);

  const startFocusMode = useCallback(async (goal: string, preview: boolean, speak = false) => {
    if (focusActiveRef.current) {
      addAssistantReply("Focus mode is already on. Say ‘stop focus mode’ when you’re done.", speak);
      return;
    }
    try {
      const status = await focusRequest<{ configured: boolean }>({ action: "status" });
      if (!status.configured) throw new Error("The hosted Meta proxy is missing META_API_KEY.");
    } catch (error) {
      addAssistantReply(error instanceof Error ? error.message : "The hosted focus service is unavailable.", speak);
      return;
    }
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera capture is unavailable in this app context.");
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 480 }, height: { ideal: 360 } },
          audio: false,
        });
      } catch (error) {
        // Some webcams cannot negotiate a low frame-rate constraint. Let the
        // camera choose a supported mode; stills are sampled only every 30s.
        if (error instanceof DOMException && error.name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw error;
        }
      }
    } catch (error) {
      const reason = error instanceof DOMException ? error.name : "CameraUnavailable";
      console.warn("Focus camera access was denied:", error);
      const guidance = reason === "NotAllowedError"
        ? "Allow camera access for desktop apps in Windows Privacy settings, then restart Fudge."
        : reason === "NotFoundError"
          ? "Connect or enable a camera, then try again."
          : reason === "NotReadableError"
            ? "The camera may be in use by another app. Close that app and try again."
            : reason === "OverconstrainedError"
              ? "The camera could not use a supported video mode."
              : "Check that a camera is connected and enabled for desktop apps in Windows Privacy settings.";
      addAssistantReply(`I couldn’t access the camera (${reason}). ${guidance}`, speak);
      return;
    }
    focusStream.current = stream;
    focusActiveRef.current = true;
    setFocusPreview(preview);
    if (focusVideo.current) {
      focusVideo.current.srcObject = stream;
      await focusVideo.current.play().catch(() => undefined);
    }

    addAssistantReply(`Focus mode is on${preview ? " with camera preview" : ""}. Every minute, a camera still and your task go to Meta for a focus check and plan. The camera cannot see your screen, so checks only react to clear visible distractions. Put your phone out of reach, set aside unrelated distractions, and take one step at a time. Say ‘stop focus mode’ to stop camera monitoring.`, speak);
    const task = goal.trim().slice(0, 240) || "Stay focused on my task";
    const results = await Promise.allSettled([
      focusRequest<{ plan: string }>({ action: "plan", goal: task }),
      focusRequest<{ cue: string }>({ action: "image-cue", goal: task }),
    ]);
    if (!focusActiveRef.current) return;
    const plan = results[0].status === "fulfilled" ? results[0].value.plan : "Take one small step, then continue with the next.";
    const cue = results[1].status === "fulfilled" ? results[1].value.cue : "Take a breath, settle in, and begin with one clear step.";
    addAssistantReply(`Your focus plan: ${plan} ${cue}`, speak);

    const checkFocus = async () => {
      const video = focusVideo.current;
      if (!focusActiveRef.current || focusCheckInFlight.current || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 360;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.55);
      focusCheckInFlight.current = true;
      try {
        const result = await focusRequest<{ offTask: boolean; reason: string }>({ action: "observe", image, goal: task });
        if (!focusActiveRef.current) return;
        focusPhoneDetections.current = result.offTask ? focusPhoneDetections.current + 1 : 0;
        const now = Date.now();
        if (focusPhoneDetections.current >= 1 && now - lastFocusNudge.current > 60_000) {
          lastFocusNudge.current = now;
          focusPhoneDetections.current = 0;
          const activity = result.reason ? `I can see ${result.reason}. ` : "";
          addAssistantReply(`${activity}Come on, you chose “${task}” for this session. Put the distraction aside and get back to it. Take one step now.`, settings.voiceFeedback);
        }
      } catch (error) {
        console.warn("Focus camera check did not complete:", error);
      } finally {
        focusCheckInFlight.current = false;
      }
    };
    focusInitialCheck.current = setTimeout(() => void checkFocus(), 60_000);
    focusInterval.current = setInterval(() => void checkFocus(), 60_000);
  }, [addAssistantReply, settings.voiceFeedback]);

  const executeDesktopCommand = useCallback(async (trimmedMessage: string, speakReplies = false) => {
    const focusOff = /^(?:please\s+)?(?:stop|end|disable|turn off)\s+(?:the\s+)?focus(?:\s+mode)?[.!?]*$/i.test(trimmedMessage.trim());
    if (focusOff) {
      if (focusActiveRef.current) stopFocusMode(speakReplies);
      else addAssistantReply("Focus mode is already off.", speakReplies);
      return true;
    }
    const focusOn = trimmedMessage.trim().match(/^(?:please\s+)?(?:start|activate|enable|turn on)\s+(?:the\s+)?focus(?:\s+mode)?(?:\s+(?:for|on)\s+(.+?))?[.!?]*$/i)
      ?? trimmedMessage.trim().match(/^focus mode(?:\s+(?:for|on)\s+(.+?))?[.!?]*$/i);
    if (focusOn) {
      if (focusActiveRef.current) {
        addAssistantReply("Focus mode is already on. Say ‘stop focus mode’ when you’re done.", speakReplies);
      } else {
        focusSetup.current = { step: "preview", preview: false, speak: speakReplies };
        addAssistantReply("Would you like a live camera preview while focus mode is on? Reply yes or no. Either way, focus mode sends a camera still and your task to Meta every minute for distraction checks. The camera cannot see your screen. Reply no to continue without the preview, or stop focus mode to cancel camera checks.", speakReplies);
      }
      return true;
    }
    if (focusSetup.current) {
      const setup = focusSetup.current;
      if (setup.step === "preview") {
        const yes = /^(?:yes|yeah|yep|sure|okay|ok|please do)[.!?]*$/i.test(trimmedMessage);
        const no = /^(?:no|nope|nah|not now|don't|do not)[.!?]*$/i.test(trimmedMessage);
        if (!yes && !no) {
          addAssistantReply("Please reply yes or no about showing the camera preview.", setup.speak);
          return true;
        }
        setup.preview = yes;
        setup.step = "agenda";
        addAssistantReply("What task or agenda should we focus on? This is required to start focus mode. For example, ‘study for my biology quiz’, ‘tidy the kitchen’, or ‘finish my budget’. I’ll remind you to put your phone away and return to that task.", setup.speak);
        return true;
      }
      if (!trimmedMessage.trim() || /^(?:skip|none|nothing|not sure|i don't know|idk)[.!?]*$/i.test(trimmedMessage.trim())) {
        addAssistantReply("Please enter a specific task before focus mode can start. For example, ‘read two chapters’, ‘water the plants’, or ‘prepare my presentation’.", setup.speak);
        return true;
      }
      try {
        const validation = await focusRequest<{ valid: boolean; clarification: string }>({
          action: "validate-goal",
          goal: trimmedMessage.trim().slice(0, 300),
        });
        if (!validation.valid) {
          addAssistantReply(validation.clarification || "What task should we focus on?", setup.speak);
          return true;
        }
      } catch (error) {
        addAssistantReply(error instanceof Error ? error.message : "I couldn't check that agenda. Please try again.", setup.speak);
        return true;
      }
      focusSetup.current = null;
      await startFocusMode(trimmedMessage, setup.preview, setup.speak);
      return true;
    }
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
  }, [addAssistantReply, installedApps, mediaPlayback, pendingMusicApps, startFocusMode, stopFocusMode]);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    addMessage(trimmedMessage, "user");
    setMessage("");
    setThinking(true);
    try {
      await executeDesktopCommand(trimmedMessage, settings.voiceFeedback);
    } finally {
      setThinking(false);
    }
  };

  const startPushToTalk = () => {
    if (pushToTalkPressed.current) return;
    pushToTalkPressed.current = true;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      addAssistantReply("Voice input isn’t supported by this app version.");
      pushToTalkPressed.current = false;
      return;
    }
    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (!pushToTalkPressed.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      voiceStream.current = stream;
      voiceChunks.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      voiceRecorder.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) voiceChunks.current.push(event.data); };
      recorder.onstop = () => {
        setListening(false);
        if (voiceLimitTimer.current) clearTimeout(voiceLimitTimer.current);
        voiceLimitTimer.current = null;
        const recording = new Blob(voiceChunks.current, { type: recorder.mimeType || "audio/webm" });
        voiceChunks.current = [];
        void (async () => {
          setThinking(true);
          try {
            if (recording.size < 1500) return;
            const wav = await audioBlobToWav(recording);
            const reader = new FileReader();
            const audio = await new Promise<string>((resolve, reject) => {
              reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read the recording."));
              reader.onerror = () => reject(new Error("Could not read the recording."));
              reader.readAsDataURL(wav);
            });
            const result = await focusRequest<{ transcript: string }>({ action: "transcribe", audio, mimeType: "audio/wav" });
            const spokenText = result.transcript.trim();
            if (!spokenText) return;
            addMessage(spokenText, "user");
            await executeDesktopCommand(spokenText, settings.voiceFeedback);
          } catch (error) {
            addAssistantReply(error instanceof Error ? error.message : "Voice transcription failed.", settings.voiceFeedback);
          } finally {
            setThinking(false);
          }
        })();
        voiceStream.current?.getTracks().forEach((track) => track.stop());
        voiceStream.current = null;
        voiceRecorder.current = null;
      };
      recorder.start();
      setListening(true);
      voiceLimitTimer.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 20_000);
    }).catch(() => {
      setListening(false);
      pushToTalkPressed.current = false;
      voiceStream.current?.getTracks().forEach((track) => track.stop());
      voiceStream.current = null;
      addAssistantReply("I couldn’t access the microphone. Allow microphone access, then try again.");
    });
  };

  const stopPushToTalk = () => {
    if (pushToTalkTimer.current) clearTimeout(pushToTalkTimer.current);
    pushToTalkTimer.current = null;
    if (voiceLimitTimer.current) clearTimeout(voiceLimitTimer.current);
    voiceLimitTimer.current = null;
    if (!pushToTalkPressed.current) return;
    pushToTalkPressed.current = false;
    suppressPushToTalkClick.current = true;
    setListening(false);
    if (voiceRecorder.current?.state === "recording") voiceRecorder.current.stop();
    else {
      voiceStream.current?.getTracks().forEach((track) => track.stop());
      voiceStream.current = null;
    }
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
        <video ref={focusVideo} aria-label="Live camera preview" tabIndex={-1} muted playsInline className={focusPreview && expanded ? "absolute right-12 top-2 z-10 h-[54px] w-[72px] rounded-lg border border-white/20 bg-black object-cover" : "hidden"} />
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
                  {sentMessage.from === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                        ul: ({ ...props }) => <ul className="my-1 list-disc space-y-0.5 pl-4" {...props} />,
                        ol: ({ ...props }) => <ol className="my-1 list-decimal space-y-0.5 pl-4" {...props} />,
                        li: ({ ...props }) => <li className="pl-0.5" {...props} />,
                        strong: ({ ...props }) => <strong className="font-semibold text-white/95" {...props} />,
                        a: ({ ...props }) => <a className="text-[#e3a58a] underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />,
                        code: ({ className, ...props }) => <code className={`rounded bg-black/20 px-1 py-0.5 font-mono text-[10px] ${className ?? ""}`} {...props} />,
                      }}
                    >
                      {sentMessage.text}
                    </ReactMarkdown>
                  ) : sentMessage.text}
                </li>
              ))}
              {thinking && (
                <li role="status" aria-live="polite" className="max-w-[86%] self-start rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.045] px-3.5 py-2.5 text-[11px] text-white/45">
                  Fudge is thinking…
                </li>
              )}
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
