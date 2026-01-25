import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-fit rounded-xl border border-border bg-card p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-3",
        caption: "relative flex h-8 items-center justify-center",
        caption_label: "text-sm font-semibold",
        nav: "flex items-center gap-1",
        nav_button: "inline-flex size-8 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors hover:bg-accent",
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-9 rounded-md text-center text-xs font-medium text-muted-foreground",
        row: "mt-1 flex w-full",
        cell: "relative size-9 p-0 text-center text-sm focus-within:z-10",
        day: "size-9 rounded-md font-normal text-foreground hover:bg-accent aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected: "bg-primary text-primary-foreground",
        day_today: "font-bold ring-1 ring-primary",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-40",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
