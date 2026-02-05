import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// ============================================================================
// StatMetric — Hero number + trend for Row 1 cards
// ============================================================================

interface StatMetricProps {
    /** The main metric value (e.g. "42%", "1.2K") */
    value: string | number;
    /** Trend percentage change */
    trend?: number;
    /** Optional suffix for the value (e.g. "%") */
    valueSuffix?: string;
    /** Additional classes for the container */
    className?: string;
}

/**
 * StatMetric — Large hero number with trend indicator.
 *
 * Fixed-height container (h-[38px]) ensures Row 1 cards align.
 *
 * Usage:
 *   <StatMetric value={42} trend={5.2} valueSuffix="%" />
 */
export function StatMetric({ value, trend, valueSuffix = '', className }: StatMetricProps) {
    const trendSign = (trend ?? 0) > 0 ? '+' : '';
    const isPositive = (trend ?? 0) > 0;
    const isNeutral = trend === 0;

    // Determine trend color: positive=green, negative=red, neutral=muted
    const trendColor = isPositive
        ? 'text-figma-trend-up'
        : isNeutral
            ? 'text-figma-muted'
            : 'text-figma-trend-down';

    return (
        <div className={cn('h-[38px] flex items-center mt-2 mb-1', className)}>
            <div className="flex items-baseline gap-2">
                <span className="text-figma-lg font-bold text-figma-primary tabular-nums leading-none">
                    {value}{valueSuffix}
                </span>
                {trend !== undefined && (
                    <span className={cn('text-figma-base font-semibold', trendColor)}>
                        {isNeutral ? '—%' : `${trendSign}${trend}%`}
                    </span>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// HoverArrow — Appears on card hover (Row 1 pattern)
// ============================================================================

interface HoverArrowProps {
    className?: string;
}

/**
 * HoverArrow — Absolute-positioned arrow that fades in on group hover.
 *
 * Parent must have `group` and `relative` classes.
 */
export function HoverArrow({ className }: HoverArrowProps) {
    return (
        <ArrowUpRight
            className={cn(
                'absolute top-4 right-4 w-4 h-4 text-figma-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                className
            )}
        />
    );
}

// ============================================================================
// CardLabel — Small header label for Row 1 cards
// ============================================================================

interface CardLabelProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * CardLabel — "Citation rate", "Bot visits", "Top prompt" style header.
 */
export function CardLabel({ children, className }: CardLabelProps) {
    return (
        <span className={cn('text-figma-xs font-normal text-figma-secondary', className)}>
            {children}
        </span>
    );
}

// ============================================================================
// CardSubtitle — Small muted subtitle below hero metric
// ============================================================================

interface CardSubtitleProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * CardSubtitle — "of responses cite you", "past 7 days" style text.
 */
export function CardSubtitle({ children, className }: CardSubtitleProps) {
    return (
        <span className={cn('text-figma-2xs font-normal text-figma-muted', className)}>
            {children}
        </span>
    );
}

// ============================================================================
// CardDivider — Horizontal line separator
// ============================================================================

interface CardDividerProps {
    /** 'light' uses border-light, 'default' uses border */
    variant?: 'default' | 'light';
    className?: string;
}

/**
 * CardDivider — 1px horizontal separator between card sections.
 */
export function CardDivider({ variant = 'default', className }: CardDividerProps) {
    return (
        <div className={cn(
            'h-px my-4',
            variant === 'light' ? 'bg-figma-border-light' : 'bg-figma-border',
            className
        )} />
    );
}

export default StatMetric;


// ============================================================================
// MetricStatCard — Compact stat card: label, hero value, optional subtitle
// ============================================================================

interface MetricStatCardProps {
    label: string;
    value: string | number;
    trend?: number;
    subtitle?: string;
    onClick?: () => void;
    className?: string;
}

export function MetricStatCard({
    label,
    value,
    trend,
    subtitle,
    onClick,
    className,
}: MetricStatCardProps) {
    return (
        <Card
            onClick={onClick}
            className={cn(
                'border-figma-border rounded-xl bg-white',
                onClick && 'cursor-pointer hover:shadow-md transition-shadow',
                className,
            )}
        >
            <CardContent className="p-5">
                <CardLabel>{label}</CardLabel>
                <StatMetric value={value} trend={trend} />
                {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
            </CardContent>
        </Card>
    );
}

// ============================================================================
// MetricListScroller — Fixed header above a scrollable list
// ============================================================================

interface MetricListScrollerProps {
    header: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export function MetricListScroller({ header, children, className }: MetricListScrollerProps) {
    return (
        <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
            <div className="mb-1.5 border-b border-figma-border-light pb-1.5">
                {header}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
                {children}
            </div>
        </div>
    );
}
