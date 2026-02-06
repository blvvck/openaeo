export type GlobalSearchKind = "prompt" | "topic" | "competitor" | "source" | "navigation" | "platform";

export interface GlobalSearchResult {
  id: string;
  kind: GlobalSearchKind;
  title: string;
  description: string;
  href: string;
}

export interface GlobalSearchResponse {
  results: GlobalSearchResult[];
  partial?: boolean;
  errors?: string[];
}
