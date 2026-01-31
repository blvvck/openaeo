

import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/action-menu';
import { useTheme, Theme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  /** 'dropdown' shows all options, 'simple' is a single button toggle */
  variant?: 'dropdown' | 'simple';
  /** Show label next to icon */
  showLabel?: boolean;
  /** Size of the toggle button */
  size?: 'sm' | 'md';
  /** Additional class names */
  className?: string;
}

/**
 * Theme toggle with dropdown menu for light/dark/system selection
 */
function ThemeToggleDropdown({
  showLabel,
  size = 'md',
  className,
}: Omit<ThemeToggleProps, 'variant'>) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            buttonSize,
            showLabel && 'w-auto px-3 gap-2',
            className
          )}
          aria-label={`Current theme: ${resolvedTheme}. Click to change theme.`}
        >
          <Sun
            className={cn(
              iconSize,
              'rotate-0 scale-100 transition-all',
              'dark:-rotate-90 dark:scale-0'
            )}
          />
          <Moon
            className={cn(
              iconSize,
              'absolute rotate-90 scale-0 transition-all',
              'dark:rotate-0 dark:scale-100',
              showLabel && 'relative'
            )}
          />
          {showLabel && (
            <span className="text-sm font-medium capitalize">
              {theme === 'system' ? `System (${resolvedTheme})` : theme}
            </span>
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            {theme === value && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple theme toggle button (light <-> dark)
 */
function ThemeToggleSimple({
  showLabel,
  size = 'md',
  className,
}: Omit<ThemeToggleProps, 'variant'>) {
  const { resolvedTheme, toggleTheme } = useTheme();

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        buttonSize,
        showLabel && 'w-auto px-3 gap-2',
        className
      )}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Sun
        className={cn(
          iconSize,
          'rotate-0 scale-100 transition-all',
          'dark:-rotate-90 dark:scale-0'
        )}
      />
      <Moon
        className={cn(
          iconSize,
          'absolute rotate-90 scale-0 transition-all',
          'dark:rotate-0 dark:scale-100',
          showLabel && 'relative'
        )}
      />
      {showLabel && (
        <span className="text-sm font-medium capitalize">
          {resolvedTheme}
        </span>
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

/**
 * Theme toggle component
 *
 * @example
 * // Dropdown with light/dark/system options
 * <ThemeToggle />
 *
 * @example
 * // Simple toggle between light and dark
 * <ThemeToggle variant="simple" />
 *
 * @example
 * // With label shown
 * <ThemeToggle showLabel />
 */
export function ThemeToggle({
  variant = 'dropdown',
  ...props
}: ThemeToggleProps) {
  if (variant === 'simple') {
    return <ThemeToggleSimple {...props} />;
  }
  return <ThemeToggleDropdown {...props} />;
}

export default ThemeToggle;
