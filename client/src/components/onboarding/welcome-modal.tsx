import { useState, useEffect } from 'react';
import { APP_CONFIG } from '@/config/app';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarChart2, Users, Lightbulb } from 'lucide-react';

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGetStarted: () => void;
}

const FEATURES = [
  {
    icon: BarChart2,
    text: 'Track brand mentions across ChatGPT, Claude, Perplexity, and more',
  },
  {
    icon: Users,
    text: 'See how you rank vs competitors',
  },
  {
    icon: Lightbulb,
    text: 'Get insights to improve visibility',
  },
];

function markWelcomeSeen() {
  localStorage.setItem('welcomeSeen', 'true');
}

export function WelcomeModal({
  open,
  onOpenChange,
  onGetStarted,
}: WelcomeModalProps) {
  const handleGetStarted = () => {
    markWelcomeSeen();
    onOpenChange(false);
    onGetStarted();
  };

  const handleSkip = () => {
    markWelcomeSeen();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-figma-border rounded-2xl bg-white shadow-2xl p-8">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-h2 text-center font-semibold text-figma-primary tracking-tight">
            Welcome to {APP_CONFIG.fullName}
          </DialogTitle>
          <p className="text-center text-figma-base text-figma-secondary font-normal">
            See how AI platforms talk about your brand
          </p>
        </DialogHeader>

        <div className="py-6">
          <ul className="space-y-5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-4">
                <div className="p-2.5 bg-figma-blue-light rounded-xl flex-shrink-0">
                  <Icon className="w-5 h-5 text-figma-blue" />
                </div>
                <span className="text-figma-sm text-figma-primary font-normal leading-snug pt-0.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4 mt-2">
          <Button
            className="w-full h-11 bg-figma-blue hover:brightness-95 text-white font-medium text-figma-sm rounded-xl shadow-sm"
            size="lg"
            onClick={handleGetStarted}
          >
            Start Tracking Your Brand
          </Button>
          <button
            onClick={handleSkip}
            className="text-figma-xs text-figma-muted font-normal hover:text-figma-primary hover:underline transition-all"
          >
            Skip for now — I'll explore first
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useWelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('welcomeSeen');
    if (!seen) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return { open, setOpen };
}
