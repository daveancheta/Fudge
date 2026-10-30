import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { Pane } from "@/components/ui/pane";
import { cn } from "@/lib/utils";

const wrapperVariants = cva("inline-flex shrink-0", {
  variants: {
    size: {
      default: "",
      xs: "",
      sm: "",
      lg: "",
      icon: "",
      "icon-xs": "",
      "icon-sm": "",
      "icon-lg": "",
    },
  },
  defaultVariants: { size: "default" },
});

const radiusBySize: Record<string, number> = {
  default: 16,
  xs: 11,
  sm: 13,
  lg: 20,
  icon: 16,
  "icon-xs": 11,
  "icon-sm": 13,
  "icon-lg": 20,
};

const buttonVariants = cva(
  // flex-1: when a parent stretches the glass (a stacked dialog footer, say)
  // the button fills it and keeps its label centred
  "inline-flex flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap text-sm font-medium outline-none transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-foreground",
        inverted: "text-background",
        ghost: "text-foreground",
        prominent: "",
        destructive: "",
      },
      tinted: {
        true: "",
        false: "",
      },
      size: {
        default: "h-9 px-4",
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg]:size-3",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "size-9 px-0",
        "icon-xs": "size-7 px-0 [&_svg]:size-3",
        "icon-sm": "size-8 px-0",
        "icon-lg": "size-11 px-0",
      },
    },
    compoundVariants: [
      {
        variant: "prominent",
        tinted: false,
        className: "text-[var(--pane-accent-foreground)]",
      },
      {
        variant: "prominent",
        tinted: true,
        className: "text-[var(--pane-accent-text)]",
      },
      { variant: "destructive", tinted: false, className: "text-white" },
      {
        variant: "destructive",
        tinted: true,
        className: "text-[var(--pane-destructive-text)]",
      },
    ],
    defaultVariants: {
      variant: "default",
      tinted: false,
      size: "default",
    },
  },
);

/**
 * What the glass itself does per variant. Filled is dense, so the label
 * reads, but the rim and glint still show; tinted is a wash of the color
 * with the label carrying it. Default is the plain material; inverted
 * fills it with the text color instead.
 */
const glassByVariant = {
  default: { filled: "", tinted: "" },
  // the opposite of the theme: dark on light, light on dark
  inverted: {
    filled:
      "[--pane-tint-default:color-mix(in_oklab,var(--foreground)_92%,transparent)] [--pane-nested-default:color-mix(in_oklab,var(--foreground)_92%,transparent)]",
    tinted:
      "[--pane-tint-default:color-mix(in_oklab,var(--foreground)_92%,transparent)] [--pane-nested-default:color-mix(in_oklab,var(--foreground)_92%,transparent)]",
  },
  // no glass until it is touched: for buttons that sit on another surface,
  // where glass on glass would stack
  ghost: {
    filled:
      "[--pane-nested-default:transparent] [--pane-border-default:transparent] [--pane-highlight:transparent] [--pane-shadow:transparent] hover:[--pane-nested-default:color-mix(in_oklab,var(--foreground)_7%,transparent)] has-[:active]:[--pane-nested-default:color-mix(in_oklab,var(--foreground)_12%,transparent)]",
    tinted:
      "[--pane-nested-default:transparent] [--pane-border-default:transparent] [--pane-highlight:transparent] [--pane-shadow:transparent] hover:[--pane-nested-default:color-mix(in_oklab,var(--foreground)_7%,transparent)] has-[:active]:[--pane-nested-default:color-mix(in_oklab,var(--foreground)_12%,transparent)]",
  },
  prominent: {
    filled:
      "[--pane-tint-default:color-mix(in_oklab,var(--pane-accent)_92%,transparent)] [--pane-nested-default:color-mix(in_oklab,var(--pane-accent)_92%,transparent)] [--pane-border-default:var(--pane-border-accent)]",
    tinted:
      "[--pane-tint-default:color-mix(in_oklab,var(--pane-accent)_var(--pane-tinted-opacity),transparent)] [--pane-nested-default:color-mix(in_oklab,var(--pane-accent)_var(--pane-tinted-opacity),transparent)]",
  },
  destructive: {
    filled:
      "[--pane-tint-default:color-mix(in_oklab,var(--pane-destructive)_92%,transparent)] [--pane-nested-default:color-mix(in_oklab,var(--pane-destructive)_92%,transparent)] [--pane-border-default:var(--pane-border-accent)]",
    tinted:
      "[--pane-tint-default:color-mix(in_oklab,var(--pane-destructive)_var(--pane-tinted-opacity),transparent)] [--pane-nested-default:color-mix(in_oklab,var(--pane-destructive)_var(--pane-tinted-opacity),transparent)]",
  },
};

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant = "default",
  tinted = false,
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Pane
      interactive
      // nested skips the backdrop: no blur or refraction to hide
      nested={variant === "ghost" || undefined}
      radius={radiusBySize[size ?? "default"]}
      className={cn(
        wrapperVariants({ size }),
        // keyboard only: `focus-within` leaves the ring painted around the pane
        // after every mouse click
        "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-offset-0",
        glassByVariant[variant ?? "default"][tinted ? "tinted" : "filled"],
      )}
    >
      <Comp
        data-slot="button"
        data-variant={variant}
        data-tinted={tinted}
        data-size={size}
        className={cn(
          buttonVariants({ variant, tinted, size, className }),
          "bg-transparent",
        )}
        {...props}
      />
    </Pane>
  );
}

export { Button, buttonVariants };
