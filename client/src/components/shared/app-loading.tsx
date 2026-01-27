import { Loader2, Sparkles } from "lucide-react";

export function AppLoadingScreen({ label = "Loading your workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2 text-figma-sm text-figma-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
