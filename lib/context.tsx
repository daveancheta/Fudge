"use client";

import * as React from "react";
import { GLASS_DISPLACEMENT, GLASS_SPECULAR, GLASS_SPRING } from "./config";
import type {
  GlassDisplacementConfig,
  GlassSpecularConfig,
  GlassSpringConfig,
  GlassVariant,
} from "./types";

export interface GlassConfig {
  spring: Record<"press" | "hover" | "drag", GlassSpringConfig>;
  displacement: Record<GlassVariant, GlassDisplacementConfig>;
  specular: GlassSpecularConfig;
}

const defaultConfig: GlassConfig = {
  spring: GLASS_SPRING,
  displacement: GLASS_DISPLACEMENT,
  specular: GLASS_SPECULAR,
};

const GlassConfigContext = React.createContext<GlassConfig>(defaultConfig);

type GlassConfigOverride = {
  spring?: { [K in keyof GlassConfig["spring"]]?: Partial<GlassSpringConfig> };
  displacement?: {
    [K in GlassVariant]?: Partial<GlassDisplacementConfig>;
  };
  specular?: Partial<GlassSpecularConfig>;
};

/**
 * Overrides the JS-side tunables — springs, refraction, specular — for every
 * Pane component inside it. Optional: without a provider, components read the
 * values in `config.ts`. Overrides merge onto the nearest parent, so a subtree
 * can change just the springs and keep everything else.
 */
export function GlassConfigProvider({
  value,
  children,
}: {
  value: GlassConfigOverride;
  children: React.ReactNode;
}) {
  const parent = React.useContext(GlassConfigContext);
  const merged = React.useMemo<GlassConfig>(
    () => ({
      // two levels deep: `press: { stiffness }` keeps press's damping and mass
      spring: {
        press: { ...parent.spring.press, ...value.spring?.press },
        hover: { ...parent.spring.hover, ...value.spring?.hover },
        drag: { ...parent.spring.drag, ...value.spring?.drag },
      },
      displacement: {
        default: {
          ...parent.displacement.default,
          ...value.displacement?.default,
        },
        blur: { ...parent.displacement.blur, ...value.displacement?.blur },
        transparent: {
          ...parent.displacement.transparent,
          ...value.displacement?.transparent,
        },
      },
      specular: { ...parent.specular, ...value.specular },
    }),
    [parent, value],
  );

  return (
    <GlassConfigContext.Provider value={merged}>
      {children}
    </GlassConfigContext.Provider>
  );
}

export function useGlassConfig() {
  return React.useContext(GlassConfigContext);
}
