import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/field-label';
import { ContentCard, PageHeader } from '@/components/shared';
import { useWorkspaceAdminAction, useWorkspaceIntegrations, useWorkspaceRole } from '@/hooks/use-workspace-admin';
import type { Provider, QuotaView } from '@shared/types/workspace-admin';

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  perplexity: 'Perplexity',
  gemini: 'Google Gemini',
  xai: 'xAI',
  deepseek: 'DeepSeek',
};

export function IntegrationsSettingsPage() {
  const role = useWorkspaceRole();
  const { data, isLoading, isError } = useWorkspaceIntegrations();
  const action = useWorkspaceAdminAction();
  const [keys, setKeys] = useState<Partial<Record<Provider, string>>>({});
  const [quota, setQuota] = useState<QuotaView>({ maxPromptsPerScan: 5, maxScansPerHour: 10 });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data) setQuota(data.quota);
  }, [data]);

  const save = async () => {
    setMessage(null);
    try {
      const provided = Object.fromEntries(
        Object.entries(keys).filter(([, value]) => typeof value === 'string' && value.trim().length > 0),
      ) as Partial<Record<Provider, string>>;
      await action.saveIntegrations(provided, quota);
      setKeys({});
      setMessage('Workspace integrations saved.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not save workspace integrations');
    }
  };

  return (
    <main role="main" aria-label="Integration settings" className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Workspace provider keys and scan limits"
      />
      {role !== 'owner' && role !== 'admin' ? (
        <p className="text-figma-sm text-figma-secondary">Only workspace owners and admins can manage integrations.</p>
      ) : isLoading ? (
        <p className="text-figma-sm text-figma-secondary">Loading integrations...</p>
      ) : isError ? (
        <p className="text-figma-sm text-figma-red">Could not load workspace integrations.</p>
      ) : (
        <>
          <ContentCard
            title="Provider keys"
            subtitle="Workspace keys take precedence over server environment keys. Values are encrypted and never shown in full."
            contentClassName="space-y-4"
          >
            {(data?.keys ?? []).map((entry) => (
              <div key={entry.provider} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr] sm:items-center">
                <div>
                  <Label className="text-figma-sm text-figma-primary">{PROVIDER_LABELS[entry.provider]}</Label>
                  <p className="text-figma-xs text-figma-muted tabular-nums">
                    {entry.configured ? `${entry.source}: ${entry.masked}` : 'Not configured'}
                  </p>
                </div>
                <Input
                  type="password"
                  value={keys[entry.provider] ?? ''}
                  onChange={(event) => setKeys((current) => ({ ...current, [entry.provider]: event.target.value }))}
                  className="text-figma-sm"
                  placeholder="Replace key"
                  aria-label={`${PROVIDER_LABELS[entry.provider]} key`}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setKeys((current) => ({ ...current, [entry.provider]: '' }))}
                >
                  Keep current
                </Button>
              </div>
            ))}
          </ContentCard>

          <ContentCard
            title="Scan limits"
            subtitle="Provider calls are billed to this installation. Limits apply to this workspace."
            contentClassName="space-y-4"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="max-prompts" className="text-figma-sm text-figma-primary">Prompts per scan</Label>
                <Input
                  id="max-prompts"
                  className="text-figma-sm"
                  type="number"
                  min={1}
                  value={quota.maxPromptsPerScan}
                  onChange={(event) => setQuota((current) => ({ ...current, maxPromptsPerScan: Number(event.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="max-scans" className="text-figma-sm text-figma-primary">Scans per hour</Label>
                <Input
                  id="max-scans"
                  className="text-figma-sm"
                  type="number"
                  min={1}
                  value={quota.maxScansPerHour}
                  onChange={(event) => setQuota((current) => ({ ...current, maxScansPerHour: Number(event.target.value) }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" onClick={save}>Save changes</Button>
              {message && <p className="text-figma-sm text-figma-secondary">{message}</p>}
            </div>
          </ContentCard>
        </>
      )}
    </main>
  );
}
