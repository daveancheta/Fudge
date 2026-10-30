"use client";

import { useGlassConfig } from "@/lib/context";
import { useMotionValue, useSpring } from "motion/react";
import * as React from "react";

const IDLE_X = 50;
const IDLE_Y = 32;

/**
 * Writes the lighting inputs straight to the node as CSS custom properties, so
 * neither ever costs a React render:
 *
 * `--pane-mx` / `--pane-my` — pointer position in percent, for the glint that
 * rides the rim under the cursor.
 *
 * `--pane-spin` — angle of the specular arcs around the border. Glass catches
 * the light from a fixed direction, so the angle follows where the surface sits
 * in the viewport (scrolling travels the light around the rim) and the pointer
 * takes over while it's on the surface.
 *
 * Everything is spring-smoothed, and the angle is unwrapped before the spring
 * so a pointer crossing due-left takes the short way round.
 */
export function useGlassPointer<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [active, setActive] = React.useState(false);

  const { specular, spring } = useGlassConfig();
  const mx = useMotionValue(IDLE_X);
  const my = useMotionValue(IDLE_Y);
  const spin = useMotionValue(specular.angle);
  const smoothX = useSpring(mx, spring.hover);
  const smoothY = useSpring(my, spring.hover);
  const smoothSpin = useSpring(spin, spring.drag);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    node.style.setProperty("--pane-mx", `${IDLE_X}%`);
    node.style.setProperty("--pane-my", `${IDLE_Y}%`);
    node.style.setProperty("--pane-spin", `${specular.angle}deg`);

    const unsubX = smoothX.on("change", (value) => {
      node.style.setProperty("--pane-mx", `${value}%`);
    });
    const unsubY = smoothY.on("change", (value) => {
      node.style.setProperty("--pane-my", `${value}%`);
    });
    const unsubSpin = smoothSpin.on("change", (value) => {
      node.style.setProperty("--pane-spin", `${value}deg`);
    });

    /** shortest way round: keeps the spring from unwinding the long arc */
    const setSpin = (target: number) => {
      const current = spin.get();
      spin.set(current + wrapDelta(target - current));
    };

    /** angle the light comes from, as a function of viewport position */
    const spinFromScroll = (rect: DOMRect) => {
      const viewport = window.innerHeight || 1;
      const progress = clamp01((rect.top + rect.height / 2) / viewport);
      return specular.angle + (progress - 0.5) * specular.travel;
    };

    let pointerOn = false;
    let frame = 0;

    const syncToScroll = () => {
      frame = 0;
      if (pointerOn) return;
      setSpin(spinFromScroll(node.getBoundingClientRect()));
    };

    // one rect read per frame at most: a page of panes each measuring on
    // every scroll event would thrash layout
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(syncToScroll);
    };

    const handleMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointerOn = true;
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      mx.set(clamp01(px) * 100);
      my.set(clamp01(py) * 100);
      // conic-gradient angles run clockwise from twelve o'clock, so the
      // highlight sits on the side of the rim the pointer is nearest
      setSpin((Math.atan2(px - 0.5, 0.5 - py) * 180) / Math.PI);
      setActive(true);
    };

    const handleLeave = () => {
      pointerOn = false;
      setActive(false);
      mx.set(IDLE_X);
      my.set(IDLE_Y);
      syncToScroll();
    };

    syncToScroll();
    node.addEventListener("pointermove", handleMove);
    node.addEventListener("pointerleave", handleLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      node.removeEventListener("pointermove", handleMove);
      node.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      unsubX();
      unsubY();
      unsubSpin();
    };
  }, [
    mx,
    my,
    spin,
    smoothX,
    smoothY,
    smoothSpin,
    specular.angle,
    specular.travel,
  ]);

  return { ref, active };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** signed difference between two angles, in (-180, 180] */
function wrapDelta(delta: number) {
  return delta - 360 * Math.round(delta / 360);
}
