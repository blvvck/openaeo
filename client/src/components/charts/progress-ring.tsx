import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  /** Progress value (0-100) */
  value: number;
  /** Ring size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Stroke width */
  strokeWidth?: number;
  /** Show percentage text in center */
  showValue?: boolean;
  /** Custom label instead of percentage */
  label?: string;
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'auto';
  /** Animate on mount/value change */
  animated?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Additional classes */
  className?: string;
  /** Track color */
  trackColor?: string;
  /** Progress color (overrides variant) */
  progressColor?: string;
}

const SIZES = {
  sm: { dimension: 48, fontSize: 'text-xs', labelSize: 'text-[8px]' },
  md: { dimension: 80, fontSize: 'text-lg', labelSize: 'text-xs' },
  lg: { dimension: 120, fontSize: 'text-2xl', labelSize: 'text-sm' },
  xl: { dimension: 160, fontSize: 'text-4xl', labelSize: 'text-base' },
};

const STROKE_WIDTHS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
};

function getAutoColor(value: number): string {
  if (value >= 70) return 'hsl(var(--success))';
  if (value >= 40) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

function getVariantColor(variant: ProgressRingProps['variant'], value: number): string {
  switch (variant) {
    case 'success':
      return 'hsl(var(--success))';
    case 'warning':
      return 'hsl(var(--warning))';
    case 'error':
      return 'hsl(var(--destructive))';
    case 'auto':
      return getAutoColor(value);
    default:
      return 'hsl(var(--primary))';
  }
}

export function ProgressRing({
  value,
  size = 'md',
  strokeWidth,
  showValue = true,
  label,
  variant = 'default',
  animated = true,
  animationDuration = 800,
  className,
  trackColor = 'hsl(var(--muted))',
  progressColor,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(animated ? 0 : value);

  const sizeConfig = SIZES[size];
  const actualStrokeWidth = strokeWidth || STROKE_WIDTHS[size];
  const dimension = sizeConfig.dimension;
  const radius = (dimension - actualStrokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));
  const displayValue = Math.min(100, Math.max(0, animatedValue));

  // Animation
  useEffect(() => {
    if (!animated) {
      setAnimatedValue(clampedValue);
      return;
    }

    const startTime = Date.now();
    const startValue = animatedValue;
    const endValue = clampedValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeProgress;

      setAnimatedValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [clampedValue, animationDuration, animated]);

  const strokeDashoffset = circumference - (displayValue / 100) * circumference;
  const color = progressColor || getVariantColor(variant, clampedValue);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: dimension, height: dimension }}
    >
      <svg
        className="transform -rotate-90"
        width={dimension}
        height={dimension}
      >
        {/* Track */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={actualStrokeWidth}
        />
        {/* Progress */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={actualStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: animated ? 'none' : `stroke-dashoffset ${animationDuration}ms ease-out`,
          }}
        />
      </svg>

      {/* Center content */}
      {(showValue || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <span className={cn('font-bold', sizeConfig.fontSize)}>
              {Math.round(displayValue)}
            </span>
          )}
          {label && (
            <span className={cn('text-muted-foreground', sizeConfig.labelSize)}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Mini progress ring for inline use
 */
export function MiniProgressRing({
  value,
  className,
  color,
}: {
  value: number;
  className?: string;
  color?: string;
}) {
  return (
    <ProgressRing
      value={value}
      size="sm"
      showValue={false}
      animated={false}
      className={className}
      progressColor={color}
    />
  );
}

/**
 * Progress ring with external label
 */
interface LabeledProgressRingProps extends ProgressRingProps {
  title: string;
  description?: string;
}

export function LabeledProgressRing({
  title,
  description,
  className,
  ...ringProps
}: LabeledProgressRingProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <ProgressRing {...ringProps} />
      <div className="text-center">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Row of multiple progress rings for comparison
 */
interface ProgressRingGroupProps {
  items: Array<{
    value: number;
    label: string;
    color?: string;
  }>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressRingGroup({
  items,
  size = 'sm',
  className,
}: ProgressRingGroupProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex flex-col items-center gap-1">
          <ProgressRing
            value={item.value}
            size={size}
            progressColor={item.color}
            animated
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
