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
const EXPANDED = { w: 400, h: 160 };
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    placeWindow(COLLAPSED.w, COLLAPSED.h);
  }, []);

  const expand = async () => {
    if (timer.current) clearTimeout(timer.current);
    await placeWindow(EXPANDED.w, EXPANDED.h); 
    setExpanded(true);                         
  };

  const collapse = () => {
    setExpanded(false);                        
    timer.current = setTimeout(
      () => placeWindow(COLLAPSED.w, COLLAPSED.h), 
      450
    );
  };

  return (
    <div
      className="flex h-screen w-screen justify-center"
      onMouseEnter={expand}
      onMouseLeave={collapse}
    >
      <Pane radius={24}
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
            ? <div className="flex flex-col items-center gap-2">
              <button onClick={async () => {
                await open("https://youtube.com")
              }} >
                open yt
              </button>
            </div>
            : <div className="w-2 h-2 bg-white rounded-full"></div>}
        </div>
      </Pane>
    </div>
  );
}
