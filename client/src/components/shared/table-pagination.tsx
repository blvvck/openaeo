import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TablePaginationProps {
  offset: number;
  pageSize: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  disabled?: boolean;
}

export function TablePagination({
  offset,
  pageSize,
  total,
  onPrevious,
  onNext,
  disabled = false,
}: TablePaginationProps) {
  if (total === 0) return null;

  const firstItem = offset + 1;
  const lastItem = Math.min(offset + pageSize, total);

  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-figma-border-light">
      <span className="text-figma-xs text-figma-muted">
        Showing {firstItem}–{lastItem} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-label="Previous page"
          onClick={onPrevious}
          disabled={disabled || offset === 0}
          className="h-7 px-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Next page"
          onClick={onNext}
          disabled={disabled || lastItem >= total}
          className="h-7 px-2"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
