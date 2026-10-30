import { cva, type VariantProps } from "class-variance-authority";

export const paneVariants = cva(
  "relative isolate text-[color:var(--pane-fg)] transition-colors",
  {
    variants: {
      variant: {
        default: "",
        blur: "",
        transparent: "",
      },
      interactive: {
        true: "cursor-pointer select-none",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
    },
  },
);

export type PaneVariantProps = VariantProps<typeof paneVariants>;

export const paneLayerVariants = cva(
  "pointer-events-none absolute inset-0 rounded-[inherit]",
  {
    variants: {
      layer: {
        backdrop: "",
        tint: "",
        highlight: "mix-blend-screen",
        border: "",
      },
    },
  },
);
