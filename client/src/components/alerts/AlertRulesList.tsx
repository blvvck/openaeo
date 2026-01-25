import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/toggle-control';
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
import { TableSkeleton, ListSkeleton } from '@/components/shared/skeleton-loader';
import { EmptyState } from '@/components/shared/empty-state';
import { useAlertRules, useToggleAlertRule, useDeleteAlertRule } from './useAlerts';
import {
  ALERT_RULE_TYPES,
  ALERT_SEVERITIES,
  type AlertRule,
  type AlertSeverity,
} from './types';

interface AlertRulesListProps {
  /** Callback when "New Rule" is clicked */
  onCreateRule?: () => void;
  /** Callback when a rule is selected for editing */
  onEditRule?: (rule: AlertRule) => void;
  /** Show compact view */
  compact?: boolean;
  /** Additional classes */
  className?: string;
}

/**
 * Get severity badge variant
 */
function getSeverityVariant(severity: AlertSeverity): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'warning':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * AlertRulesList - Display and manage alert rules
 *
 * Features:
 * - List all alert rules with type, threshold, severity
 * - Enable/disable toggle for each rule
 * - Edit and delete actions
 * - Loading and empty states
 */
export function AlertRulesList({
  onCreateRule,
  onEditRule,
  compact = false,
  className,
}: AlertRulesListProps) {
  const { data: rules, isLoading, error } = useAlertRules();
  const toggleMutation = useToggleAlertRule();
  const deleteMutation = useDeleteAlertRule();

  const [deleteTarget, setDeleteTarget] = useState<AlertRule | null>(null);

  const handleToggle = (rule: AlertRule) => {
    toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled });
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>Configure automated alert triggers</CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={3} columns={6} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Failed to load rules"
            description="There was an error loading alert rules. Please try again."
            primaryAction={{
              label: 'Retry',
              onClick: () => window.location.reload(),
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>Configure automated alert triggers</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No alert rules"
            description="Create your first alert rule to get notified about important changes."
            primaryAction={
              onCreateRule
                ? { label: 'Create Rule', onClick: onCreateRule }
                : undefined
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className={className}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>
                {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </div>
            {onCreateRule && (
              <Button onClick={onCreateRule} size={compact ? 'sm' : 'default'}>
                <Plus className="w-4 h-4 mr-2" />
                New Rule
              </Button>
            )}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-center">Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => {
                    const typeInfo = ALERT_RULE_TYPES[rule.type];
                    const severityInfo = ALERT_SEVERITIES[rule.severity];

                    return (
                      <motion.tr
                        key={rule.id}
                        variants={staggerItem}
                        className="group"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {rule.enabled ? (
                              <Bell className="w-4 h-4 text-primary" />
                            ) : (
                              <BellOff className="w-4 h-4 text-muted-foreground" />
                            )}
                            {rule.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {typeInfo?.label || rule.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">
                            {rule.threshold}
                            {typeInfo?.unit}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityVariant(rule.severity)}>
                            {severityInfo?.label || rule.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => handleToggle(rule)}
                            disabled={toggleMutation.isPending}
                            aria-label={
                              rule.enabled ? 'Disable rule' : 'Enable rule'
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onEditRule && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEditRule(rule)}
                                aria-label="Edit rule"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(rule)}
                              aria-label="Delete rule"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rule &quot;{deleteTarget?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Compact version for sidebar or dashboard
 */
export function AlertRulesCompact({
  onViewAll,
  className,
}: {
  onViewAll?: () => void;
  className?: string;
}) {
  const { data: rules, isLoading } = useAlertRules();

  if (isLoading) {
    return <ListSkeleton items={3} hasAvatar={false} className={className} />;
  }

  const enabledRules = rules?.filter((r) => r.enabled) || [];
  const disabledCount = (rules?.length || 0) - enabledRules.length;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Alert Rules</CardTitle>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active</span>
            <Badge variant="default">{enabledRules.length}</Badge>
          </div>
          {disabledCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Disabled</span>
              <Badge variant="secondary">{disabledCount}</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
