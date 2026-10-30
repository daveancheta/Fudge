import type {
  GlassDisplacementConfig,
  GlassSpecularConfig,
  GlassSpringConfig,
  GlassVariant,
} from "./types";

/**
 * Tuning surface for the glass engine — every Pane-based component reads from
 * here. Only values feeding the SVG filter or the spring physics live in JS;
 * static color/blur tokens are `--pane-*` properties in `app/globals.css`.
 */

export const GLASS_DISPLACEMENT: Record<GlassVariant, GlassDisplacementConfig> =
  {
    default: {
      strength: 15,
      edge: 17,
      chromaticAberration: 1.4,
      blur: 0.6,
    },
    blur: {
      strength: 11,
      edge: 13,
      chromaticAberration: 0.9,
      blur: 0.6,
    },
    transparent: {
      strength: 15,
      edge: 17,
      chromaticAberration: 1.4,
      blur: 0.6,
    },
  };

export const GLASS_SPECULAR: GlassSpecularConfig = {
  intensity: 0.55,
  size: 180,
  angle: 115,
  travel: 200,
  edge: 7,
  rim: 1.5,
};

export const GLASS_SPRING: Record<
  "press" | "hover" | "drag",
  GlassSpringConfig
> = {
  press: { stiffness: 500, damping: 30, mass: 0.6 },
  hover: { stiffness: 300, damping: 24, mass: 0.8 },
  drag: { stiffness: 260, damping: 26, mass: 1 },
};

/** Minimum element area (px^2) below which the displacement filter is skipped. */
export const GLASS_MIN_FILTER_AREA = 64;
