import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Bell, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/field-label';
import { Switch } from '@/components/ui/toggle-control';
import { Checkbox } from '@/components/ui/check-control';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/option-picker';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCreateAlertRule,
  useUpdateAlertRule,
  useAlertChannels,
} from './useAlerts';
import {
  ALERT_RULE_TYPES,
  ALERT_SEVERITIES,
  type AlertRule,
  type AlertRuleType,
  type AlertSeverity,
  type CreateAlertRule,
} from './types';

interface AlertRuleFormProps {
  /** Existing rule to edit (null for create) */
  rule?: AlertRule | null;
  /** Callback when form is submitted successfully */
  onSuccess?: () => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Show as card (true) or dialog (false) */
  asCard?: boolean;
  /** Dialog open state (only used when asCard=false) */
  open?: boolean;
  /** Dialog open change handler */
  onOpenChange?: (open: boolean) => void;
  /** Additional classes */
  className?: string;
}

type FormState = {
  name: string;
  type: AlertRuleType;
  threshold: number;
  enabled: boolean;
  severity: AlertSeverity;
  channels: number[];
};

const DEFAULT_FORM_STATE: FormState = {
  name: '',
  type: 'visibility_drop',
  threshold: 10,
  enabled: true,
  severity: 'warning',
  channels: [],
};

/**
 * AlertRuleForm - Create or edit alert rules
 *
 * Features:
 * - Type dropdown with descriptions
 * - Threshold input with unit display
 * - Severity selection
 * - Channel selection (multi-select)
 * - Enable/disable toggle
 */
export function AlertRuleForm({
  rule,
  onSuccess,
  onCancel,
  asCard = true,
  open,
  onOpenChange,
  className,
}: AlertRuleFormProps) {
  const createMutation = useCreateAlertRule();
  const updateMutation = useUpdateAlertRule();
  const { data: channels } = useAlertChannels();

  const isEditing = !!rule;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [formState, setFormState] = useState<FormState>(() =>
    rule
      ? {
          name: rule.name,
          type: rule.type,
          threshold: rule.threshold,
          enabled: rule.enabled,
          severity: rule.severity,
          channels: rule.channels,
        }
      : DEFAULT_FORM_STATE
  );

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Update form when rule changes
  useEffect(() => {
    if (rule) {
      setFormState({
        name: rule.name,
        type: rule.type,
        threshold: rule.threshold,
        enabled: rule.enabled,
        severity: rule.severity,
        channels: rule.channels,
      });
    } else {
      setFormState(DEFAULT_FORM_STATE);
    }
    setErrors({});
  }, [rule]);

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!formState.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formState.threshold < 0) {
      newErrors.threshold = 'Threshold must be positive';
    }

    const typeInfo = ALERT_RULE_TYPES[formState.type];
    if (typeInfo?.unit !== '' && formState.threshold === 0) {
      newErrors.threshold = 'Threshold must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const data: CreateAlertRule = {
      name: formState.name.trim(),
      type: formState.type,
      threshold: formState.threshold,
      enabled: formState.enabled,
      severity: formState.severity,
      channels: formState.channels,
    };

    try {
      if (isEditing && rule) {
        await updateMutation.mutateAsync({ id: rule.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess?.();
      if (!asCard) onOpenChange?.(false);
    } catch {
      // Error handled by mutation
    }
  }, [
    formState,
    validate,
    isEditing,
    rule,
    updateMutation,
    createMutation,
    onSuccess,
    asCard,
    onOpenChange,
  ]);

  const handleToggleChannel = useCallback(
    (channelId: number) => {
      const newChannels = formState.channels.includes(channelId)
        ? formState.channels.filter((id) => id !== channelId)
        : [...formState.channels, channelId];
      updateField('channels', newChannels);
    },
    [formState.channels, updateField]
  );

  const typeInfo = ALERT_RULE_TYPES[formState.type];

  const formContent = (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="rule-name">Rule Name</Label>
        <Input
          id="rule-name"
          value={formState.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Critical Visibility Alert"
          disabled={isPending}
          className={cn(errors.name && 'border-destructive')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="rule-type">Alert Type</Label>
        <Select
          value={formState.type}
          onValueChange={(value) => updateField('type', value as AlertRuleType)}
          disabled={isPending}
        >
          <SelectTrigger id="rule-type">
            <SelectValue placeholder="Select alert type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ALERT_RULE_TYPES).map(([type, info]) => (
              <SelectItem key={type} value={type}>
                <div className="flex flex-col">
                  <span>{info.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {typeInfo && (
          <p className="text-sm text-muted-foreground">{typeInfo.description}</p>
        )}
      </div>

      {/* Threshold */}
      {typeInfo?.unit !== '' && (
        <div className="space-y-2">
          <Label htmlFor="rule-threshold">Threshold</Label>
          <div className="flex items-center gap-2">
            <Input
              id="rule-threshold"
              type="number"
              min={0}
              value={formState.threshold}
              onChange={(e) =>
                updateField('threshold', parseFloat(e.target.value) || 0)
              }
              disabled={isPending}
              className={cn('w-24', errors.threshold && 'border-destructive')}
            />
            {typeInfo?.unit && (
              <span className="text-sm text-muted-foreground">
                {typeInfo.unit}
              </span>
            )}
          </div>
          {errors.threshold && (
            <p className="text-sm text-destructive">{errors.threshold}</p>
          )}
        </div>
      )}

      {/* Severity */}
      <div className="space-y-2">
        <Label htmlFor="rule-severity">Severity</Label>
        <Select
          value={formState.severity}
          onValueChange={(value) =>
            updateField('severity', value as AlertSeverity)
          }
          disabled={isPending}
        >
          <SelectTrigger id="rule-severity">
            <SelectValue placeholder="Select severity" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ALERT_SEVERITIES).map(([severity, info]) => (
              <SelectItem key={severity} value={severity}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn('w-4 h-4', info.color)} />
                  <span>{info.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Channels */}
      {channels && channels.length > 0 && (
        <div className="space-y-2">
          <Label>Notification Channels</Label>
          <div className="space-y-2">
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`channel-${channel.id}`}
                  checked={formState.channels.includes(channel.id)}
                  onCheckedChange={() => handleToggleChannel(channel.id)}
                  disabled={isPending || !channel.enabled}
                />
                <Label
                  htmlFor={`channel-${channel.id}`}
                  className={cn(
                    'text-sm cursor-pointer',
                    !channel.enabled && 'text-muted-foreground'
                  )}
                >
                  {channel.name}
                  {!channel.enabled && ' (disabled)'}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enabled Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="rule-enabled">Enable Rule</Label>
          <p className="text-sm text-muted-foreground">
            Start receiving alerts immediately
          </p>
        </div>
        <Switch
          id="rule-enabled"
          checked={formState.enabled}
          onCheckedChange={(checked) => updateField('enabled', checked)}
          disabled={isPending}
        />
      </div>
    </div>
  );

  const footerContent = (
    <>
      {onCancel && (
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      )}
      <Button onClick={handleSubmit} disabled={isPending} isLoading={isPending}>
        <Save className="w-4 h-4 mr-2" />
        {isEditing ? 'Update Rule' : 'Create Rule'}
      </Button>
    </>
  );

  // Card variant
  if (asCard) {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className={className}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {isEditing ? 'Edit Alert Rule' : 'Create Alert Rule'}
            </CardTitle>
            <CardDescription>
              {isEditing
                ? 'Update the alert rule settings'
                : 'Configure when you want to be notified'}
            </CardDescription>
          </CardHeader>
          <CardContent>{formContent}</CardContent>
          <CardFooter className="flex justify-end gap-2">
            {footerContent}
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  // Dialog variant
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {isEditing ? 'Edit Alert Rule' : 'Create Alert Rule'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the alert rule settings'
              : 'Configure when you want to be notified'}
          </DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter className="gap-2">{footerContent}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
