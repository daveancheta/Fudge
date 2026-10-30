export type GlassVariant = "default" | "blur" | "transparent";

export type GlassQuality = "full" | "reduced" | "none";

export interface GlassDisplacementConfig {
  /** how far the rim pulls the backdrop at its deepest point, in px — keep it
   *  under `edge` or the bevel folds the backdrop over itself and smears */
  strength: number;
  /** width of the lens-bevel band hugging the edge, in px — absolute, so a
   *  large surface keeps the same thin rim instead of warping its whole area */
  edge: number;
  /** px of separation between the R/G/B samples at the rim — this is a fringe
   *  on the edge, so single digits; tens of px read as a rainbow halo */
  chromaticAberration: number;
  /** feGaussianBlur stdDeviation applied to the bump map before displacing, in
   *  px — the map is already smooth, this only hides 8-bit banding */
  blur: number;
}

export interface GlassSpecularConfig {
  /** peak highlight opacity, 0-1 */
  intensity: number;
  /** radius in px of the glint that travels along the rim with the pointer */
  size: number;
  /** resting rotation (deg) of the two specular arcs around the rim */
  angle: number;
  /** deg the arcs rotate as the surface crosses the viewport, so scrolling
   *  swings the light around the border */
  travel: number;
  /** width in px of the soft inner glow hugging the edge */
  edge: number;
  /** width in px of the crisp specular line drawn on the edge itself */
  rim: number;
}

export interface GlassSpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
}
