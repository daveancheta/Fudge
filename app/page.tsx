"use client";
import { useEffect, useRef, useState } from "react";
import {
  getCurrentWindow,
  primaryMonitor,
  LogicalSize,
  LogicalPosition,
} from "@tauri-apps/api/window";
import { Pane } from "@/components/ui/pane";

const COLLAPSED = { w: 180, h: 36 };
const EXPANDED = { w: 400, h: 190 };
const TOP_MARGIN = 6; // gap from top of the screen

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
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageInputFocused = useRef(false);

  useEffect(() => {
    placeWindow(COLLAPSED.w, COLLAPSED.h);
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

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    setSentMessages((messages) => [...messages, trimmedMessage]);
    setMessage("");
  };

  return (
    <div
      className="flex h-screen w-screen justify-center"
      onMouseEnter={expand}
      onMouseLeave={collapse}
    >
      <Pane radius={24}  variant="blur"
        className="overflow-hidden  select-none cursor-default
                   transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          width: expanded ? EXPANDED.w : COLLAPSED.w,
          height: expanded ? EXPANDED.h : COLLAPSED.h,
          borderRadius: expanded ? 32 : 9999,
        }}
      >
        <div className="flex h-full items-center justify-center">
          {expanded
            ? <div className="flex h-full w-full flex-col gap-2 px-5 py-3 text-white">
              <div className="flex items-center justify-between ">
                <span className="text-xs font-semibold tracking-wide text-white/80">QUICK CHAT</span>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto text-xs scrollable-div">
                <div className="max-w-[82%] self-start rounded-2xl rounded-tl-md border border-white/10 bg-white/10 px-3 py-2 text-white/85">
                  Hey! What are you working on today?
                </div>
                {sentMessages.map((sentMessage, index) => (
                  <div
                    key={`${index}-${sentMessage}`}
                    className="max-w-[82%] self-end rounded-2xl rounded-tr-md border border-sky-200/20 bg-sky-300/20 px-3 py-2 text-white"
                  >
                    {sentMessage}
                  </div>
                ))}
              </div>

              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input
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
                  placeholder="Type a message..."
                  className="h-9 min-w-0 flex-1 rounded-full border border-white/15 bg-black/20 px-3 text-xs text-white outline-none placeholder:text-white/40 focus:border-white/35"
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="h-9 rounded-full border border-white/25 bg-white/20 px-4 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25)] transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Send
                </button>
              </form>
            </div>
            : <div className="w-2 h-2 bg-white rounded-full"></div>}
        </div>
      </Pane>
    </div>
  );
}
