import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit, Mail, Hash, Globe, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/motion';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/confirmation-modal';
import { ListSkeleton } from '@/components/shared/skeleton-loader';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useAlertChannels,
  useCreateAlertChannel,
  useUpdateAlertChannel,
  useDeleteAlertChannel,
  useToggleAlertChannel,
} from './useAlerts';
import {
  ALERT_CHANNEL_TYPES,
  type AlertChannel,
  type AlertChannelType,
  type CreateAlertChannel,
  type EmailConfig,
  type SlackConfig,
  type WebhookConfig,
} from './types';

interface AlertChannelConfigProps {
  /** Additional classes */
  className?: string;
}

/**
 * Get icon for channel type
 */
function ChannelIcon({
  type,
  className,
}: {
  type: AlertChannelType;
  className?: string;
}) {
  switch (type) {
    case 'email':
      return <Mail className={cn('w-4 h-4', className)} />;
    case 'slack':
      return <Hash className={cn('w-4 h-4', className)} />;
    case 'webhook':
      return <Globe className={cn('w-4 h-4', className)} />;
  }
}

/**
 * AlertChannelConfig - Configure notification delivery channels
 *
 * Features:
 * - List configured channels
 * - Add/edit/delete channels
 * - Email, Slack, Webhook support
 * - Enable/disable toggles
 */
export function AlertChannelConfig({ className }: AlertChannelConfigProps) {
  const { data: channels, isLoading, error } = useAlertChannels();
  const toggleMutation = useToggleAlertChannel();
  const deleteMutation = useDeleteAlertChannel();

  const [editChannel, setEditChannel] = useState<AlertChannel | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AlertChannel | null>(null);

  const handleToggle = (channel: AlertChannel) => {
    toggleMutation.mutate({ id: channel.id, enabled: !channel.enabled });
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
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Configure how you receive alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ListSkeleton items={3} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Failed to load channels"
            description="There was an error loading notification channels."
            primaryAction={{
              label: 'Retry',
              onClick: () => window.location.reload(),
            }}
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
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Configure how you receive alerts
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Channel
            </Button>
          </CardHeader>
          <CardContent>
            {!channels || channels.length === 0 ? (
              <EmptyState
                title="No channels configured"
                description="Add a notification channel to start receiving alerts."
                primaryAction={{
                  label: 'Add Channel',
                  onClick: () => setIsCreateOpen(true),
                }}
              />
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {channels.map((channel) => (
                  <motion.div
                    key={channel.id}
                    variants={staggerItem}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border',
                      'hover:bg-muted/50 transition-colors group'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-md',
                          channel.enabled
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <ChannelIcon type={channel.type} />
                      </div>
                      <div>
                        <p className="font-medium">{channel.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {ALERT_CHANNEL_TYPES[channel.type]?.label}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={() => handleToggle(channel)}
                        disabled={toggleMutation.isPending}
                      />
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditChannel(channel)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(channel)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create/Edit Dialog */}
      <ChannelFormDialog
        channel={editChannel}
        open={isCreateOpen || !!editChannel}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditChannel(null);
          }
        }}
        onSuccess={() => {
          setIsCreateOpen(false);
          setEditChannel(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Channel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              You will stop receiving alerts through this channel.
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

// ===== Channel Form Dialog =====

interface ChannelFormDialogProps {
  channel?: AlertChannel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ChannelFormState = {
  type: AlertChannelType;
  name: string;
  enabled: boolean;
  // Email config
  email: string;
  includeDetails: boolean;
  // Slack config
  slackWebhookUrl: string;
  slackChannel: string;
  slackUsername: string;
  // Webhook config
  webhookUrl: string;
  webhookMethod: 'POST' | 'PUT';
  webhookIncludePayload: boolean;
};

const DEFAULT_CHANNEL_FORM: ChannelFormState = {
  type: 'email',
  name: '',
  enabled: true,
  email: '',
  includeDetails: true,
  slackWebhookUrl: '',
  slackChannel: '',
  slackUsername: '',
  webhookUrl: '',
  webhookMethod: 'POST',
  webhookIncludePayload: true,
};

function ChannelFormDialog({
  channel,
  open,
  onOpenChange,
  onSuccess,
}: ChannelFormDialogProps) {
  const createMutation = useCreateAlertChannel();
  const updateMutation = useUpdateAlertChannel();

  const isEditing = !!channel;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [formState, setFormState] = useState<ChannelFormState>(
    DEFAULT_CHANNEL_FORM
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof ChannelFormState, string>>
  >({});

  // Update form when channel changes
  useEffect(() => {
    if (channel) {
      const config = channel.config;
      setFormState({
        type: channel.type,
        name: channel.name,
        enabled: channel.enabled,
        email: (config as EmailConfig).email || '',
        includeDetails: (config as EmailConfig).includeDetails ?? true,
        slackWebhookUrl: (config as SlackConfig).webhookUrl || '',
        slackChannel: (config as SlackConfig).channel || '',
        slackUsername: (config as SlackConfig).username || '',
        webhookUrl: (config as WebhookConfig).url || '',
        webhookMethod: (config as WebhookConfig).method || 'POST',
        webhookIncludePayload: (config as WebhookConfig).includePayload ?? true,
      });
    } else {
      setFormState(DEFAULT_CHANNEL_FORM);
    }
    setErrors({});
  }, [channel, open]);

  const updateField = useCallback(
    <K extends keyof ChannelFormState>(field: K, value: ChannelFormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof ChannelFormState, string>> = {};

    if (!formState.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formState.type === 'email' && !formState.email.trim()) {
      newErrors.email = 'Email is required';
    }

    if (formState.type === 'slack' && !formState.slackWebhookUrl.trim()) {
      newErrors.slackWebhookUrl = 'Webhook URL is required';
    }

    if (formState.type === 'webhook' && !formState.webhookUrl.trim()) {
      newErrors.webhookUrl = 'Webhook URL is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    let config: EmailConfig | SlackConfig | WebhookConfig;

    switch (formState.type) {
      case 'email':
        config = {
          email: formState.email.trim(),
          includeDetails: formState.includeDetails,
        };
        break;
      case 'slack':
        config = {
          webhookUrl: formState.slackWebhookUrl.trim(),
          channel: formState.slackChannel.trim() || undefined,
          username: formState.slackUsername.trim() || undefined,
        };
        break;
      case 'webhook':
        config = {
          url: formState.webhookUrl.trim(),
          method: formState.webhookMethod,
          includePayload: formState.webhookIncludePayload,
        };
        break;
    }

    const data: CreateAlertChannel = {
      type: formState.type,
      name: formState.name.trim(),
      config,
      enabled: formState.enabled,
    };

    try {
      if (isEditing && channel) {
        await updateMutation.mutateAsync({ id: channel.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess?.();
    } catch {
      // Error handled by mutation
    }
  }, [
    formState,
    validate,
    isEditing,
    channel,
    updateMutation,
    createMutation,
    onSuccess,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Channel' : 'Add Channel'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the notification channel settings'
              : 'Configure a new notification channel'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Channel Type (only on create) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="channel-type">Channel Type</Label>
              <Select
                value={formState.type}
                onValueChange={(value) =>
                  updateField('type', value as AlertChannelType)
                }
                disabled={isPending}
              >
                <SelectTrigger id="channel-type">
                  <SelectValue placeholder="Select channel type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ALERT_CHANNEL_TYPES).map(([type, info]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <ChannelIcon type={type as AlertChannelType} />
                        <span>{info.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name</Label>
            <Input
              id="channel-name"
              value={formState.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Team Email"
              disabled={isPending}
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Email Config */}
          {formState.type === 'email' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email-address">Email Address</Label>
                <Input
                  id="email-address"
                  type="email"
                  value={formState.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="alerts@example.com"
                  disabled={isPending}
                  className={cn(errors.email && 'border-destructive')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-details"
                  checked={formState.includeDetails}
                  onCheckedChange={(checked) =>
                    updateField('includeDetails', !!checked)
                  }
                  disabled={isPending}
                />
                <Label htmlFor="include-details" className="text-sm">
                  Include full alert details in email
                </Label>
              </div>
            </>
          )}

          {/* Slack Config */}
          {formState.type === 'slack' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                <Input
                  id="slack-webhook"
                  value={formState.slackWebhookUrl}
                  onChange={(e) =>
                    updateField('slackWebhookUrl', e.target.value)
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  disabled={isPending}
                  className={cn(errors.slackWebhookUrl && 'border-destructive')}
                />
                {errors.slackWebhookUrl && (
                  <p className="text-sm text-destructive">
                    {errors.slackWebhookUrl}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slack-channel">
                  Channel (optional)
                </Label>
                <Input
                  id="slack-channel"
                  value={formState.slackChannel}
                  onChange={(e) => updateField('slackChannel', e.target.value)}
                  placeholder="#alerts"
                  disabled={isPending}
                />
              </div>
            </>
          )}

          {/* Webhook Config */}
          {formState.type === 'webhook' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  value={formState.webhookUrl}
                  onChange={(e) => updateField('webhookUrl', e.target.value)}
                  placeholder="https://api.example.com/webhook"
                  disabled={isPending}
                  className={cn(errors.webhookUrl && 'border-destructive')}
                />
                {errors.webhookUrl && (
                  <p className="text-sm text-destructive">
                    {errors.webhookUrl}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-method">HTTP Method</Label>
                <Select
                  value={formState.webhookMethod}
                  onValueChange={(value) =>
                    updateField('webhookMethod', value as 'POST' | 'PUT')
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="webhook-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-payload"
                  checked={formState.webhookIncludePayload}
                  onCheckedChange={(checked) =>
                    updateField('webhookIncludePayload', !!checked)
                  }
                  disabled={isPending}
                />
                <Label htmlFor="include-payload" className="text-sm">
                  Include full alert payload
                </Label>
              </div>
            </>
          )}

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="channel-enabled">Enable Channel</Label>
            <Switch
              id="channel-enabled"
              checked={formState.enabled}
              onCheckedChange={(checked) => updateField('enabled', checked)}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            isLoading={isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
