import * as React from "react";

export type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "warning";
};

export type ToastRecord = ToastOptions & { id: string };

type ToastTimer = {
  timeout?: ReturnType<typeof setTimeout>;
  remaining: number;
  startedAt: number;
};

const maxVisibleToasts = 3;
const visibleToasts: ToastRecord[] = [];
const listeners = new Set<(toasts: ToastRecord[]) => void>();
const timers = new Map<string, ToastTimer>();
let nextId = 0;

function publish(): void {
  const snapshot = [...visibleToasts];
  listeners.forEach((listener) => listener(snapshot));
}

function dismiss(id: string): void {
  const timer = timers.get(id);
  if (timer?.timeout !== undefined) clearTimeout(timer.timeout);
  timers.delete(id);
  const index = visibleToasts.findIndex((item) => item.id === id);
  if (index >= 0) {
    visibleToasts.splice(index, 1);
    publish();
  }
}

export function pauseToast(id: string): void {
  const timer = timers.get(id);
  if (!timer || timer.timeout === undefined) return;

  clearTimeout(timer.timeout);
  timer.timeout = undefined;
  timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
}

export function resumeToast(id: string): void {
  const timer = timers.get(id);
  if (!timer || timer.timeout !== undefined) return;

  timer.startedAt = Date.now();
  timer.timeout = setTimeout(() => dismiss(id), timer.remaining);
}

export function toast(options: ToastOptions): { id: string; dismiss: () => void } {
  const id = `notice-${++nextId}`;
  visibleToasts.unshift({ ...options, id });
  while (visibleToasts.length > maxVisibleToasts) {
    const removed = visibleToasts.pop();
    if (removed) {
      const timer = timers.get(removed.id);
      if (timer?.timeout !== undefined) clearTimeout(timer.timeout);
      timers.delete(removed.id);
    }
  }
  publish();
  const timer: ToastTimer = { remaining: 6_000, startedAt: Date.now() };
  timer.timeout = setTimeout(() => dismiss(id), timer.remaining);
  timers.set(id, timer);
  return { id, dismiss: () => dismiss(id) };
}

export function useToast(): { toasts: ToastRecord[]; toast: typeof toast; dismiss: (id: string) => void } {
  const [toasts, setToasts] = React.useState<ToastRecord[]>(visibleToasts);
  React.useEffect(() => {
    listeners.add(setToasts);
    setToasts([...visibleToasts]);
    return () => { listeners.delete(setToasts); };
  }, []);
  return { toasts, toast, dismiss };
}
