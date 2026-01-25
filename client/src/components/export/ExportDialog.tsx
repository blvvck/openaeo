import { useState, useMemo } from 'react';
import { Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/check-control';
import { Label } from '@/components/ui/field-label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useExport, EXPORT_COLUMNS, type ExportType } from './useExport';

interface ExportDialogProps {
  /** Export type */
  type: ExportType;
  /** Dialog trigger (if not provided, use open/onOpenChange) */
  trigger?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open change handler */
  onOpenChange?: (open: boolean) => void;
  /** Callback after successful export */
  onExportComplete?: () => void;
  /** Pre-selected columns */
  defaultColumns?: string[];
  /** Additional classes */
  className?: string;
}

const TYPE_LABELS: Record<ExportType, string> = {
  prompts: 'Prompts',
  responses: 'Responses',
  competitors: 'Competitors',
  sources: 'Sources',
};

/**
 * ExportDialog - Column configuration dialog for exports
 *
 * Features:
 * - Checkboxes for selecting columns
 * - Preview of selected columns
 * - Select all / deselect all
 * - Export button with loading state
 */
export function ExportDialog({
  type,
  trigger,
  open,
  onOpenChange,
  onExportComplete,
  defaultColumns,
  className,
}: ExportDialogProps) {
  const columns = EXPORT_COLUMNS[type];
  const allColumnKeys = columns.map((c) => c.key);

  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    defaultColumns || allColumnKeys
  );
  const { exportData, isLoading, error } = useExport();

  const allSelected = selectedColumns.length === columns.length;
  const someSelected = selectedColumns.length > 0 && !allSelected;

  const handleToggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(allColumnKeys);
    }
  };

  const handleExport = async () => {
    await exportData({
      type,
      columns: selectedColumns,
    });
    onExportComplete?.();
    onOpenChange?.(false);
  };

  // Preview of what columns will be exported
  const previewColumns = useMemo(() => {
    return columns.filter((c) => selectedColumns.includes(c.key));
  }, [columns, selectedColumns]);

  const dialogContent = (
    <DialogContent className={cn('sm:max-w-[500px]', className)}>
      <DialogHeader>
        <DialogTitle>Export {TYPE_LABELS[type]}</DialogTitle>
        <DialogDescription>
          Select the columns you want to include in the CSV export.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        {/* Select All */}
        <div className="flex items-center space-x-2 pb-2 border-b">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
          />
          <Label
            htmlFor="select-all"
            className="text-sm font-medium cursor-pointer"
          >
            Select All
          </Label>
          <span className="text-sm text-muted-foreground ml-auto">
            {selectedColumns.length}/{columns.length} selected
          </span>
        </div>

        {/* Column Checkboxes */}
        <div className="grid grid-cols-2 gap-3">
          {columns.map((column) => (
            <div key={column.key} className="flex items-center space-x-2">
              <Checkbox
                id={`col-${column.key}`}
                checked={selectedColumns.includes(column.key)}
                onCheckedChange={() => handleToggleColumn(column.key)}
              />
              <Label
                htmlFor={`col-${column.key}`}
                className="text-sm cursor-pointer"
              >
                {column.label}
              </Label>
            </div>
          ))}
        </div>

        {/* Preview */}
        {previewColumns.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Preview</p>
            <div className="bg-muted rounded-md p-3 overflow-x-auto">
              <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                {previewColumns.map((col, idx) => (
                  <span key={col.key}>
                    {col.label}
                    {idx < previewColumns.length - 1 && ','}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange?.(false)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={selectedColumns.length === 0}
          isLoading={isLoading}
          loadingText="Exporting..."
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
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
 * Quick export dialog trigger button
 */
export function ExportDialogTrigger({
  type,
  label,
  variant = 'outline',
  size = 'default',
  className,
}: {
  type: ExportType;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <ExportDialog
      type={type}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant={variant} size={size} className={className}>
          <Download className="w-4 h-4 mr-2" />
          {label || `Export ${TYPE_LABELS[type]}`}
        </Button>
      }
    />
  );
}
