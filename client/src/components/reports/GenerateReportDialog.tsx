import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/field-label';
import { Checkbox } from '@/components/ui/check-control';
import { Calendar } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/floating-popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/option-picker';
import { useDownloadReport } from './useReports';
import {
  REPORT_SECTIONS,
  DEFAULT_REPORT_SECTIONS,
  type ReportSection,
  type GenerateReportRequest,
} from './types';

interface GenerateReportDialogProps {
  /** Dialog trigger element */
  trigger?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open change handler */
  onOpenChange?: (open: boolean) => void;
  /** Callback on successful generation */
  onSuccess?: () => void;
  /** Additional classes */
  className?: string;
}

/** Date range presets */
const DATE_PRESETS = [
  { label: 'Last 7 days', value: '7d', getDates: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Last 30 days', value: '30d', getDates: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'Last 90 days', value: '90d', getDates: () => ({ start: subDays(new Date(), 90), end: new Date() }) },
  { label: 'This month', value: 'this_month', getDates: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Last month', value: 'last_month', getDates: () => {
    const lastMonth = subMonths(new Date(), 1);
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
  }},
  { label: 'Custom', value: 'custom', getDates: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
] as const;

/**
 * GenerateReportDialog - Dialog to configure and generate PDF reports
 *
 * Features:
 * - Date range picker with presets
 * - Section selection checkboxes
 * - Progress indicator during generation
 * - Auto-download on completion
 */
export function GenerateReportDialog({
  trigger,
  open,
  onOpenChange,
  onSuccess,
  className,
}: GenerateReportDialogProps) {
  const downloadMutation = useDownloadReport();

  const [datePreset, setDatePreset] = useState<string>('30d');
  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>(
    () => [...DEFAULT_REPORT_SECTIONS]
  );

  const isCustomRange = datePreset === 'custom';

  const handlePresetChange = useCallback((value: string) => {
    setDatePreset(value);
    const preset = DATE_PRESETS.find((p) => p.value === value);
    if (preset && value !== 'custom') {
      const dates = preset.getDates();
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  }, []);

  const handleToggleSection = useCallback((section: ReportSection) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    const allSections = Object.keys(REPORT_SECTIONS) as ReportSection[];
    if (selectedSections.length === allSections.length) {
      setSelectedSections([]);
    } else {
      setSelectedSections(allSections);
    }
  }, [selectedSections.length]);

  const handleGenerate = useCallback(async () => {
    const request: GenerateReportRequest = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      sections: selectedSections,
      includeCharts: true,
    };

    try {
      await downloadMutation.mutateAsync(request);
      onSuccess?.();
      onOpenChange?.(false);
    } catch {
      // Error handled by mutation
    }
  }, [
    startDate,
    endDate,
    selectedSections,
    downloadMutation,
    onSuccess,
    onOpenChange,
  ]);

  const allSections = useMemo(
    () => Object.keys(REPORT_SECTIONS) as ReportSection[],
    []
  );
  const allSelected = selectedSections.length === allSections.length;
  const someSelected = selectedSections.length > 0 && !allSelected;

  const dialogContent = (
    <DialogContent className={cn('sm:max-w-[600px]', className)}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generate PDF Report
        </DialogTitle>
        <DialogDescription>
          Configure the date range and sections to include in your report.
        </DialogDescription>
      </DialogHeader>

      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="space-y-6 py-4"
      >
        {/* Date range */}
        <div className="space-y-3">
          <Label className="text-base">Date range</Label>

          <Select value={datePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom date pickers */}
          {isCustomRange && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground mb-1 block">
                  Start date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      disabled={(date) => date > endDate || date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1">
                <Label className="text-sm text-muted-foreground mb-1 block">
                  End date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      disabled={(date) => date < startDate || date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        {/* Report sections */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Report sections</Label>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {allSections.map((section) => {
              const info = REPORT_SECTIONS[section];
              const isSelected = selectedSections.includes(section);

              return (
                <div
                  key={section}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                  onClick={() => handleToggleSection(section)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleSection(section)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {info.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {info.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground">
            {selectedSections.length} of {allSections.length} sections selected
          </p>
        </div>
      </motion.div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange?.(false)}
          disabled={downloadMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={selectedSections.length === 0 || downloadMutation.isPending}
          isLoading={downloadMutation.isPending}
          loadingText="Generating..."
        >
          <Download className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {dialogContent}
    </Dialog>
  );
}

/**
 * Quick trigger button for the dialog
 */
export function GenerateReportButton({
  variant = 'default',
  size = 'default',
  className,
}: {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <GenerateReportDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant={variant} size={size} className={className}>
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      }
    />
  );
}
