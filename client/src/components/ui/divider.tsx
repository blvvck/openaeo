import * as React from "react";

import { cn } from "@/lib/utils";

type DividerProps = React.HTMLAttributes<HTMLHRElement | HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
};

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: DividerProps) {
  if (orientation === "horizontal") {
    return (
      <hr
        aria-hidden={decorative || undefined}
        className={cn("my-0 h-px w-full border-0 bg-border", className)}
        {...props}
      />
    );
  }

  return (
    <div
      role={decorative ? undefined : "separator"}
      aria-hidden={decorative || undefined}
      aria-orientation={decorative ? undefined : "vertical"}
      className={cn("mx-0 h-full w-px shrink-0 bg-border", className)}
      {...props}
    />
  );
}

export { Separator };
