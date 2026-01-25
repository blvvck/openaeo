import { cn } from '@/lib/utils';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';

export interface OnboardingStep {
  id: string;
  title: string;
  completed: boolean;
  action: () => void;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  onDismiss: () => void;
  dismissed: boolean;
}

function CompletionCelebration({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <Card className="w-[280px] border-figma-border rounded-xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <CardContent className="py-8 text-center">
        <div className="mb-4 inline-flex p-3.5 bg-[#F0FDF4] rounded-full animate-bounce">
          <Sparkles className="w-6 h-6 text-figma-green" />
        </div>
        <h3 className="text-figma-md font-semibold text-figma-primary mb-1">All done!</h3>
        <p className="text-figma-xs text-figma-secondary font-normal">
          You're all set up and ready to go.
        </p>
      </CardContent>
    </Card>
  );
}

export function OnboardingChecklist({
  steps,
  onDismiss,
  dismissed,
}: OnboardingChecklistProps) {
  const [showCelebration, setShowCelebration] = useState(false);

  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const allComplete = completedCount === totalSteps;
  const nextStep = steps.find((s) => !s.completed);
  const progress = (completedCount / totalSteps) * 100;

  useEffect(() => {
    if (allComplete && !dismissed) {
      setShowCelebration(true);
    }
  }, [allComplete, dismissed]);

  if (dismissed) return null;

  if (showCelebration) {
    return (
      <CompletionCelebration
        onDone={() => {
          setShowCelebration(false);
          onDismiss();
        }}
      />
    );
  }

  return (
    <Card className="w-[280px] border-figma-border rounded-xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-figma-md font-semibold text-figma-primary">Getting started</span>
          <span className="text-figma-2xs font-medium text-figma-muted tabular-nums">
            {completedCount}/{totalSteps}
          </span>
        </div>
        {/* Progress bar — thin, subtle */}
        <div className="h-[3px] w-full bg-figma-border rounded-full overflow-hidden">
          <div
            className="h-full bg-figma-green rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="h-px bg-figma-border-light mx-5" />

      {/* Steps */}
      <div className="px-5 py-3">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={step.action}
            className={cn(
              'flex items-center gap-3 w-full text-left py-2.5 rounded-lg transition-all group',
              !step.completed && 'hover:translate-x-0.5'
            )}
          >
            {/* Checkbox — refined circle */}
            <div
              className={cn(
                'w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all',
                step.completed
                  ? 'bg-figma-green'
                  : 'border border-figma-border'
              )}
            >
              {step.completed && (
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              )}
            </div>
            <span
              className={cn(
                'text-figma-sm font-normal transition-colors',
                step.completed
                  ? 'text-figma-muted line-through decoration-figma-border'
                  : 'text-figma-primary group-hover:text-figma-blue'
              )}
            >
              {step.title}
            </span>
          </button>
        ))}
      </div>

      <div className="h-px bg-figma-border-light mx-5" />

      {/* Footer */}
      <div className="px-5 pt-4 pb-4 space-y-3">
        {nextStep && (
          <button
            onClick={nextStep.action}
            className="w-full flex items-center justify-center gap-2 bg-figma-primary hover:bg-figma-primary/90 text-white text-figma-sm font-medium h-9 rounded-lg transition-colors"
          >
            Finish setup
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onDismiss}
          className="w-full text-figma-2xs font-normal text-figma-muted hover:text-figma-secondary transition-colors"
        >
          I'll do this later
        </button>
      </div>
    </Card>
  );
}
