import { Download, FileText, MessageSquare, Users, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedDropdown, type DropdownItem } from '@/components/ui/animated-dropdown';
import { Button } from '@/components/ui/button';
import { useExport, type ExportType } from './useExport';

interface ExportButtonProps {
  /** Optional callback after successful export */
  onExportComplete?: (type: ExportType) => void;
  /** Optional callback on error */
  onError?: (error: string) => void;
  /** Disabled types (won't be shown) */
  disabledTypes?: ExportType[];
  /** Additional classes */
  className?: string;
}

const EXPORT_OPTIONS: Array<{
  value: ExportType;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'prompts',
    label: 'Export Prompts',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    value: 'responses',
    label: 'Export Responses',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    value: 'competitors',
    label: 'Export Competitors',
    icon: <Users className="w-4 h-4" />,
  },
  {
    value: 'sources',
    label: 'Export Sources',
    icon: <Link2 className="w-4 h-4" />,
  },
];

/**
 * ExportButton - Dropdown button for exporting data
 *
 * Features:
 * - Dropdown with export type options
 * - Uses AnimatedDropdown for smooth animation
 * - Loading state during export
 * - Triggers browser download
 */
export function ExportButton({
  onExportComplete,
  onError,
  disabledTypes = [],
  className,
}: ExportButtonProps) {
  const { exportData, isLoading, error } = useExport();

  const handleSelect = async (value: string) => {
    const type = value as ExportType;
    try {
      await exportData({ type });
      onExportComplete?.(type);
    } catch {
      onError?.(error || 'Export failed');
    }
  };

  const items: DropdownItem[] = EXPORT_OPTIONS
    .filter((opt) => !disabledTypes.includes(opt.value))
    .map((opt) => ({
      value: opt.value,
      label: opt.label,
      icon: opt.icon,
      disabled: isLoading,
    }));

  return (
    <AnimatedDropdown
      items={items}
      placeholder="Export..."
      onSelect={handleSelect}
      disabled={isLoading}
      className={cn('', className)}
    />
  );
}

/**
 * Simple export button for a single type
 */
export function SingleExportButton({
  type,
  label,
  onExportComplete,
  onError,
  variant = 'outline',
  size = 'default',
  className,
}: {
  type: ExportType;
  label?: string;
  onExportComplete?: () => void;
  onError?: (error: string) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}) {
  const { exportData, isLoading, error } = useExport();

  const handleClick = async () => {
    try {
      await exportData({ type });
      onExportComplete?.();
    } catch {
      onError?.(error || 'Export failed');
    }
  };

  const defaultLabels: Record<ExportType, string> = {
    prompts: 'Export Prompts',
    responses: 'Export Responses',
    competitors: 'Export Competitors',
    sources: 'Export Sources',
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      isLoading={isLoading}
      loadingText="Exporting..."
      className={cn('', className)}
    >
      <Download className="w-4 h-4 mr-2" />
      {label || defaultLabels[type]}
    </Button>
  );
}

/**
 * Icon-only export button
 */
export function ExportIconButton({
  type,
  onExportComplete,
  onError,
  className,
}: {
  type: ExportType;
  onExportComplete?: () => void;
  onError?: (error: string) => void;
  className?: string;
}) {
  const { exportData, isLoading, error } = useExport();

  const handleClick = async () => {
    try {
      await exportData({ type });
      onExportComplete?.();
    } catch {
      onError?.(error || 'Export failed');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      isLoading={isLoading}
      className={cn('', className)}
      aria-label={`Export ${type}`}
    >
      <Download className="w-4 h-4" />
    </Button>
  );
}
