import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/option-picker";

export interface FilterOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>;
}

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  className?: string;
}

export function FilterSelect({ value, onValueChange, options, placeholder, className }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-7 w-auto gap-1.5 rounded-md px-2 text-figma-2xs whitespace-nowrap [&>svg]:size-3.5",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="pl-3 pr-3 text-figma-2xs data-[state=checked]:font-medium [&>span.absolute]:hidden"
          >
            {option.icon ? <span className="mr-2 inline-flex items-center">{option.icon}</span> : null}
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function FilterSearch({ value, onChange, placeholder = "Search...", className }: FilterSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-figma-muted" aria-hidden="true" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-7 pl-8 text-figma-2xs md:text-figma-2xs placeholder:text-figma-muted"
      />
    </div>
  );
}
