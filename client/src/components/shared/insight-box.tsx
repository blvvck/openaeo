/**
 * InsightBox — Muted insight/tip message box
 *
 * Used for contextual tips, empty state messages, and insights.
 * Appears as a subtle box with lightbulb icon.
 */

import { Lightbulb, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightBoxProps {
  /** Message to display (alternative to children) */
  message?: string;
  /** Children content (alternative to message) */
  children?: React.ReactNode;
  /** Custom icon (default: Lightbulb) */
  icon?: LucideIcon;
  /** Variant affects colors */
  variant?: 'default' | 'muted';
  /** Additional classes */
  className?: string;
}

export function InsightBox({
  message,
  children,
  icon: Icon = Lightbulb,
  variant = 'default',
  className,
}: InsightBoxProps) {
  const iconColor = variant === 'muted' ? 'text-figma-muted' : 'text-figma-secondary';
  const textColor = variant === 'muted' ? 'text-figma-muted' : 'text-figma-secondary';
  const content = children || message;

  return (
    <div
      className={cn(
        'bg-figma-hover rounded-lg p-3 flex items-start gap-2',
        className,
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', iconColor)} />
      <p className={cn('text-figma-xs leading-relaxed', textColor)}>
        {content}
      </p>
    </div>
  );
}

export default InsightBox;
