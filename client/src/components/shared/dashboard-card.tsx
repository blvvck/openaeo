import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

// ============================================================================
// ContentCard — Large card wrapper (Row 2-3 pattern)
// ============================================================================

interface ContentCardProps {
    /** Card title (e.g. "LLM mentions") */
    title: string;
    /** Subtitle below title */
    subtitle?: string;
    /** Action button text (e.g. "View all") */
    actionLabel?: string;
    /** Click handler for action button */
    onAction?: () => void;
    /** Hide the chevron icon after action label (use for "Add" actions) */
    hideActionIcon?: boolean;
    /** Custom content for header right side (replaces action button) */
    headerRight?: React.ReactNode;
    /** Card content */
    children: React.ReactNode;
    /** Optional footer */
    footer?: React.ReactNode;
    /** Additional card classes */
    className?: string;
    /** Additional content area classes */
    contentClassName?: string;
}

/**
 * ContentCard — Reusable wrapper for Row 2-3 style dashboard cards.
 *
 * Pattern: Header (title + subtitle + action) → divider → content → optional footer.
 * Uses figma-* design tokens throughout.
 */
export function ContentCard({
    title,
    subtitle,
    actionLabel = 'View all',
    onAction,
    hideActionIcon = false,
    headerRight,
    children,
    footer,
    className,
    contentClassName,
}: ContentCardProps) {
    return (
        <Card className={cn(
            'flex flex-col border-figma-border rounded-xl bg-figma-card min-w-0 overflow-hidden',
            className
        )}>
            <CardHeader className="pb-4 pt-6 px-5 select-none">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="block text-figma-md font-semibold text-figma-primary leading-tight">
                            {title}
                        </span>
                        {subtitle && (
                            <span className="text-figma-sm font-normal text-figma-secondary mt-0.5">
                                {subtitle}
                            </span>
                        )}
                    </div>
                    {headerRight ? headerRight : onAction && (
                        <button
                            onClick={onAction}
                            className="inline-flex items-center gap-0.5 text-figma-sm font-normal text-figma-blue hover:underline transition-all"
                        >
                            {actionLabel}
                            {!hideActionIcon && <ChevronRight className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </CardHeader>

            <div className="h-px bg-figma-border-light mx-5" />

            <CardContent className={cn('pt-4 px-5 pb-4', contentClassName)}>
                {children}
            </CardContent>

            {footer && (
                <div className="mx-5 pt-4 pb-5 border-t border-figma-border-light mt-auto">
                    {footer}
                </div>
            )}
        </Card>
    );
}

// ============================================================================
// MetricCard — Small card wrapper (Row 1 pattern)
// ============================================================================

interface MetricCardProps {
    /** Card content */
    children: React.ReactNode;
    /** Click handler */
    onClick?: () => void;
    /** Additional classes */
    className?: string;
}

/**
 * MetricCard — Reusable wrapper for Row 1 style stat cards.
 *
 * Pattern: Clickable card with hover arrow, p-5 content area, group hover effects.
 * Fixed height (260px) ensures consistent card heights across the row.
 */
export function MetricCard({
    children,
    onClick,
    className,
}: MetricCardProps) {
    return (
        <Card
            onClick={onClick}
            className={cn(
                'group cursor-pointer hover:shadow-md transition-all duration-200 border-figma-border rounded-xl bg-white min-w-0 overflow-hidden h-[260px]',
                className
            )}
        >
            <CardContent className="p-5 overflow-hidden relative h-full flex flex-col">
                {children}
            </CardContent>
        </Card>
    );
}

export default ContentCard;
