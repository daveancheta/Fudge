import type * as React from "react";
import { Pane } from "@/components/ui/pane";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <Pane
      radius={14}
      className="h-10 w-full focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:ring-offset-0 has-[:disabled]:opacity-50"
    >
      <input
        type={type}
        data-slot="input"
        className={cn(
          "flex h-10 w-full min-w-0 bg-transparent px-3.5 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className,
        )}
        {...props}
      />
    </Pane>
  );
}

export { Input };
