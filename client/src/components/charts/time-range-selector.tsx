import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/date-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/floating-popover';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

export type TimeRangePreset = '1d' | '3d' | '7d' | '14d' | '30d' | '60d' | '90d' | '365d' | 'all' | 'custom';

export interface TimeRange {
  from: Date;
  to: Date;
  preset: TimeRangePreset;
}

interface TimeRangeSelectorProps {
  value?: TimeRange;
  onChange: (range: TimeRange) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  variant?: 'dropdown' | 'buttons';
  presets?: TimeRangePreset[];
}

const PRESET_LABELS: Record<TimeRangePreset, string> = {
  '1d': 'Today',
  '3d': '3 days',
  '7d': '7 days',
  '14d': '14 days',
  '30d': '30 days',
  '60d': '60 days',
  '90d': '90 days',
  '365d': '365 days',
  'all': 'All time',
  'custom': 'Custom',
};

const PERIOD_LABELS: Record<TimeRangePreset, string> = {
  '1d': 'today',
  '3d': 'past 3 days',
  '7d': 'past 7 days',
  '14d': 'past 14 days',
  '30d': 'past 30 days',
  '60d': 'past 60 days',
  '90d': 'past 90 days',
  '365d': 'past year',
  'all': 'all time',
  'custom': 'this period',
};

/** Returns a human-readable period label like "past 7 days" for a preset */
export function getPeriodLabel(preset: TimeRangePreset): string {
  return PERIOD_LABELS[preset] || 'this period';
}

const PRESET_SHORT_LABELS: Record<TimeRangePreset, string> = {
  '1d': '1D',
  '3d': '3D',
  '7d': '7D',
  '14d': '14D',
  '30d': '30D',
  '60d': '60D',
  '90d': '90D',
  '365d': '1Y',
  'all': 'All',
  'custom': 'Custom',
};

function getPresetRange(preset: TimeRangePreset): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  const from = new Date();
  from.setHours(0, 0, 0, 0);

  switch (preset) {
    case '1d':
      from.setDate(from.getDate() - 1);
      break;
    case '3d':
      from.setDate(from.getDate() - 3);
      break;
    case '7d':
      from.setDate(from.getDate() - 7);
      break;
    case '14d':
      from.setDate(from.getDate() - 14);
      break;
    case '30d':
      from.setDate(from.getDate() - 30);
      break;
    case '60d':
      from.setDate(from.getDate() - 60);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
    case '365d':
      from.setDate(from.getDate() - 365);
      break;
    case 'all':
      from.setFullYear(2020, 0, 1);
      break;
    case 'custom':
      from.setDate(from.getDate() - 30);
      break;
  }

  return { from, to };
}

function getDefaultRange(): TimeRange {
  const { from, to } = getPresetRange('7d');
  return { from, to, preset: '7d' };
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TimeRangeSelector({
  value,
  onChange,
  open,
  onOpenChange,
  className,
  variant = 'dropdown',
  presets = ['1d', '3d', '7d', '14d', '30d', '60d', '90d', '365d', 'all', 'custom'],
}: TimeRangeSelectorProps) {
  const [internalValue, setInternalValue] = useState<TimeRange>(
    value || getDefaultRange()
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const isOpen = open ?? customOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (open === undefined) setCustomOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const currentValue = value || internalValue;

  useEffect(() => {
    if (currentValue.preset === 'custom') {
      setDateRange({ from: currentValue.from, to: currentValue.to });
    }
  }, [currentValue]);

  const handlePresetChange = (preset: TimeRangePreset) => {
    if (preset === 'custom') {
      setDateRange({ from: currentValue.from, to: currentValue.to });
      handleOpenChange(true);
      return;
    }

    const { from, to } = getPresetRange(preset);
    const newRange: TimeRange = { from, to, preset };
    setInternalValue(newRange);
    onChange(newRange);
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const handleCustomApply = () => {
    if (dateRange?.from && dateRange?.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      const newRange: TimeRange = { from: dateRange.from, to, preset: 'custom' };
      setInternalValue(newRange);
      onChange(newRange);
      handleOpenChange(false);
    }
  };

  const getDisplayValue = () => {
    if (currentValue.preset === 'custom') {
      return `${formatDateForDisplay(currentValue.from)} - ${formatDateForDisplay(currentValue.to)}`;
    }
    return PRESET_LABELS[currentValue.preset];
  };

  if (variant === 'buttons') {
    return (
      <div className={cn('flex gap-1', className)}>
        {presets.map((preset) => (
          <Button
            key={preset}
            variant={currentValue.preset === preset ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetChange(preset)}
            className="px-3"
          >
            {PRESET_SHORT_LABELS[preset]}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-auto min-w-fit justify-start bg-figma-card border-figma-border shadow-sm hover:shadow-md hover:bg-figma-hover px-3 py-1.5 rounded-lg transition-all',
              !currentValue && 'text-muted-foreground'
            )}
          >
            <span className="text-figma-sm font-medium text-figma-primary">{getDisplayValue()}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-figma-muted ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            <div className="w-[120px] border-r p-3 space-y-1">
              {presets.filter(p => p !== 'custom').map((preset) => (
                <button
                  key={preset}
                  className={cn(
                    'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                    currentValue.preset === preset
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => {
                    handlePresetChange(preset);
                    handleOpenChange(false);
                  }}
                >
                  {PRESET_LABELS[preset]}
                </button>
              ))}
              <button
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                  currentValue.preset === 'custom'
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                )}
                onClick={() => handleOpenChange(true)}
              >
                Custom
              </button>
            </div>
            {currentValue.preset === 'custom' || isOpen ? (
              <div className="p-3">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  disabled={{ after: new Date() }}
                  fixedWeeks
                />
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCustomApply}
                    disabled={!dateRange?.from || !dateRange?.to}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function useTimeRange(initialPreset: TimeRangePreset = '7d') {
  const [range, setRange] = useState<TimeRange>(() => {
    const { from, to } = getPresetRange(initialPreset);
    return { from, to, preset: initialPreset };
  });

  return {
    range,
    setRange,
    from: range.from,
    to: range.to,
    preset: range.preset,
  };
}
