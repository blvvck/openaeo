import { cn } from '@/lib/utils';

interface CardFooterSummaryProps {
    /** Footer content — supports React nodes for highlighted text */
    children?: React.ReactNode;
    /** Plain text fallback (if children not provided) */
    text?: string;
    /** Dot color (e.g. 'bg-figma-green', 'bg-figma-red') */
    dotColor?: string;
    /** Align content */
    align?: 'left' | 'right';
    /** Additional classes */
    className?: string;
}

/**
 * CardFooterSummary — Dot + summary text for card footers.
 *
 * Pattern: dot indicator + text (supports rich content via children).
 * Designed to sit inside ContentCard's `footer` prop.
 *
 * Usage:
 *   <CardFooterSummary text="72% from positive sources" />
 *   <CardFooterSummary>
 *     <span className="text-figma-green font-bold">72%</span> from positive sources
 *   </CardFooterSummary>
 */
export function CardFooterSummary({
    children,
    text,
    dotColor = 'bg-figma-green',
    align = 'right',
    className,
}: CardFooterSummaryProps) {
    return (
        <div className={cn(
            'flex items-center gap-2',
            align === 'right' ? 'justify-end' : 'justify-start',
            className,
        )}>
            <div className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
            <span className="text-figma-xs font-medium text-figma-secondary">
                {children || text}
            </span>
        </div>
    );
}

export default CardFooterSummary;
