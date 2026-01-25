import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import {
  Link,
  Copy,
  Check,
  Trash2,
  Eye,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-grid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/confirmation-modal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ListSkeleton } from '@/components/shared/skeleton-loader';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useSharedReports,
  useRevokeSharedReport,
  useCopyShareLink,
} from './useReports';
import { REPORT_SECTIONS, type SharedReport } from './types';

interface SharedReportsListProps {
  /** Compact view for dashboard widgets */
  compact?: boolean;
  /** Additional classes */
  className?: string;
}

/**
 * Get status badge variant and label
 */
function getStatusInfo(report: SharedReport): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
} {
  if (report.status === 'revoked') {
    return { variant: 'destructive', label: 'Revoked' };
  }

  if (report.expiresAt && isPast(new Date(report.expiresAt))) {
    return { variant: 'secondary', label: 'Expired' };
  }

  return { variant: 'default', label: 'Active' };
}

/**
 * SharedReportsList - Display and manage shared report links
 *
 * Features:
 * - List of all shared reports
 * - Copy link to clipboard
 * - View access count
 * - Revoke links
 * - Status indicators (active, expired, revoked)
 */
export function SharedReportsList({
  compact = false,
  className,
}: SharedReportsListProps) {
  const { data: reports, isLoading, error } = useSharedReports();
  const revokeMutation = useRevokeSharedReport();
  const copyMutation = useCopyShareLink();

  const [revokeTarget, setRevokeTarget] = useState<SharedReport | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = useCallback(
    async (report: SharedReport) => {
      try {
        await copyMutation.mutateAsync(report.publicUrl);
        setCopiedId(report.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = report.publicUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedId(report.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    },
    [copyMutation]
  );

  const handleRevoke = useCallback(() => {
    if (revokeTarget) {
      revokeMutation.mutate(revokeTarget.id, {
        onSuccess: () => setRevokeTarget(null),
      });
    }
  }, [revokeTarget, revokeMutation]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Shared reports</CardTitle>
          <CardDescription>Manage your shareable report links</CardDescription>
        </CardHeader>
        <CardContent>
          <ListSkeleton items={compact ? 3 : 5} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Shared reports</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Failed to load reports"
            description="There was an error loading shared reports."
            primaryAction={{
              label: 'Retry',
              onClick: () => window.location.reload(),
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Shared reports</CardTitle>
          <CardDescription>Manage your shareable report links</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No shared reports"
            description="Create a shareable link to share reports with others."
          />
        </CardContent>
      </Card>
    );
  }

  // Compact view for dashboard widgets
  if (compact) {
    const activeReports = reports.filter((r) => r.status === 'active');

    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Shared reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reports.slice(0, 3).map((report) => {
              const statusInfo = getStatusInfo(report);

              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{report.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.accessCount} view{report.accessCount !== 1 && 's'}
                    </p>
                  </div>
                  <Badge variant={statusInfo.variant} className="ml-2">
                    {statusInfo.label}
                  </Badge>
                </div>
              );
            })}
            {reports.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{reports.length - 3} more
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full table view
  return (
    <>
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className={className}
      >
        <Card>
          <CardHeader>
            <CardTitle>Shared reports</CardTitle>
            <CardDescription>
              {reports.length} shared report{reports.length !== 1 && 's'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date range</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const statusInfo = getStatusInfo(report);
                    const isActive = report.status === 'active';

                    return (
                      <motion.tr key={report.id} variants={staggerItem} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{report.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(report.dateRange.start), 'MMM d')} -{' '}
                            {format(new Date(report.dateRange.end), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            <span>{report.accessCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {report.expiresAt ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1 text-sm">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  {formatDistanceToNow(new Date(report.expiresAt), {
                                    addSuffix: true,
                                  })}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {format(new Date(report.expiresAt), 'PPpp')}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Copy Link */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCopy(report)}
                                    disabled={!isActive}
                                    className={cn(
                                      copiedId === report.id &&
                                        'text-green-500'
                                    )}
                                  >
                                    {copiedId === report.id ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {copiedId === report.id
                                    ? 'Copied!'
                                    : 'Copy link'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Open Link */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    disabled={!isActive}
                                  >
                                    <a
                                      href={report.publicUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open in new tab</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Revoke */}
                            {isActive && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setRevokeTarget(report)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Revoke link</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke share link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the link for &quot;
              {revokeTarget?.title}&quot;? Anyone with this link will no longer
              be able to access the report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke link'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
