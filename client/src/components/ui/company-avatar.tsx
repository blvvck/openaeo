import { useState } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Deterministic company avatar — tries Google favicon first,
 * falls back to colored circle with initials.
 * For placeholders/unknown competitors, shows a globe icon.
 *
 * Same name → same color, every session, every page.
 */

/** 20 visually distinct colors — spread across the full hue spectrum, all vibrant on white text */
const AVATAR_COLORS = [
  '#E53E3E', // red
  '#DD6B20', // orange
  '#D69E2E', // gold
  '#38A169', // green
  '#319795', // teal
  '#3182CE', // blue
  '#5A67D8', // indigo
  '#805AD5', // purple
  '#D53F8C', // pink
  '#B83280', // magenta
  '#C05621', // burnt orange
  '#2F855A', // forest
  '#2B6CB0', // navy
  '#6B46C1', // deep purple
  '#97266D', // wine
  '#C53030', // crimson
  '#B7791F', // dark gold
  '#276749', // jade
  '#2C5282', // steel
  '#553C9A', // royal purple
] as const;

const SIZE_MAP = {
  xs: { container: 'w-4 h-4', text: 'text-[6px]', icon: 'w-2.5 h-2.5' },
  sm: { container: 'w-5 h-5', text: 'text-[8px]', icon: 'w-3 h-3' },
  md: { container: 'w-8 h-8', text: 'text-[11px]', icon: 'w-4 h-4' },
  lg: { container: 'w-10 h-10', text: 'text-sm', icon: 'w-5 h-5' },
} as const;

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface CompanyAvatarProps {
  /** Company name — used for initials + deterministic color */
  name: string;
  /** Optional domain for favicon lookup (e.g., "acme.com") */
  domain?: string;
  /** Optional logo URL — if provided, shows image instead of favicon/initials */
  logoUrl?: string | null;
  /** Size variant */
  size?: keyof typeof SIZE_MAP;
  /** Additional classes */
  className?: string;
  /** Show neutral gray avatar (for placeholders) */
  isPlaceholder?: boolean;
}

/** Generate a likely domain from company name */
function guessDomain(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
}

export function CompanyAvatar({ name, domain, logoUrl, size = 'sm', className, isPlaceholder }: CompanyAvatarProps) {
  const { container, text, icon } = SIZE_MAP[size];
  const [faviconFailed, setFaviconFailed] = useState(false);

  // Placeholder: neutral gray avatar with globe icon
  if (isPlaceholder) {
    return (
      <div
        className={cn(container, 'rounded-full shrink-0 flex items-center justify-center bg-gray-100', className)}
      >
        <Globe className={cn(icon, 'text-gray-400')} />
      </div>
    );
  }

  // If explicit logoUrl provided, use it
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn(container, 'rounded-full shrink-0 object-cover', className)}
      />
    );
  }

  const color = AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
  const faviconDomain = domain || guessDomain(name);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=64`;

  // Try favicon first, fall back to initials on error
  if (!faviconFailed) {
    return (
      <div
        className={cn(container, 'rounded-full shrink-0 flex items-center justify-center bg-white overflow-hidden', className)}
      >
        <img
          src={faviconUrl}
          alt={name}
          className="w-[70%] h-[70%] object-contain"
          onError={() => setFaviconFailed(true)}
        />
      </div>
    );
  }

  // Fallback to colored initials
  return (
    <div
      className={cn(container, 'rounded-full shrink-0 flex items-center justify-center', className)}
      style={{ backgroundColor: color }}
    >
      <span className={`${text} font-semibold text-white leading-none`}>
        {getInitials(name)}
      </span>
    </div>
  );
}

export default CompanyAvatar;
