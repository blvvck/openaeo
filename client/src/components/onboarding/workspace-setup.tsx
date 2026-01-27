import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestWorkspaceApi } from "@/lib/workspace-query";

interface WorkspaceSetupProps {
  initialName: string;
  onComplete: () => void;
}

export function WorkspaceSetup({ initialName, onComplete }: WorkspaceSetupProps) {
  const [name, setName] = useState(initialName === "My organization" ? "" : initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length >= 2 && trimmedName.length <= 50 && !isSaving;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    setError(null);
    try {
      await requestWorkspaceApi("PATCH", "/api/workspaces/current", { name: trimmedName });
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your organization name");
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-figma-border bg-card p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold tracking-tight text-figma-primary">
          Create organization
        </h1>
        <p className="mt-2 text-figma-sm text-figma-secondary">
          This is what your team will see when they sign in. You can change it later in settings.
        </p>

        <label htmlFor="organization-name" className="mt-6 block text-figma-sm font-medium text-figma-primary">
          Organization name
        </label>
        <Input
          id="organization-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Acme Inc."
          maxLength={50}
          autoFocus
          className="mt-2"
        />
        {error && <p className="mt-2 text-figma-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={!canSubmit} className="mt-6 w-full">
          {isSaving ? "Saving..." : "Continue"}
        </Button>
      </form>
    </div>
  );
}
