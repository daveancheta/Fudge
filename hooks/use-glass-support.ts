"use client";

import * as React from "react";
import type { GlassQuality } from "../lib/glass/types";

function detectQuality(): GlassQuality {
  if (
    typeof window === "undefined" ||
    typeof window.CSS?.supports !== "function"
  ) {
    return "none";
  }

  const reducedTransparency = window.matchMedia?.(
    "(prefers-reduced-transparency: reduce)",
  ).matches;
  if (reducedTransparency) return "none";

  const supportsBackdropFilter =
    CSS.supports("backdrop-filter", "blur(1px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(1px)");
  if (!supportsBackdropFilter) return "none";

  // Only Chromium currently honors an SVG filter reference layered inside
  // backdrop-filter, so that's the signal we use to unlock the full
  // refraction pass. Everyone else still gets blur + saturate + specular.
  const isChromium =
    /Chrome|Chromium|Edg\//.test(navigator.userAgent) &&
    !/OPR\//.test(navigator.userAgent);

  return isChromium ? "full" : "reduced";
}

/**
 * Feature-detects how much of the glass effect the current browser/user
 * preference can render, so components can degrade gracefully instead of
 * shipping a broken filter.
 */
export function useGlassSupport(): GlassQuality {
  const [quality, setQuality] = React.useState<GlassQuality>("reduced");

  React.useEffect(() => {
    setQuality(detectQuality());

    const media = window.matchMedia?.("(prefers-reduced-transparency: reduce)");
    const handleChange = () => setQuality(detectQuality());
    media?.addEventListener("change", handleChange);
    return () => media?.removeEventListener("change", handleChange);
  }, []);

  return quality;
}
