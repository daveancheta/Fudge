"use client";

import * as React from "react";
import { useGlassConfig } from "./context";
import { buildDisplacementMap, resolveBand } from "./displacement";
import type { GlassVariant } from "./types";

interface GlassFilterProps {
  id: string;
  variant: GlassVariant;
  width: number;
  height: number;
  radius: number;
}

/**
 * Renders the hidden SVG that holds the actual refraction filter. Referenced
 * from CSS as `backdrop-filter: blur(...) url(#id)`. Chromium applies the
 * full displacement + chromatic-aberration chain; browsers that don't
 * support an SVG filter reference inside backdrop-filter simply ignore it
 * and fall back to the blur/saturate/specular layers, which is why this
 * only ever adds a bonus layer, never load-bearing.
 */
export function GlassFilter({
  id,
  variant,
  width,
  height,
  radius,
}: GlassFilterProps) {
  const cfg = useGlassConfig().displacement[variant];

  /**
   * How much of the configured bevel this element can carry. Small controls get
   * a narrower band (see `resolveBand`) and the deflection has to come down
   * with it: bending the backdrop further than the band is wide drags samples
   * from past the far side of the rim.
   */
  const scale = resolveBand(width, height, cfg.edge) / cfg.edge;
  const strength = cfg.strength * scale;

  /** px of slack around the element: enough for the blurred map to settle and
   *  for the rim to sample backdrop from just outside the border box */
  const margin = Math.ceil(strength + cfg.blur * 3);

  const mapUri = React.useMemo(() => {
    if (width <= 0 || height <= 0) return null;
    return buildDisplacementMap({
      width,
      height,
      radius,
      edge: cfg.edge,
      margin,
    });
  }, [width, height, radius, cfg.edge, margin]);

  if (!mapUri) return null;

  /* the map's full deflection is 127/255 off centre, i.e. half a unit, so a
     `scale` of 2n buys n px of pull at the rim — config states the px. */
  const base = strength * 2;
  const aberration = cfg.chromaticAberration * scale * 2;

  return (
    <svg
      data-slot="glass-filter"
      aria-hidden="true"
      focusable="false"
      className="absolute h-0 w-0 overflow-hidden"
    >
      <defs>
        {/* everything sized in px against the element's own box: with
            percentage regions the map's placement is left to the filter
            region and the backdrop ends up offset from the surface it
            belongs to */}
        <filter
          id={id}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          x={-margin}
          y={-margin}
          width={width + margin * 2}
          height={height + margin * 2}
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={mapUri}
            preserveAspectRatio="none"
            x={-margin}
            y={-margin}
            width={width + margin * 2}
            height={height + margin * 2}
            result="map"
          />
          <feGaussianBlur
            in="map"
            stdDeviation={cfg.blur}
            result="mapBlurred"
          />

          <feDisplacementMap
            in="SourceGraphic"
            in2="mapBlurred"
            scale={base - aberration}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dispR"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="mapBlurred"
            scale={base}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dispG"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="mapBlurred"
            scale={base + aberration}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dispB"
          />

          <feColorMatrix
            in="dispR"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="onlyR"
          />
          <feColorMatrix
            in="dispG"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="onlyG"
          />
          <feColorMatrix
            in="dispB"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="onlyB"
          />

          <feBlend in="onlyR" in2="onlyG" mode="screen" result="rg" />
          <feBlend in="rg" in2="onlyB" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
}
