import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeInDown, DURATION } from "@/lib/motion";

export interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface AnimatedDropdownProps {
  items: DropdownItem[];
  value?: string;
  placeholder?: string;
  onSelect: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * AnimatedDropdown - Dropdown menu with Framer Motion animations
 *
 * Features:
 * - Slide + fade animation on open/close
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Reduced motion support
 */
export function AnimatedDropdown({
  items,
  value,
  placeholder = "Select...",
  onSelect,
  className,
  disabled,
}: AnimatedDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selectedItem = items.find((item) => item.value === value);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  function handleKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;

    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          const item = items[highlightedIndex];
          if (!item.disabled) {
            onSelect(item.value);
            setIsOpen(false);
          }
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < items.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : items.length - 1
          );
        }
        break;
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 min-w-[150px]",
          "rounded-md border border-input bg-background text-sm",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors"
        )}
      >
        <span className={cn(!selectedItem && "text-muted-foreground")}>
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: DURATION.fast }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            ref={listRef}
            variants={fadeInDown}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="listbox"
            className={cn(
              "absolute z-50 mt-1 w-full min-w-[150px]",
              "rounded-md border border-border bg-popover shadow-md",
              "py-1 max-h-[200px] overflow-auto"
            )}
          >
            {items.map((item, index) => (
              <li
                key={item.value}
                role="option"
                aria-selected={item.value === value}
                aria-disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    onSelect(item.value);
                    setIsOpen(false);
                  }
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer",
                  "transition-colors",
                  highlightedIndex === index && "bg-accent",
                  item.value === value && "font-medium",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
