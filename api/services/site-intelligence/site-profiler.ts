import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import * as cheerio from "cheerio";

export interface BrandSiteProfile {
  url: string;
  domain: string;
  title: string;
  description: string;
  text: string;
}

const MAX_PAGE_BYTES = 1_500_000;
const MAX_TEXT_LENGTH = 12_000;

function isPrivateAddress(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (isIP(host) === 4) {
    const [a, b] = host.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (isIP(host) === 6) {
    return host === "::" || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
  }
  return false;
}

function normalizePublicUrl(input: string): URL {
  const value = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || isPrivateAddress(url.hostname)) {
    throw new Error("Enter a public website URL using HTTP or HTTPS.");
  }
  url.username = "";
  url.password = "";
  return url;
}

async function assertPublicDestination(url: URL): Promise<void> {
  if (isPrivateAddress(url.hostname)) throw new Error("Private network addresses cannot be analyzed.");
  if (isIP(url.hostname)) return;
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("The website hostname does not resolve to a public address.");
  }
}

async function readPageText(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_PAGE_BYTES) {
      await reader.cancel();
      throw new Error("The website page is too large to analyze.");
    }
    chunks.push(value);
  }
  const page = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    page.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(page);
}

async function fetchPage(initialUrl: URL): Promise<{ url: URL; html: string }> {
  let current = initialUrl;
  for (let redirects = 0; redirects <= 4; redirects++) {
    await assertPublicDestination(current);
    const response = await fetch(current, {
      headers: { "user-agent": "OpenAEO-SiteProfiler/1.0 (+https://github.com/blvvck/OpenAEO)" },
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === 4) throw new Error("The website redirected too many times.");
      current = normalizePublicUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > MAX_PAGE_BYTES) throw new Error("The website page is too large to analyze.");
    const html = await readPageText(response);
    return { url: current, html };
  }
  throw new Error("Could not load the website.");
}

export async function profileBrandWebsite(input: string): Promise<BrandSiteProfile> {
  const { url, html } = await fetchPage(normalizePublicUrl(input));
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer, header, form").remove();
  const title = $("title").first().text().trim() || url.hostname;
  const description = $("meta[name='description']").attr("content")?.trim() ||
    $("meta[property='og:description']").attr("content")?.trim() || "";
  const text = ($("main").text() || $("body").text()).replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
  if (!text && !description) throw new Error("No readable page content was found.");
  return { url: url.toString(), domain: url.hostname.replace(/^www\./, ""), title, description, text };
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"')\]}]+/gi) || [];
  const normalized = matches.flatMap((value) => {
    try {
      const url = new URL(value.replace(/[.,!?;:]+$/, ""));
      return ['http:', 'https:'].includes(url.protocol) && !isPrivateAddress(url.hostname) ? [url.toString()] : [];
    } catch {
      return [];
    }
  });
  return Array.from(new Set(normalized));
}

export function domainFromUrl(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}
