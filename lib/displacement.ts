export interface DisplacementMapOptions {
  width: number;
  height: number;
  radius: number;
  /** width of the lens-bevel band hugging the edge, in px */
  edge: number;
  /** neutral padding drawn around the shape, in px — see below */
  margin: number;
}

/** below this the normal is degenerate and the side test decides the direction */
const EPSILON = 1e-6;

/**
 * Largest share of the short side the bevel may occupy. A rim only reads as a
 * rim while undisturbed surface is left inside it: at a third, a 36px button
 * refracts 24 of its 36px and turns into a frosted lozenge.
 */
const MAX_BAND_RATIO = 0.2;

/**
 * Bevel width for an element of this size: `edge` px, cut down when the element
 * is too small to carry it. Exported because the filter has to scale its
 * deflection by the same factor — pulling the backdrop 15px through a 7px band
 * smears it instead of bending it.
 */
export function resolveBand(width: number, height: number, edge: number) {
  const short = Math.min(Math.max(1, width), Math.max(1, height));
  return Math.max(1, Math.min(edge, short * MAX_BAND_RATIO));
}

/**
 * Signed distance to a rounded rect centred on the origin, plus the outward
 * unit normal at that point. Negative distance is inside. Computed per pixel
 * rather than approximated with gradients: the corners are exactly where a
 * separable x/y ramp goes wrong.
 */
function fieldAt(
  px: number,
  py: number,
  halfW: number,
  halfH: number,
  r: number,
  out: { dist: number; nx: number; ny: number },
) {
  const qx = Math.abs(px) - (halfW - r);
  const qy = Math.abs(py) - (halfH - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const outer = Math.hypot(ox, oy);

  out.dist = outer + Math.min(Math.max(qx, qy), 0) - r;

  let nx: number;
  let ny: number;
  if (outer > EPSILON) {
    // in a corner quadrant: the normal points away from the corner's centre
    nx = ox / outer;
    ny = oy / outer;
  } else if (qx > qy) {
    nx = 1;
    ny = 0;
  } else {
    nx = 0;
    ny = 1;
  }
  out.nx = px < 0 ? -nx : nx;
  out.ny = py < 0 ? -ny : ny;
}

/**
 * Builds the bump map fed to feDisplacementMap: a *normal* map, not a grayscale
 * one. R carries the horizontal component of the bevel's slope and G the
 * vertical, both centred on 128, so every point of the rim bends the backdrop
 * along its own outward normal — left edge samples further left, top edge
 * further up, corners diagonally. A gray ring can't express that: R and G move
 * together, so the whole rim displaces one way regardless of which side it's on.
 *
 * The ramp is quadratic, neutral across the interior and growing to full
 * deflection at the border, so interior pixels get zero offset rather than a
 * small one. Growing a pane then adds untouched middle instead of spreading
 * distortion over the content.
 *
 * `edge` is absolute px so a card and a button carry the same rim; see
 * `resolveBand` for the small-element cap.
 *
 * `margin` grows the map past the shape on every side and the caller places it
 * at `-margin`, keeping it registered 1:1 with the element. Deflection is held
 * at full outside the shape so the downstream blur can't dip it back toward
 * neutral right at the rim.
 *
 * Returns null without a DOM (SSR): the caller then renders no filter and the
 * CSS blur/tint layers carry the material alone.
 */
export function buildDisplacementMap({
  width,
  height,
  radius,
  edge,
  margin,
}: DisplacementMapOptions): string | null {
  if (typeof document === "undefined") return null;

  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const m = Math.max(0, Math.round(margin));
  const short = Math.min(w, h);
  const r = Math.max(0, Math.min(radius, short / 2));
  const band = resolveBand(w, h, edge);

  const mapW = w + m * 2;
  const mapH = h + m * 2;

  const canvas = document.createElement("canvas");
  canvas.width = mapW;
  canvas.height = mapH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const image = ctx.createImageData(mapW, mapH);
  const data = image.data;
  const halfW = w / 2;
  const halfH = h / 2;
  const field = { dist: 0, nx: 0, ny: 0 };

  for (let y = 0; y < mapH; y++) {
    // sample at pixel centres, in the element's own coordinate space
    const py = y + 0.5 - m - halfH;

    for (let x = 0; x < mapW; x++) {
      const px = x + 0.5 - m - halfW;
      fieldAt(px, py, halfW, halfH, r, field);

      const t = field.dist >= 0 ? 1 : Math.max(0, 1 + field.dist / band);
      const amount = t * t;

      const i = (y * mapW + x) * 4;
      data[i] = 128 + Math.round(field.nx * amount * 127);
      data[i + 1] = 128 + Math.round(field.ny * amount * 127);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}
