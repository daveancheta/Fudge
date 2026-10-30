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
const EXPANDED = { w: 400, h: 190 };
const TOP_MARGIN = 6; // gap from top of the screen
type InstalledApp = { id: string; name: string };

async function placeWindow(w: number, h: number) {
  const win = getCurrentWindow();
  const monitor = await primaryMonitor();
  if (!monitor) return;
  const scale = monitor.scaleFactor; // handles Windows DPI scaling
  const screenW = monitor.size.width / scale;
  const x = monitor.position.x / scale + (screenW - w) / 2;
  const y = monitor.position.y / scale + TOP_MARGIN;
  await win.setSize(new LogicalSize(w, h));
  await win.setPosition(new LogicalPosition(x, y));
}

export default function Island() {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [sentMessages, setSentMessages] = useState<{ text: string; from: "user" | "assistant" }[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageInputFocused = useRef(false);

  useEffect(() => {
    placeWindow(COLLAPSED.w, COLLAPSED.h);
    invoke<InstalledApp[]>("list_installed_apps")
      .then(setInstalledApps)
      .catch(() => setInstalledApps([]));
  }, []);

  const expand = async () => {
    if (timer.current) clearTimeout(timer.current);
    await placeWindow(EXPANDED.w, EXPANDED.h); 
    setExpanded(true);                         
  };

  const collapse = () => {
    if (messageInputFocused.current) return;
    setExpanded(false);                        
    timer.current = setTimeout(
      () => placeWindow(COLLAPSED.w, COLLAPSED.h), 
      450
    );
  };

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

    const requestedName = command[1].toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const normalize = (name: string) => name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
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
    <main
      className="flex h-screen w-screen justify-center"
      onMouseEnter={expand}
      onMouseLeave={collapse}
    >
      <section
        aria-label="Dynamic Island"
        className="flex shrink-0 flex-col overflow-hidden border border-white/10 bg-black text-white transition-[width,height,border-radius] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          width: expanded ? EXPANDED.w : COLLAPSED.w,
          height: expanded ? EXPANDED.h : COLLAPSED.h,
          borderRadius: expanded ? 32 : 9999,
        }}
      >
        {expanded ? (
          <>
            <header className="flex items-center justify-between px-4 pb-1 pt-3">
              <h1 className="text-xs font-medium text-white/75">Quick chat</h1>
              <span className="flex items-center gap-1.5 text-[10px] text-white/45">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-400" />
                Ready
              </span>
            </header>

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
                onBlur={() => {
                  messageInputFocused.current = false;
                }}
                placeholder="Message..."
                className="h-9 min-w-0 flex-1 rounded-full border-white/10 bg-white/5 px-3 text-xs text-white placeholder:text-white/35 shadow-none focus-visible:border-white/25 focus-visible:ring-white/10"
              />
              <Button
                type="submit"
                disabled={!message.trim()}
                size="icon-sm"
                aria-label="Send command"
                className="size-9 rounded-full bg-white text-black shadow-none hover:bg-white/85 disabled:bg-white/10 disabled:text-white/30"
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </Button>
            </form>
          </>
        ) : (
          <p aria-label="Dynamic Island collapsed" className="flex h-full items-center justify-center gap-2 text-[10px] font-medium tracking-wide text-white/70">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-white/80" />
            ISLAND
          </p>
        )}
      </section>
    </main>
  );
}
