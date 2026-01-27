import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Building2, ChevronRight, Eye, FileText, Link2, LoaderCircle, MessageSquare, Search, Tags } from "lucide-react";
import { workspaceFetch } from "@/lib/workspace-query";
import { Input } from "@/components/ui/input";
import { PLATFORMS } from "@/components/ui/platform-icon";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { GlobalSearchKind, GlobalSearchResponse, GlobalSearchResult } from "@shared/types/search";

const navigationPaths: Array<GlobalSearchResult & { aliases: string[] }> = [
  { id: "nav-dashboard", kind: "navigation", title: "Dashboard", description: "Open dashboard", href: "/app/dashboard", aliases: ["home", "overview"] },
  { id: "nav-visibility", kind: "navigation", title: "Visibility", description: "Open visibility", href: "/app/visibility", aliases: ["visibility", "mentions"] },
  { id: "nav-competitors", kind: "navigation", title: "Competitors", description: "Open competitors", href: "/app/competitors", aliases: ["competitor", "competition"] },
  { id: "nav-bots", kind: "navigation", title: "Bot traffic", description: "Open bot traffic", href: "/app/bots", aliases: ["bot", "bots", "crawler", "crawlers"] },
  { id: "nav-prompts", kind: "navigation", title: "Prompts and queries", description: "Open prompts and queries", href: "/app/prompts", aliases: ["prompt", "query", "queries"] },
  { id: "nav-citations", kind: "navigation", title: "Citations", description: "Open citation sources", href: "/app/citations", aliases: ["citation", "source", "sources"] },
];

const platformAliases: Record<string, string[]> = {
  chatgpt: ["openai", "gpt"],
  claude: ["anthropic"],
  gemini: ["google"],
  grok: ["xai"],
  deepseek: [],
  perplexity: [],
  "ai-mode": ["ai mode", "google"],
  "ai-overview": ["ai overview", "google"],
};

const quickPaths: Array<GlobalSearchResult & { aliases: string[] }> = [
  ...navigationPaths,
  ...PLATFORMS.map((platform) => ({
    id: `platform-${platform.id}`,
    kind: "platform" as const,
    title: platform.name,
    description: "View platform visibility",
    href: "/app/visibility?tab=platform",
    aliases: [platform.id, ...(platformAliases[platform.id] ?? [])],
  })),
];

const resultType: Record<GlobalSearchKind, string> = {
  prompt: "Prompt",
  topic: "Topic",
  competitor: "Competitor",
  source: "Citation source",
  navigation: "Go to",
  platform: "Platform",
};

const resultIcon: Record<GlobalSearchKind, typeof Search> = {
  prompt: MessageSquare,
  topic: Tags,
  competitor: Building2,
  source: Link2,
  navigation: FileText,
  platform: Eye,
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [settledQuery, setSettledQuery] = useState("");
  const [, navigate] = useLocation();
  const normalizedQuery = query.trim();

  useEffect(() => {
    const timeout = window.setTimeout(() => setSettledQuery(normalizedQuery), 300);
    return () => window.clearTimeout(timeout);
  }, [normalizedQuery]);

  const { data, isFetching, isError, refetch } = useQuery<GlobalSearchResponse>({
    queryKey: ["/api/search", settledQuery],
    enabled: open,
    queryFn: async () => {
      const suffix = settledQuery ? `?q=${encodeURIComponent(settledQuery)}` : "";
      const response = await workspaceFetch(`/api/search${suffix}`);
      if (!response.ok) throw new Error("Search failed");
      return response.json() as Promise<GlobalSearchResponse>;
    },
    staleTime: 15_000,
  });

  const results = useMemo(() => {
    const searchNeedle = normalizedQuery.toLocaleLowerCase();
    const quickResults = quickPaths
      .filter((result) => !searchNeedle || [result.title, result.description, ...result.aliases].some((value) => value.toLocaleLowerCase().includes(searchNeedle)))
      .map(({ aliases: _aliases, ...result }) => result);
    return [...quickResults, ...(data?.results ?? [])];
  }, [data?.results, normalizedQuery]);

  const openSearch = () => {
    setQuery("");
    setSettledQuery("");
    setOpen(true);
  };

  const selectResult = (result: GlobalSearchResult) => {
    navigate(result.href);
    setOpen(false);
  };

  const updateOpen = (nextOpen: boolean) => {
    if (nextOpen) openSearch();
    else setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={updateOpen}>
      <div className="flex min-w-0 flex-1 justify-center">
        <button
          type="button"
          onClick={openSearch}
          aria-haspopup="dialog"
          aria-label="Open global search"
          className="flex h-9 w-full max-w-[48rem] items-center gap-2.5 rounded-lg border border-figma-border bg-figma-hover px-3 text-left text-sm text-figma-secondary shadow-sm transition-colors hover:bg-figma-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search className="size-4 shrink-0 text-figma-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-figma-muted">Search pages, providers, and workspace data</span>
        </button>
      </div>

      <DialogContent className="flex max-h-[min(76vh,44rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">Search your workspace</DialogTitle>
        <DialogDescription className="sr-only">
          Search workspace data, app pages, and supported AI platforms.
        </DialogDescription>

        <div className="border-b border-figma-border px-4 pb-3 pt-4 sm:px-6">
          <div className="relative pr-8">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-figma-muted" aria-hidden="true" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results[0]) {
                  event.preventDefault();
                  selectResult(results[0]);
                }
              }}
              placeholder="Search pages, platforms, prompts, topics, competitors, and citations..."
              aria-label="Search pages, platforms, prompts, topics, competitors, and citations"
              className="h-11 border-figma-border bg-figma-card pl-10 pr-10 text-sm placeholder:text-figma-muted"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3" aria-live="polite">
          {isFetching || settledQuery !== normalizedQuery ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-figma-secondary">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              {normalizedQuery ? "Searching this workspace..." : "Loading workspace shortcuts..."}
            </div>
          ) : isError && results.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-figma-secondary">Search could not load. Check your connection and try again.</p>
              <button type="button" onClick={() => void refetch()} className="text-sm font-medium text-figma-blue hover:underline">Try again</button>
            </div>
          ) : results.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
              <Search className="mb-4 size-9 text-figma-muted" aria-hidden="true" />
              <p className="text-sm font-medium text-figma-primary">{normalizedQuery ? "No results found" : "Nothing here yet"}</p>
              <p className="mt-1 text-sm text-figma-secondary">
                {normalizedQuery ? "Try a different search term." : "Add prompts, topics, competitors, or citation sources to see them here."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result) => {
                const Icon = resultIcon[result.kind];
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => selectResult(result)}
                    className="group flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-figma-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-figma-hover text-figma-secondary group-hover:bg-figma-card">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-figma-primary">{result.title}</span>
                      <span className="block truncate text-xs text-figma-secondary">{result.description}</span>
                    </span>
                    <span className="hidden shrink-0 text-xs text-figma-muted sm:block">{resultType[result.kind]}</span>
                    <ChevronRight className="size-4 shrink-0 text-figma-muted" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
