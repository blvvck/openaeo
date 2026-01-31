import * as React from "react";
import { ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<string, { label?: React.ReactNode; color?: string }>;

type ChartContainerProps = Omit<React.ComponentProps<typeof ResponsiveContainer>, "children" | "style"> & {
  config: ChartConfig;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ config, children, className, style, width = "100%", height = "100%", ...props }, ref) => {
    const variables = Object.fromEntries(
      Object.entries(config).flatMap(([name, item]) => item.color ? [[`--chart-${name}`, item.color]] : []),
    ) as React.CSSProperties;

    return (
      <div ref={ref} className={cn("min-w-0", className)} style={{ ...variables, ...style }}>
        <ResponsiveContainer width={width} height={height} {...props}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    );
  },
);
ChartContainer.displayName = "ChartContainer";

export { ChartContainer };
