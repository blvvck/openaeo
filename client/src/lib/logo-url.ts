export function companyLogoUrl(domain: string): string | undefined {
  const key = import.meta.env.VITE_LOGO_DEV_KEY;
  if (!key) return undefined;
  return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(key)}`;
}
