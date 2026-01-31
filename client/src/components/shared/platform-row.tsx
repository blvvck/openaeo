import { cn } from '@/lib/utils';
import { PlatformIcon, getPlatformInfo } from '@/components/ui/platform-icon';

// ============================================================================
// PlatformRow — Icon + name + values (used in multiple Row 1 cards)
// ============================================================================

interface PlatformRowProps {
    /** Platform ID (e.g. 'chatgpt', 'gemini') */
    platformId: string;
    /** Override display name (defaults to getPlatformInfo lookup) */
    name?: string;
    /** Primary value (e.g. "42%") */
    value?: string | number;
    /** Secondary/muted value (e.g. count) */
    secondaryValue?: string | number;
    /** Icon size */
    iconSize?: 'xs' | 'sm';
    /** Muted style for empty states */
    muted?: boolean;
    /** Additional classes */
    className?: string;
}

/**
 * PlatformRow — Platform icon + label on left, value(s) on right.
 *
 * Usage:
 *   <PlatformRow platformId="chatgpt" value="42%" secondaryValue={120} />
 */
export function PlatformRow({
    platformId,
    name,
    value,
    secondaryValue,
    iconSize = 'xs',
    muted = false,
    className,
}: PlatformRowProps) {
    const displayName = name || getPlatformInfo(platformId).name;

    return (
        <div className={cn('flex items-center justify-between', className)}>
            <div className="flex items-center gap-2">
                <PlatformIcon platform={platformId} size={iconSize} />
                <span className={cn(
                    "text-figma-2xs font-normal",
                    muted ? "text-figma-muted" : "text-figma-secondary"
                )}>
                    {displayName}
                </span>
            </div>
            {(value != null || secondaryValue != null) && (
                <div className="flex items-center gap-1.5">
                    {value != null && (
                        <span className={cn(
                            "text-figma-2xs font-medium",
                            muted ? "text-figma-muted" : "text-figma-primary"
                        )}>
                            {value}
                        </span>
                    )}
                    {secondaryValue != null && (
                        <span className="text-figma-2xs font-normal text-figma-muted">
                            {secondaryValue}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// PlatformProgressRow — Icon + name + progress bar + value (LLM mentions)
// ============================================================================

interface PlatformProgressRowProps {
    /** Platform ID */
    platformId: string;
    /** Display name */
    name: string;
    /** Score (0-100) for the bar width */
    score: number;
    /** Bar color (hex) */
    barColor: string;
    /** Mentions count for secondary display */
    mentions?: number;
    /** Click handler */
    onClick?: () => void;
    /** Additional classes */
    className?: string;
}

/**
 * PlatformProgressRow — Full-width platform row with progress bar.
 *
 * Usage:
 *   <PlatformProgressRow platformId="chatgpt" name="ChatGPT" score={85} barColor="#17A34A" mentions={120} />
 */
export function PlatformProgressRow({
    platformId,
    name,
    score,
    barColor,
    mentions,
    onClick,
    className,
}: PlatformProgressRowProps) {
    return (
        <div
            className={cn('flex items-center gap-4', onClick && 'cursor-pointer', className)}
            onClick={onClick}
        >
            <div className="flex items-center gap-2.5 w-[110px] shrink-0" title={name}>
                <PlatformIcon platform={platformId} size="sm" />
                <span className="text-figma-sm font-medium text-figma-primary truncate">
                    {name}
                </span>
            </div>

            <div className="flex-1 h-2 bg-figma-bar-track rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${score}%`, backgroundColor: barColor }}
                />
            </div>

            <div className="flex items-center gap-1 w-[70px] justify-end shrink-0">
                <span className="text-figma-xs font-medium text-figma-primary tabular-nums">
                    {score}%
                </span>
                {mentions != null && (
                    <span className="text-figma-xs font-medium text-figma-muted tabular-nums">
                        · {mentions}
                    </span>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// TableHeader — Uppercase column headers for table cards
// ============================================================================

interface TableHeaderProps {
    /** Column definitions */
    columns: { label: string; align?: 'left' | 'right'; className?: string }[];
    /** Grid column template (e.g. "grid-cols-[1fr_auto_80px_80px]") */
    gridCols: string;
    /** Additional classes */
    className?: string;
}

/**
 * TableHeader — Uppercase column labels with grid layout.
 *
 * Usage:
 *   <TableHeader
 *     gridCols="grid-cols-[1fr_auto_80px]"
 *     columns={[
 *       { label: 'SOURCE' },
 *       { label: 'CITATIONS', align: 'right' },
 *       { label: 'SENTIMENT', align: 'right' },
 *     ]}
 *   />
 */
export function TableHeader({ columns, gridCols, className }: TableHeaderProps) {
    return (
        <div className={cn(
            'grid gap-3 pb-3 px-2 border-b border-figma-border-light',
            gridCols,
            className,
        )}>
            {columns.map((col) => (
                <span
                    key={col.label}
                    className={cn(
                        'text-figma-2xs font-medium text-figma-secondary uppercase',
                        col.align === 'right' && 'text-right',
                        col.className,
                    )}
                >
                    {col.label}
                </span>
            ))}
        </div>
    );
}

export default PlatformRow;
