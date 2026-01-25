import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays } from 'date-fns';
import {
  Share2,
  Link,
  Copy,
  Check,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useCreateSharedReport, useCopyShareLink } from './useReports';
import {
  REPORT_SECTIONS,
  DEFAULT_REPORT_SECTIONS,
  type ReportSection,
} from './types';

interface ShareReportButtonProps {
  /** Pre-selected start date */
  defaultStartDate?: Date;
  /** Pre-selected end date */
  defaultEndDate?: Date;
  /** Pre-selected sections */
  defaultSections?: ReportSection[];
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Icon-only mode */
  iconOnly?: boolean;
  /** Additional classes */
  className?: string;
}

/** Expiration options */
const EXPIRATION_OPTIONS = [
  { label: 'Never', value: '0' },
  { label: '1 day', value: '1' },
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
];

/**
 * ShareReportButton - Create shareable report links
 *
 * Features:
 * - Opens dialog to configure shared report
 * - Date range selection
 * - Section selection
 * - Expiration settings
 * - Copy link to clipboard
 */
export function ShareReportButton({
  defaultStartDate,
  defaultEndDate,
  defaultSections,
  variant = 'outline',
  size = 'default',
  iconOnly = false,
  className,
}: ShareReportButtonProps) {
  const createMutation = useCreateSharedReport();
  const copyMutation = useCopyShareLink();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date>(
    () => defaultStartDate || subDays(new Date(), 30)
  );
  const [endDate, setEndDate] = useState<Date>(
    () => defaultEndDate || new Date()
  );
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>(
    () => defaultSections || [...DEFAULT_REPORT_SECTIONS]
  );
  const [expiresInDays, setExpiresInDays] = useState<string>('30');

  // Result state
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = useCallback(() => {
    setTitle('');
    setStartDate(defaultStartDate || subDays(new Date(), 30));
    setEndDate(defaultEndDate || new Date());
    setSelectedSections(defaultSections || [...DEFAULT_REPORT_SECTIONS]);
    setExpiresInDays('30');
    setCreatedUrl(null);
    setCopied(false);
  }, [defaultStartDate, defaultEndDate, defaultSections]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        // Reset after close animation
        setTimeout(resetForm, 200);
      }
    },
    [resetForm]
  );

  const handleToggleSection = useCallback((section: ReportSection) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      const result = await createMutation.mutateAsync({
        title: title.trim() || `Report ${format(new Date(), 'MMM d, yyyy')}`,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        sections: selectedSections,
        expiresInDays:
          expiresInDays === '0' ? undefined : parseInt(expiresInDays, 10),
      });

      setCreatedUrl(result.publicUrl);
    } catch {
      // Error handled by mutation
    }
  }, [
    title,
    startDate,
    endDate,
    selectedSections,
    expiresInDays,
    createMutation,
  ]);

  const handleCopy = useCallback(async () => {
    if (!createdUrl) return;

    try {
      await copyMutation.mutateAsync(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = createdUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [createdUrl, copyMutation]);

  const allSections = Object.keys(REPORT_SECTIONS) as ReportSection[];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Share2 className="w-4 h-4" />
          {!iconOnly && <span className="ml-2">Share Report</span>}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            {createdUrl ? 'Report Link Created' : 'Create Shareable Link'}
          </DialogTitle>
          <DialogDescription>
            {createdUrl
              ? 'Share this link to give others access to this report.'
              : 'Configure the report settings and create a shareable link.'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {createdUrl ? (
            // Success view with link
            <motion.div
              key="success"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4 py-4"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={createdUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className={cn(copied && 'text-green-500 border-green-500')}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {expiresInDays !== '0' && (
                <p className="text-sm text-muted-foreground">
                  This link will expire in {expiresInDays} days.
                </p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Done
                </Button>
                <Button onClick={() => setCreatedUrl(null)}>
                  Create Another
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            // Form view
            <motion.div
              key="form"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4 py-4"
            >
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="report-title">Report Title (optional)</Label>
                <Input
                  id="report-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Q4 Visibility Report"
                  disabled={createMutation.isPending}
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        disabled={createMutation.isPending}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, 'PP')}
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

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        disabled={createMutation.isPending}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(endDate, 'PP')}
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

              {/* Sections */}
              <div className="space-y-2">
                <Label>Sections</Label>
                <div className="grid grid-cols-2 gap-2">
                  {allSections.map((section) => (
                    <div key={section} className="flex items-center space-x-2">
                      <Checkbox
                        id={`section-${section}`}
                        checked={selectedSections.includes(section)}
                        onCheckedChange={() => handleToggleSection(section)}
                        disabled={createMutation.isPending}
                      />
                      <Label
                        htmlFor={`section-${section}`}
                        className="text-sm cursor-pointer"
                      >
                        {REPORT_SECTIONS[section].label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <Label htmlFor="expiration">Link Expiration</Label>
                <Select
                  value={expiresInDays}
                  onValueChange={setExpiresInDays}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger id="expiration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={
                    selectedSections.length === 0 || createMutation.isPending
                  }
                  isLoading={createMutation.isPending}
                  loadingText="Creating..."
                >
                  <Link className="w-4 h-4 mr-2" />
                  Create Link
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
