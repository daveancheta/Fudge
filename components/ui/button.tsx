import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        inverted: "bg-background text-foreground shadow-xs hover:bg-background/90",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        prominent: "bg-sky-300 text-slate-950 shadow-xs hover:bg-sky-200",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
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
    defaultVariants: {
      variant: "default",
      tinted: false,
      size: "default",
    },
  },
);

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
    <Comp
      data-slot="button"
      data-variant={variant}
      data-tinted={tinted}
      data-size={size}
      className={cn(buttonVariants({ variant, tinted, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
