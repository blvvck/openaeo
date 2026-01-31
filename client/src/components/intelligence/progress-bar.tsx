/**
 * Progress Dots Component
 *
 * Step indicator for the Intelligence wizard using dots.
 * Current step = filled, past = filled, future = empty.
 */

import { cn } from '@/lib/utils';
import type { WizardStep } from './types';

interface ProgressBarProps {
  currentStep: WizardStep;
  className?: string;
}

const STEPS: WizardStep[] = ['url', 'profile', 'competitors', 'prompts', 'results'];

export function ProgressBar({ currentStep, className }: ProgressBarProps) {
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {STEPS.map((step, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFilled = isPast || isCurrent;

        return (
          <div
            key={step}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              isFilled
                ? 'bg-figma-blue'
                : 'bg-figma-border'
            )}
            aria-label={`Step ${index + 1}${isCurrent ? ' (current)' : ''}`}
          />
        );
      })}
    </div>
  );
}
