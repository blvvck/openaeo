import { QueryClient, type QueryFunction } from "@tanstack/react-query";

type TokenReader = () => Promise<string | null>;
type UnauthorizedMode = "returnNull" | "throw";

let tokenReader: TokenReader | undefined;
let authenticatedScope: string | null = null;
let activeWorkspaceId: string | null = null;
const activeWorkspaceStorageKey = "openaeo.activeWorkspaceId";

export interface AccessibleWorkspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  onboarding_completed_at: string | null;
}

export interface WorkspaceListResponse {
  workspaces: AccessibleWorkspace[];
  currentWorkspaceId: string;
}

export function configureWorkspaceTokenReader(readToken: TokenReader, scope: string): void {
  if (authenticatedScope !== null && authenticatedScope !== scope) {
    workspaceQueryClient.clear();
    activeWorkspaceId = null;
  }
  authenticatedScope = scope;
  tokenReader = readToken;
}

export function selectWorkspaceForSession(workspaces: AccessibleWorkspace[], fallbackId: string): string {
  const storedId = localStorage.getItem(activeWorkspaceStorageKey);
  const selectedId = workspaces.find(({ id }) => id === storedId)?.id
    ?? workspaces.find(({ id }) => id === fallbackId)?.id
    ?? workspaces[0]?.id;
  if (!selectedId) throw new Error("No workspaces are available for this account");
  activeWorkspaceId = selectedId;
  localStorage.setItem(activeWorkspaceStorageKey, selectedId);
  return selectedId;
}

export function getActiveWorkspaceId(): string | null {
  return activeWorkspaceId;
}

export function setActiveWorkspace(id: string): void {
  activeWorkspaceId = id;
  localStorage.setItem(activeWorkspaceStorageKey, id);
  workspaceQueryClient.clear();
}

async function send(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await tokenReader?.();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (activeWorkspaceId && url !== "/api/workspaces") {
    headers.set("x-workspace-id", activeWorkspaceId);
  }

  return fetch(url, { ...init, headers, credentials: "include" });
}

export function workspaceFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return send(url, init);
}

async function requireOk(response: Response): Promise<void> {
  if (response.ok) return;

  const detail = (await response.text()) || response.statusText;
  throw new Error(`${response.status}: ${detail}`);
}

export async function requestWorkspaceApi(
  method: string,
  url: string,
  body?: unknown,
): Promise<Response> {
  const headers = body === undefined ? undefined : { "Content-Type": "application/json" };
  const response = await send(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  await requireOk(response);
  return response;
}

function createWorkspaceQuery<T>(mode: UnauthorizedMode): QueryFunction<T> {
  return async ({ queryKey }) => {
    const endpoint = queryKey[0];
    if (typeof endpoint !== "string") {
      throw new TypeError("Workspace query keys must start with a URL string");
    }

    const response = await send(endpoint);
    if (mode === "returnNull" && response.status === 401) return null as T;

    await requireOk(response);
    const data = await response.json() as T;
    if (endpoint === "/api/workspaces") {
      const workspaceList = data as WorkspaceListResponse;
      selectWorkspaceForSession(workspaceList.workspaces, workspaceList.currentWorkspaceId);
    }
    return data;
  };
}

export const workspaceQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: createWorkspaceQuery("throw"),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: { retry: false },
  },
});
