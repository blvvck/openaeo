import * as React from "react";
import { cn } from "@/lib/utils";

export interface KeyboardShortcutProps {
  /** The shortcut keys (e.g., ["cmd", "k"] or ["ctrl", "shift", "p"]) */
  keys: string[];
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

// Map common key names to display symbols
const KEY_MAP: Record<string, { mac: string; other: string }> = {
  cmd: { mac: "\u2318", other: "Ctrl" },
  command: { mac: "\u2318", other: "Ctrl" },
  ctrl: { mac: "\u2303", other: "Ctrl" },
  control: { mac: "\u2303", other: "Ctrl" },
  alt: { mac: "\u2325", other: "Alt" },
  option: { mac: "\u2325", other: "Alt" },
  shift: { mac: "\u21E7", other: "Shift" },
  enter: { mac: "\u21A9", other: "Enter" },
  return: { mac: "\u21A9", other: "Enter" },
  backspace: { mac: "\u232B", other: "Backspace" },
  delete: { mac: "\u2326", other: "Del" },
  escape: { mac: "Esc", other: "Esc" },
  esc: { mac: "Esc", other: "Esc" },
  tab: { mac: "\u21E5", other: "Tab" },
  space: { mac: "Space", other: "Space" },
  up: { mac: "\u2191", other: "\u2191" },
  down: { mac: "\u2193", other: "\u2193" },
  left: { mac: "\u2190", other: "\u2190" },
  right: { mac: "\u2192", other: "\u2192" },
};

/**
 * Detect if user is on macOS
 */
function isMac(): boolean {
  if (typeof window === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Format a key for display
 */
function formatKey(key: string, mac: boolean): string {
  const normalized = key.toLowerCase();
  const mapping = KEY_MAP[normalized];

  if (mapping) {
    return mac ? mapping.mac : mapping.other;
  }

  // Return uppercase single letters, otherwise as-is
  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key;
}

/**
 * KeyboardShortcut - Display keyboard shortcut hints
 *
 * Shows OS-appropriate modifier keys (Cmd on Mac, Ctrl on others).
 *
 * @example
 * <KeyboardShortcut keys={["cmd", "k"]} />  // Shows ⌘K on Mac, Ctrl+K on Windows
 * <KeyboardShortcut keys={["shift", "enter"]} />
 */
export function KeyboardShortcut({
  keys,
  className,
  size = "sm",
}: KeyboardShortcutProps) {
  const mac = isMac();

  const sizeClasses = {
    sm: "text-[10px] px-1 py-0.5 min-w-[18px]",
    md: "text-xs px-1.5 py-0.5 min-w-[22px]",
  };

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {keys.map((key, index) => (
        <React.Fragment key={key + index}>
          <kbd
            className={cn(
              "inline-flex items-center justify-center",
              "font-mono font-medium",
              "rounded border border-border bg-muted text-muted-foreground",
              sizeClasses[size]
            )}
          >
            {formatKey(key, mac)}
          </kbd>
          {/* Show + between non-Mac modifier keys */}
          {!mac && index < keys.length - 1 && (
            <span className="text-muted-foreground text-[10px]">+</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * KeyboardShortcutBadge - Inline badge showing a shortcut
 *
 * For use inside buttons, menu items, etc.
 */
export function KeyboardShortcutBadge({
  keys,
  className,
}: Omit<KeyboardShortcutProps, "size">) {
  return (
    <KeyboardShortcut
      keys={keys}
      size="sm"
      className={cn("ml-auto opacity-60", className)}
    />
  );
}
