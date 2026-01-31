import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'onboarding_completed_steps';
const DISMISSED_KEY = 'onboarding_dismissed';

export function useOnboarding() {
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Persisted dismiss — survives refresh, cleared on logout
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedSteps));
  }, [completedSteps]);

  useEffect(() => {
    localStorage.setItem(DISMISSED_KEY, String(dismissed));
  }, [dismissed]);

  const markComplete = useCallback((stepId: string) => {
    setCompletedSteps((prev) =>
      prev.includes(stepId) ? prev : [...prev, stepId]
    );
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  /** Call on logout to reset onboarding visibility for next session */
  const reset = useCallback(() => {
    setCompletedSteps([]);
    setDismissed(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DISMISSED_KEY);
  }, []);

  const isComplete = useCallback(
    (stepId: string) => completedSteps.includes(stepId),
    [completedSteps]
  );

  return {
    completedSteps,
    dismissed,
    markComplete,
    dismiss,
    reset,
    isComplete,
  };
}
