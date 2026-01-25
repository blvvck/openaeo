import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/option-picker';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTestAlert, useAlertChannels } from './useAlerts';

interface TestAlertButtonProps {
  /** Specific channel ID to test (if not provided, shows dropdown) */
  channelId?: number;
  /** Show channel selector dropdown */
  showChannelSelector?: boolean;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Label text */
  label?: string;
  /** Show icon only */
  iconOnly?: boolean;
  /** Additional classes */
  className?: string;
}

type TestStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * TestAlertButton - Send test alerts to verify channel configuration
 *
 * Features:
 * - Test individual channel or all channels
 * - Optional channel selector dropdown
 * - Visual feedback for test status
 * - Tooltip with result details
 */
export function TestAlertButton({
  channelId,
  showChannelSelector = false,
  variant = 'outline',
  size = 'default',
  label = 'Send Test Alert',
  iconOnly = false,
  className,
}: TestAlertButtonProps) {
  const testMutation = useTestAlert();
  const { data: channels } = useAlertChannels();

  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  const [status, setStatus] = useState<TestStatus>('idle');
  const [resultMessage, setResultMessage] = useState<string>('');

  const handleTest = async () => {
    setStatus('pending');
    setResultMessage('');

    const testChannelId =
      channelId ??
      (selectedChannelId !== 'all' ? parseInt(selectedChannelId, 10) : undefined);

    try {
      const result = await testMutation.mutateAsync(testChannelId);
      setStatus('success');
      setResultMessage(
        result.message || 'Test alert sent successfully!'
      );
      // Reset status after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setResultMessage(
        err instanceof Error ? err.message : 'Failed to send test alert'
      );
      // Reset status after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const enabledChannels = channels?.filter((c) => c.enabled) || [];

  // Icon-only button
  if (iconOnly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size="icon"
              onClick={handleTest}
              disabled={status === 'pending'}
              className={cn(
                status === 'success' && 'text-green-500',
                status === 'error' && 'text-red-500',
                className
              )}
            >
              <AnimatePresence mode="wait">
                {status === 'pending' ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </motion.div>
                ) : status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </motion.div>
                ) : status === 'error' ? (
                  <motion.div
                    key="error"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <XCircle className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Send className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {status === 'success' || status === 'error'
              ? resultMessage
              : 'Send test alert'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Button with optional channel selector
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className={cn('flex items-center gap-2', className)}
    >
      {showChannelSelector && enabledChannels.length > 0 && (
        <Select
          value={selectedChannelId}
          onValueChange={setSelectedChannelId}
          disabled={status === 'pending'}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {enabledChannels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id.toString()}>
                {channel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        variant={variant}
        size={size}
        onClick={handleTest}
        disabled={status === 'pending'}
        className={cn(
          status === 'success' && 'border-green-500 text-green-500',
          status === 'error' && 'border-red-500 text-red-500'
        )}
      >
        <AnimatePresence mode="wait">
          {status === 'pending' ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </motion.span>
          ) : status === 'success' ? (
            <motion.span
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Sent!
            </motion.span>
          ) : status === 'error' ? (
            <motion.span
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Failed
            </motion.span>
          ) : (
            <motion.span
              key="send"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      {/* Result message */}
      <AnimatePresence>
        {(status === 'success' || status === 'error') && resultMessage && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={cn(
              'text-sm',
              status === 'success' ? 'text-green-500' : 'text-red-500'
            )}
          >
            {resultMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Inline test button for channel rows
 */
export function TestChannelButton({
  channelId,
  disabled,
  className,
}: {
  channelId: number;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <TestAlertButton
      channelId={channelId}
      variant="ghost"
      size="icon"
      iconOnly
      className={className}
    />
  );
}
