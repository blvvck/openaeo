/**
 * Platform Icon Component
 *
 * Displays official brand logos for all supported AI platforms.
 * Shows all 8 platforms even before data flows - "show the destination" pattern.
 *
 * Platforms:
 * 1. ChatGPT (OpenAI)
 * 2. Claude (Anthropic)
 * 3. Gemini (Google)
 * 4. Grok (xAI)
 * 5. Deepseek
 * 6. Perplexity
 * 7. AI Mode (Google)
 * 8. AI Overview (Google)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

// Platform metadata with labels and colors (distinct palette)
export const PLATFORMS = [
  { id: 'chatgpt', name: 'ChatGPT', color: '#10A37F' },      // Green
  { id: 'claude', name: 'Claude', color: '#E07A2F' },        // Orange
  { id: 'gemini', name: 'Gemini', color: '#8B5CF6' },        // Purple
  { id: 'grok', name: 'Grok', color: '#6B7280' },            // Gray
  { id: 'deepseek', name: 'DeepSeek', color: '#3B82F6' },    // Blue
  { id: 'perplexity', name: 'Perplexity', color: '#06B6D4' }, // Cyan
  { id: 'ai-mode', name: 'AI Mode', color: '#EC4899' },      // Pink
  { id: 'ai-overview', name: 'AI Overview', color: '#F59E0B' }, // Amber
] as const;

// Bot metadata - single source of truth for all supported bots
// icon: matches case in getPlatformLogo switch, or platform ID if using platform logo
export const AI_BOTS = [
  { id: 'GPTBot', name: 'GPTBot', icon: 'chatgpt' },
  { id: 'ChatGPT-User', name: 'ChatGPT-User', icon: 'chatgpt' },
  { id: 'ClaudeBot', name: 'ClaudeBot', icon: 'claude' },
  { id: 'PerplexityBot', name: 'PerplexityBot', icon: 'perplexity' },
  { id: 'Google-Extended', name: 'Google-Extended', icon: 'gemini' },
  { id: 'Cohere-ai', name: 'Cohere-ai', icon: 'cohere' },
  { id: 'CCBot', name: 'CCBot', icon: null },
] as const;

export const SEARCH_BOTS = [
  { id: 'Googlebot', name: 'Googlebot', icon: 'gemini' },
  { id: 'Bingbot', name: 'Bingbot', icon: 'bing' },
  { id: 'DuckDuckBot', name: 'DuckDuckBot', icon: 'duckduckgo' },
  { id: 'YandexBot', name: 'YandexBot', icon: 'yandex' },
  { id: 'Baiduspider', name: 'Baiduspider', icon: 'baidu' },
] as const;

export const SOCIAL_BOTS = [
  { id: 'Twitterbot', name: 'Twitterbot', icon: 'x' },
  { id: 'facebookexternalhit', name: 'Facebook Bot', icon: 'facebook' },
  { id: 'LinkedInBot', name: 'LinkedInBot', icon: 'linkedin' },
  { id: 'Slackbot', name: 'Slackbot', icon: 'slack' },
] as const;

/**
 * Official platform logo SVG components
 * These are simplified versions of official brand marks for use as icons
 */

// OpenAI logo for ChatGPT
function OpenAILogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

// Anthropic logo for Claude
function AnthropicLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.304 3.541h-3.672l6.696 16.918h3.672zm-10.608 0L0 20.459h3.744l1.38-3.6h7.031l1.381 3.6h3.744L10.584 3.54zm.144 10.536l2.16-5.639 2.16 5.64z" />
    </svg>
  );
}

// Google Gemini sparkle logo
function GeminiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
    </svg>
  );
}

// X/Grok logo — the actual X brand mark, scaled to match visual weight of other icons
function GrokLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

// DeepSeek logo (official whale logo - white on colored background)
function DeepSeekLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="3.771 3.8 23.993 23.993" fill="none" className={className}>
      <path d="m27.501 8.469c-.252-.123-.36.111-.508.23-.05.04-.093.09-.135.135-.368.395-.797.652-1.358.621-.821-.045-1.521.213-2.14.842-.132-.776-.57-1.238-1.235-1.535-.349-.155-.701-.309-.944-.645-.171-.238-.217-.504-.303-.765-.054-.159-.108-.32-.29-.348-.197-.031-.274.135-.352.273-.31.567-.43 1.192-.419 1.825.028 1.421.628 2.554 1.82 3.36.136.093.17.186.128.321-.081.278-.178.547-.264.824-.054.178-.135.217-.324.14a5.448 5.448 0 0 1 -1.719-1.169c-.848-.82-1.614-1.726-2.57-2.435-.225-.166-.449-.32-.681-.467-.976-.95.128-1.729.383-1.82.267-.096.093-.428-.77-.424s-1.653.293-2.659.677a2.782 2.782 0 0 1 -.46.135 9.554 9.554 0 0 0 -2.853-.1c-1.866.21-3.356 1.092-4.452 2.6-1.315 1.81-1.625 3.87-1.246 6.018.399 2.261 1.552 4.136 3.326 5.601 1.837 1.518 3.955 2.262 6.37 2.12 1.466-.085 3.1-.282 4.942-1.842.465.23.952.322 1.762.392.623.059 1.223-.031 1.687-.127.728-.154.677-.828.414-.953-2.132-.994-1.665-.59-2.09-.916 1.084-1.285 2.717-2.619 3.356-6.94.05-.343.007-.558 0-.837-.004-.168.034-.235.228-.254a4.084 4.084 0 0 0 1.529-.47c1.382-.757 1.938-1.997 2.07-3.485.02-.227-.004-.463-.243-.582zm-12.041 13.391c-2.067-1.627-3.07-2.162-3.483-2.138-.387.021-.318.465-.233.754.089.285.205.482.368.732.113.166.19.414-.112.598-.666.414-1.823-.139-1.878-.166-1.347-.793-2.473-1.842-3.267-3.276-.765-1.38-1.21-2.861-1.284-4.441-.02-.383.093-.518.472-.586a4.692 4.692 0 0 1 1.514-.04c2.109.31 3.905 1.255 5.41 2.749.86.853 1.51 1.871 2.18 2.865.711 1.057 1.478 2.063 2.454 2.887.343.289.619.51.881.672-.792.088-2.117.107-3.022-.61zm.99-6.38a.304.304 0 1 1 .609 0c0 .17-.136.304-.306.304a.3.3 0 0 1 -.303-.305zm3.077 1.581c-.197.08-.394.15-.584.159a1.246 1.246 0 0 1 -.79-.252c-.27-.227-.463-.354-.546-.752a1.752 1.752 0 0 1 .016-.582c.07-.324-.008-.531-.235-.72-.187-.155-.422-.196-.682-.196a.551.551 0 0 1 -.252-.078c-.108-.055-.197-.19-.112-.356.027-.053.159-.183.19-.207.352-.201.758-.135 1.134.016.349.142.611.404.99.773.388.448.457.573.678.906.174.264.333.534.441.842.066.192-.02.35-.248.448z" fill="currentColor"/>
    </svg>
  );
}

// Perplexity logo (official geometric logo - icon only, no background)
function PerplexityLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="81 71 350 350" fill="none" className={className}>
      <path fill="currentColor" fillRule="nonzero" d="M348.851 128.063l-68.946 58.302h68.946v-58.302zm-83.908 48.709l100.931-85.349v94.942h32.244v143.421h-38.731v90.004l-94.442-86.662v83.946h-17.023v-83.906l-96.596 86.246v-89.628h-37.445V186.365h38.732V90.768l95.309 84.958v-83.16h17.023l-.002 84.206zm-29.209 26.616c-34.955.02-69.893 0-104.83 0v109.375h20.415v-27.121l84.415-82.254zm41.445 0l82.208 82.324v27.051h21.708V203.388c-34.617 0-69.274.02-103.916 0zm-42.874-17.023l-64.669-57.646v57.646h64.669zm13.617 124.076v-95.2l-79.573 77.516v88.731l79.573-71.047zm17.252-95.022v94.863l77.19 70.8c0-29.485-.012-58.943-.012-88.425l-77.178-77.268z"/>
    </svg>
  );
}

// Google AI Mode logo — multicolor "G" with small AI sparkle
function AIModeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* Google "G" — four colored segments */}
      <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.27-.98 2.35-2.08 3.07l3.36 2.6c1.96-1.81 3.09-4.47 3.09-7.61 0-.73-.06-1.43-.18-2.1l-.52.31z" fill="#4285F4"/>
      <path d="M12.17 22c2.77 0 5.1-.92 6.8-2.5l-3.36-2.6c-.92.62-2.1.99-3.44.99-2.64 0-4.88-1.79-5.68-4.19l-3.46 2.67c1.72 3.41 5.25 5.63 9.14 5.63z" fill="#34A853"/>
      <path d="M6.49 13.7a5.73 5.73 0 0 1 0-3.65L3.03 7.38a9.97 9.97 0 0 0 0 8.99l3.46-2.67z" fill="#FBBC04"/>
      <path d="M12.17 5.86c1.49 0 2.83.51 3.88 1.51l2.91-2.91C17.25 2.79 14.92 2 12.17 2 8.28 2 4.75 4.22 3.03 7.63l3.46 2.67c.8-2.4 3.04-4.44 5.68-4.44z" fill="#EA4335"/>
      {/* Small AI sparkle in top-right */}
      <path d="M20 2C20 3.66 18.66 5 17 5c1.66 0 3 1.34 3 3 0-1.66 1.34-3 3-3-1.66 0-3-1.34-3-3z" fill="#4285F4"/>
    </svg>
  );
}

// Google AI Overview logo — dual sparkle (large + small, Google's AI summary style)
function AIOverviewLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* Large sparkle — rounded Gemini-style 4-pointed star */}
      <path d="M10 2C10 7.52 5.52 12 0 12c5.52 0 10 4.48 10 10 0-5.52 4.48-10 10-10-5.52 0-10-4.48-10-10z" fill="#4285F4" transform="translate(2, 2) scale(0.83)"/>
      {/* Small accent sparkle — top right */}
      <path d="M19 1C19 3.76 16.76 6 14 6c2.76 0 5 2.24 5 5 0-2.76 2.24-5 5-5-2.76 0-5-2.24-5-5z" fill="#4285F4" opacity="0.6"/>
    </svg>
  );
}

// ============================================================================
// Bot Logo Components
// ============================================================================

// Cohere logo
function CohereLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path clipRule="evenodd" d="M8.128 14.099c.592 0 1.77-.033 3.398-.703 1.897-.781 5.672-2.2 8.395-3.656 1.905-1.018 2.74-2.366 2.74-4.18A4.56 4.56 0 0018.1 1H7.549A6.55 6.55 0 001 7.55c0 3.617 2.745 6.549 7.128 6.549z" fill="#39594D" fillRule="evenodd"/>
      <path clipRule="evenodd" d="M9.912 18.61a4.387 4.387 0 012.705-4.052l3.323-1.38c3.361-1.394 7.06 1.076 7.06 4.715a5.104 5.104 0 01-5.105 5.104l-3.597-.001a4.386 4.386 0 01-4.386-4.387z" fill="#D18EE2" fillRule="evenodd"/>
      <path d="M4.776 14.962A3.775 3.775 0 001 18.738v.489a3.776 3.776 0 007.551 0v-.49a3.775 3.775 0 00-3.775-3.775z" fill="#FF7759"/>
    </svg>
  );
}

// Baidu logo
function BaiduLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8.859 11.735c1.017-1.71 4.059-3.083 6.202.286 1.579 2.284 4.284 4.397 4.284 4.397s2.027 1.601.73 4.684c-1.24 2.956-5.64 1.607-6.005 1.49l-.024-.009s-1.746-.568-3.776-.112c-2.026.458-3.773.286-3.773.286l-.045-.001c-.328-.01-2.38-.187-3.001-2.968-.675-3.028 2.365-4.687 2.592-4.968.226-.288 1.802-1.37 2.816-3.085zm.986 1.738v2.032h-1.64s-1.64.138-2.213 2.014c-.2 1.252.177 1.99.242 2.148.067.157.596 1.073 1.927 1.342h3.078v-7.514l-1.394-.022zm3.588 2.191l-1.44.024v3.956s.064.985 1.44 1.344h3.541v-5.3h-1.528v3.979h-1.46s-.466-.068-.553-.447v-3.556zM9.82 16.715v3.06H8.58s-.863-.045-1.126-1.049c-.136-.445.02-.959.088-1.16.063-.203.353-.671.951-.85H9.82zm9.525-9.036c2.086 0 2.646 2.06 2.646 2.742 0 .688.284 3.597-2.309 3.655-2.595.057-2.704-1.77-2.704-3.08 0-1.374.277-3.317 2.367-3.317zM4.24 6.08c1.523-.135 2.645 1.55 2.762 2.513.07.625.393 3.486-1.975 4-2.364.515-3.244-2.249-2.984-3.544 0 0 .28-2.797 2.197-2.969zm8.847-1.483c.14-1.31 1.69-3.316 2.931-3.028 1.236.285 2.367 1.944 2.137 3.37-.224 1.428-1.345 3.313-3.095 3.082-1.748-.226-2.143-1.823-1.973-3.424zM9.425 1c1.307 0 2.364 1.519 2.364 3.398 0 1.879-1.057 3.4-2.364 3.4s-2.367-1.521-2.367-3.4C7.058 2.518 8.118 1 9.425 1z" fill="#2932E1" fillRule="nonzero"/>
    </svg>
  );
}

// Bing logo
function BingLogo({ className }: { className?: string }) {
  const id = React.useId();
  const g0 = `bing-0-${id}`;
  const g1 = `bing-1-${id}`;
  const g2 = `bing-2-${id}`;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M11.97 7.569a.92.92 0 00-.805.863c-.013.195-.01.209.43 1.347 1 2.59 1.242 3.214 1.283 3.302.099.213.237.413.41.592.134.138.222.212.37.311.26.176.39.224 1.405.527.989.295 1.529.49 1.994.723.603.302 1.024.644 1.29 1.051.191.292.36.815.434 1.342.029.206.029.661 0 .847a2.491 2.491 0 01-.376 1.026c-.1.151-.065.126.081-.058.415-.52.838-1.408 1.054-2.213a6.728 6.728 0 00.102-3.012 6.626 6.626 0 00-3.291-4.53 104.157 104.157 0 00-1.322-.698l-.254-.133a737.941 737.941 0 01-1.575-.827c-.548-.29-.78-.406-.846-.426a1.376 1.376 0 00-.29-.045l-.093.01z" fill={`url(#${g0})`}/>
      <path d="M13.164 17.24a4.385 4.385 0 00-.202.125 511.45 511.45 0 00-1.795 1.115 163.087 163.087 0 01-.989.614l-.463.288a99.198 99.198 0 01-1.502.941c-.326.2-.704.334-1.09.387-.18.024-.52.024-.7 0a2.807 2.807 0 01-1.318-.538 3.665 3.665 0 01-.543-.545 2.837 2.837 0 01-.506-1.141 2.161 2.161 0 00-.041-.182c-.008-.008.006.138.032.33.027.199.085.487.147.733.482 1.907 1.85 3.457 3.705 4.195a6.31 6.31 0 001.658.412c.22.025.844.035 1.074.017 1.054-.08 1.972-.393 2.913-.992a325.28 325.28 0 01.937-.596l.384-.244.684-.435.234-.149.009-.005.025-.017.013-.007.172-.11.597-.38c.76-.481.987-.65 1.34-.998.148-.146.37-.394.381-.425.002-.007.042-.068.088-.136a2.49 2.49 0 00.373-1.023 4.181 4.181 0 000-.847 4.336 4.336 0 00-.318-1.137c-.224-.472-.7-.9-1.383-1.245a2.972 2.972 0 00-.406-.181c-.01 0-.646.392-1.413.87a7089.171 7089.171 0 00-1.658 1.031l-.439.274z" fill={`url(#${g1})`} fillRule="nonzero"/>
      <path d="M4.003 14.946l.004 3.33.042.193c.134.604.366 1.04.77 1.445a2.701 2.701 0 001.955.814c.536 0 1-.135 1.479-.43l.703-.435.556-.346V8.003c0-2.306-.004-3.675-.012-3.782a2.734 2.734 0 00-.797-1.765c-.145-.144-.268-.24-.637-.496A1780.102 1780.102 0 015.762.362C5.406.115 5.38.098 5.271.059a.943.943 0 00-1.254.696C4.003.818 4 1.659 4 6.223v5.394H4l.003 3.329z" fill={`url(#${g2})`} fillRule="nonzero"/>
      <defs>
        <radialGradient cx="93.717%" cy="77.818%" fx="93.717%" fy="77.818%" gradientTransform="scale(-1 -.7146) rotate(49.288 2.035 -2.198)" id={g0} r="143.691%"><stop offset="0%" stopColor="#00CACC"/><stop offset="100%" stopColor="#048FCE"/></radialGradient>
        <radialGradient cx="13.893%" cy="71.448%" fx="13.893%" fy="71.448%" gradientTransform="scale(.6042 1) rotate(-23.34 .184 .494)" id={g1} r="149.21%"><stop offset="0%" stopColor="#00BBEC"/><stop offset="100%" stopColor="#2756A9"/></radialGradient>
        <linearGradient id={g2} x1="50%" x2="50%" y1="0%" y2="100%"><stop offset="0%" stopColor="#00BBEC"/><stop offset="100%" stopColor="#2756A9"/></linearGradient>
      </defs>
    </svg>
  );
}

// DuckDuckGo logo
function DuckDuckGoLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="-128 -128 256 256" className={className}>
      <circle r="108" fill="#DE5833"/>
      <circle r="96" fill="none" stroke="#ffffff" strokeWidth="7"/>
      <path d="M-32-55C-62-48-51-6-51-6l19 93 7 3M-39-73h-8l11 4s-11 0-11 7c24-1 35 5 35 5" fill="#ddd"/>
      <path d="M25 95S1 57 1 32c0-47 31-7 31-44S1-58 1-58c-15-19-44-15-44-15l7 4s-7 2-9 4 19-3 28 5c-37 3-31 33-31 33l21 120"/>
      <path d="M25-1l38-10c34 5-29 24-33 23C0 7 9 32 45 24s9 20-24 9C-26 20-1-3 25-1" fill="#fc0"/>
      <path d="M15 78l2-3c22 8 23 11 22-9s0-20-23-3c0-5-13-3-15 0-21-9-23-12-22 2 2 29 1 24 21 14" fill="#6b5"/>
      <path d="M-1 67v12c1 2 17 2 17-2s-8 3-13 1-2-13-2-13" fill="#4a4"/>
      <path d="M-23-32c-5-6-18-1-15 7 1-4 8-10 15-7m32 0c1-6 11-7 14-1-4-2-10-2-14 1m-33 16a2 2 0 1 1 0 1m-8 3a7 7 0 1 0 0-1m52-6a2 2 0 1 1 0 1m-6 3a6 6 0 1 0 0-1" fill="#148"/>
    </svg>
  );
}

// Facebook logo
function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.628 3.874 10.35 9.101 11.647v-7.98H6.627V12h2.474V9.577c0-2.533 1.469-3.92 3.694-3.92 1.105 0 2.26.204 2.26.204v2.482h-1.273c-1.254 0-1.644.803-1.644 1.626V12h2.711l-.433 3.668h-2.278v7.98C20.126 22.35 24 17.628 24 12z" fill="#0866FF"/>
      <path d="M16.278 15.668L16.711 12h-2.711V9.969c0-.823.39-1.626 1.644-1.626h1.273V5.861s-1.155-.204-2.26-.204c-2.225 0-3.694 1.387-3.694 3.92V12H8.489v3.668h2.474v7.98a9.64 9.64 0 002.899.017v-7.997h2.416z" fill="#fff"/>
    </svg>
  );
}

// LinkedIn logo
function LinkedInLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
    </svg>
  );
}

// Slack logo
function SlackLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M26.5 15C27.88 15 29 13.88 29 12.5C29 11.12 27.88 10 26.5 10C25.12 10 24 11.12 24 12.5V15H26.5ZM19.5 15C20.88 15 22 13.88 22 12.5V5.5C22 4.12 20.88 3 19.5 3C18.12 3 17 4.12 17 5.5V12.5C17 13.88 18.12 15 19.5 15Z" fill="#2EB67D"/>
      <path d="M5.5 17C4.12 17 3 18.12 3 19.5C3 20.88 4.12 22 5.5 22C6.88 22 8 20.88 8 19.5V17H5.5ZM12.5 17C11.12 17 10 18.12 10 19.5V26.5C10 27.88 11.12 29 12.5 29C13.88 29 15 27.88 15 26.5V19.5C15 18.12 13.88 17 12.5 17Z" fill="#E01E5A"/>
      <path d="M17 26.5C17 27.88 18.12 29 19.5 29C20.88 29 22 27.88 22 26.5C22 25.12 20.88 24 19.5 24H17V26.5ZM17 19.5C17 20.88 18.12 22 19.5 22H26.5C27.88 22 29 20.88 29 19.5C29 18.12 27.88 17 26.5 17H19.5C18.12 17 17 18.12 17 19.5Z" fill="#ECB22E"/>
      <path d="M15 5.5C15 4.12 13.88 3 12.5 3C11.12 3 10 4.12 10 5.5C10 6.88 11.12 8 12.5 8H15V5.5ZM15 12.5C15 11.12 13.88 10 12.5 10H5.5C4.12 10 3 11.12 3 12.5C3 13.88 4.12 15 5.5 15H12.5C13.88 15 15 13.88 15 12.5Z" fill="#36C5F0"/>
    </svg>
  );
}

// X (Twitter) logo
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
    </svg>
  );
}

// Yandex logo
function YandexLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.376 12.644L21 2h-3.842l-4.624 10.644h3.842zM13.915 24v-3.733c0-2.822-.352-3.64-1.407-5.988L6.933 2H3l7.124 15.709V24h3.79z" fill="#FF0000"/>
    </svg>
  );
}

export type PlatformId = typeof PLATFORMS[number]['id'];

// Platform info type (readonly from const)
export type PlatformInfo = typeof PLATFORMS[number];

// Writable platform info for dynamic lookups
interface PlatformInfoData {
  id: string;
  name: string;
  color: string;
}

// Map for quick lookups (using string keys for flexibility)
const PLATFORM_MAP = new Map<string, PlatformInfoData>(PLATFORMS.map(p => [p.id, { ...p }]));

export interface PlatformIconProps {
  /** Platform identifier */
  platform: PlatformId | string;
  /** Icon size */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show colored background container (legacy). Default: false (bare icon) */
  showBackground?: boolean;
  /** Additional classes */
  className?: string;
}

const sizeClasses = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

// Inner icon sizes (SVG) - slightly smaller than container for padding
const iconSizeClasses = {
  xs: 'w-2.5 h-2.5',
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-5 h-5',
};

// Bare icon — SVG sits inside an invisible container for consistent sizing
const bareIconInnerClasses = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-6 h-6',
};

/**
 * Get the appropriate logo component for a platform or bot
 */
function getPlatformLogo(platformId: string): React.ComponentType<{ className?: string }> | null {
  const id = platformId.toLowerCase().replace(/_/g, '-');
  switch (id) {
    // AI Platforms
    case 'chatgpt':
      return OpenAILogo;
    case 'claude':
      return AnthropicLogo;
    case 'gemini':
      return GeminiLogo;
    case 'grok':
      return GrokLogo;
    case 'deepseek':
      return DeepSeekLogo;
    case 'perplexity':
      return PerplexityLogo;
    case 'ai-mode':
      return AIModeLogo;
    case 'ai-overview':
      return AIOverviewLogo;
    // Bot-specific icons
    case 'cohere':
      return CohereLogo;
    case 'baidu':
      return BaiduLogo;
    case 'bing':
      return BingLogo;
    case 'duckduckgo':
      return DuckDuckGoLogo;
    case 'facebook':
      return FacebookLogo;
    case 'linkedin':
      return LinkedInLogo;
    case 'slack':
      return SlackLogo;
    case 'x':
    case 'twitter':
      return XLogo;
    case 'yandex':
      return YandexLogo;
    default:
      return null;
  }
}

/**
 * Get platform info by ID
 */
export function getPlatformInfo(platformId: string): PlatformInfoData {
  const normalized = platformId.toLowerCase().replace(/_/g, '-');
  return PLATFORM_MAP.get(normalized) || {
    id: platformId,
    name: platformId,
    color: '#6B7280',
  };
}

/**
 * Get platform color by ID
 */
export function getPlatformColor(platformId: string): string {
  const platform = getPlatformInfo(platformId);
  return platform.color;
}

/**
 * Platform Icon Component
 *
 * Renders official brand logos for each AI platform.
 * Falls back to first letter if logo not available.
 */
export function PlatformIcon({
  platform,
  size = 'sm',
  showBackground = false,
  className,
}: PlatformIconProps) {
  const info = getPlatformInfo(platform);
  const Logo = getPlatformLogo(platform);
  const isDark = info.color === '#000000';

  // Bare icon — SVG in brand color inside an invisible container for consistent sizing
  if (!showBackground) {
    return (
      <div
        className={cn('inline-flex items-center justify-center shrink-0', sizeClasses[size], className)}
        style={{ color: info.color }}
        title={info.name}
        aria-label={info.name}
      >
        {Logo ? (
          <Logo className={bareIconInnerClasses[size]} />
        ) : (
          <span className="text-[8px] font-bold">{info.name.charAt(0)}</span>
        )}
      </div>
    );
  }

  // Container style — colored background with white icon
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded shrink-0',
        sizeClasses[size],
        'text-white',
        className
      )}
      style={{
        backgroundColor: info.color,
        color: isDark ? '#fff' : '#fff',
      }}
      title={info.name}
      aria-label={info.name}
    >
      {Logo ? (
        <Logo className={iconSizeClasses[size]} />
      ) : (
        <span className="text-[8px] font-bold">{info.name.charAt(0)}</span>
      )}
    </div>
  );
}

/**
 * Platform breakdown item with icon and value
 */
export interface PlatformBreakdownItemProps {
  platform: PlatformId | string;
  value: number | null | undefined;
  /** Show percentage sign */
  showPercent?: boolean;
  /** Icon size */
  iconSize?: 'xs' | 'sm' | 'md';
  /** Additional classes */
  className?: string;
}

export function PlatformBreakdownItem({
  platform,
  value,
  showPercent = true,
  iconSize = 'xs',
  className,
}: PlatformBreakdownItemProps) {
  const info = getPlatformInfo(platform);
  const displayValue = value != null ? `${value}${showPercent ? '%' : ''}` : '--';

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <PlatformIcon platform={platform} size={iconSize} />
      <span className="text-xs text-muted-foreground tabular-nums">
        {displayValue}
      </span>
    </div>
  );
}

/**
 * Full platform breakdown showing all 8 platforms
 */
export interface PlatformBreakdownProps {
  /** Platform scores - Map of platformId to score */
  scores?: Record<string, number>;
  /** Maximum number of platforms to show (default: all 8) */
  maxPlatforms?: number;
  /** Show separator dots between items */
  showSeparators?: boolean;
  /** Additional classes */
  className?: string;
}

export function PlatformBreakdown({
  scores = {},
  maxPlatforms = 8,
  showSeparators = true,
  className,
}: PlatformBreakdownProps) {
  const platformsToShow = PLATFORMS.slice(0, maxPlatforms);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex items-center gap-x-2 overflow-x-auto scrollbar-hover-only',
          className
        )}
      >
        {platformsToShow.map((platform, index) => (
          <span key={platform.id} className="inline-flex items-center shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 cursor-default">
                  <PlatformIcon platform={platform.id} size="xs" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {platform.name}
                  </span>
                  <span className="text-xs text-muted-foreground/60">·</span>
                  <span className="text-xs font-medium tabular-nums">
                    {scores[platform.id] != null ? `${scores[platform.id]}%` : '--'}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {platform.name}: {scores[platform.id] != null ? `${scores[platform.id]}% visibility` : 'No data yet'}
              </TooltipContent>
            </Tooltip>
            {showSeparators && index < platformsToShow.length - 1 && (
              <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
            )}
          </span>
        ))}
      </div>
    </TooltipProvider>
  );
}

/**
 * Tooltip row for platform with icon
 */
export interface PlatformTooltipRowProps {
  platform: PlatformId | string;
  value: number | null | undefined;
  /** Label to show (defaults to platform name) */
  label?: string;
  /** Additional classes */
  className?: string;
}

export function PlatformTooltipRow({
  platform,
  value,
  label,
  className,
}: PlatformTooltipRowProps) {
  const info = getPlatformInfo(platform);
  const displayValue = value != null ? value : '--';
  const displayLabel = label || info.name;

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-2">
        <PlatformIcon platform={platform} size="xs" />
        <span className="text-sm text-muted-foreground">{displayLabel}</span>
      </div>
      <span className={cn(
        'text-sm font-medium tabular-nums',
        value == null && 'text-muted-foreground/50'
      )}>
        {displayValue}
      </span>
    </div>
  );
}

export default PlatformIcon;
