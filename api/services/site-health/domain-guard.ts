import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

export interface PublicFetchOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface PublicFetchResult {
  status: number;
  ok: boolean;
  text: string;
}

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [first, second] = parts;
  return first === 0 || first === 10 || first === 127 || first >= 224
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 100 && second >= 64 && second <= 127);
}

function isPrivateIPv6(address: string): boolean {
  const lower = address.toLowerCase();
  if (lower.startsWith("::ffff:")) return isPrivateIPv4(lower.slice(7));
  return lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

function isPrivateAddress(address: string): boolean {
  return isIP(address) === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address);
}

async function publicIp(host: string): Promise<string> {
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("Private addresses are not allowed");
    return host;
  }
  const addresses = await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private addresses are not allowed");
  }
  return addresses[0].address;
}

export async function assertPublicDomain(value: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw new Error("Invalid domain");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) {
    throw new Error("Invalid domain");
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || !/^[a-z0-9.-]+$/.test(host) || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Invalid domain");
  }
  const version = isIP(host);
  if (version === 4 && isPrivateIPv4(host)) throw new Error("Private addresses are not allowed");
  if (version === 6 && isPrivateIPv6(host)) throw new Error("Private addresses are not allowed");
  if (!version) {
    const addresses = await lookup(host, { all: true });
    if (addresses.length === 0 || addresses.some(({ address }) =>
      isIP(address) === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address)
    )) {
      throw new Error("Private addresses are not allowed");
    }
  }
  return host;
}

async function fetchPinned(url: string, options: PublicFetchOptions, hops: number): Promise<PublicFetchResult> {
  if (hops > 3) throw new Error("Too many redirects");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Only HTTPS targets are allowed");
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  await assertPublicDomain(host);
  const pinned = await publicIp(host);
  const family = isIP(pinned);
  const agent = new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => callback(null, pinned, family),
    },
  });
  try {
    const response = await undiciFetch(url, {
      signal: options.signal,
      headers: options.headers,
      redirect: "manual",
      dispatcher: agent,
    });
    const location = response.headers.get("location");
    if (location && response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      return fetchPinned(new URL(location, url).toString(), options, hops + 1);
    }
    return { status: response.status, ok: response.ok, text: await response.text() };
  } finally {
    await agent.close();
  }
}

export function fetchPublicText(url: string, options: PublicFetchOptions = {}): Promise<PublicFetchResult> {
  return fetchPinned(url, options, 0);
}
