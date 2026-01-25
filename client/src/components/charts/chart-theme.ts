/**
 * Recharts Theme Integration
 *
 * Provides consistent chart styling using our design system colors.
 *
 * DESIGN PHILOSOPHY (Stripe-inspired):
 * - Restraint is elegance - softer colors, lighter weights
 * - Whitespace is premium - generous padding
 * - Light weights feel modern - font-weight 300-400
 * - Muted colors feel sophisticated - never full saturation
 * - Soft shadows feel expensive - subtle, diffused
 */

// Chart color palette using CSS custom properties
export const chartColors = {
  // Primary series colors - SOFTENED for premium feel
  primary: 'var(--primary-500)',           // Full primary for emphasis only
  primarySoft: 'var(--primary-400)',       // Softer primary for bars
  primaryLight: 'var(--primary-300)',      // Lighter for hover states
  primaryMuted: 'var(--primary-100)',      // Very light for backgrounds

  // Accent series colors - SOFTENED
  accent: 'var(--accent-500)',
  accentSoft: 'var(--accent-400)',
  accentLight: 'var(--accent-300)',
  accentMuted: 'var(--accent-100)',

  // Semantic colors
  success: 'var(--success-500)',
  warning: 'var(--warning-500)',
  error: 'var(--error-500)',

  // Neutral colors
  muted: 'var(--gray-100)',
  mutedForeground: 'var(--gray-400)',      // Lighter for elegance
  border: 'var(--gray-200)',

  // Chart-specific - ULTRA SUBTLE grid lines (Stripe-style)
  grid: 'var(--gray-200)',                 // Very subtle grid
  gridDark: 'var(--gray-700)',             // For dark mode
  axis: 'transparent',                      // No axis lines - cleaner
  axisLine: 'transparent',                  // Remove axis lines entirely
  trackingLine: 'var(--gray-300)',         // Dashed tracking line on hover
  tooltip: {
    bg: 'var(--background-elevated)',
    border: 'var(--border)',
    text: 'var(--text-primary)',
    muted: 'var(--text-muted)',
  },
};

// Platform-specific colors for consistency
// Using softer, more muted versions for premium feel
export const platformColors: Record<string, string> = {
  chatgpt: '#34D399',    // Softer emerald (was #10A37F)
  claude: '#FBBF24',     // Softer amber (was #D97706)
  perplexity: '#818CF8', // Softer indigo (was #6366F1)
  gemini: '#60A5FA',     // Softer blue (was #4285F4)
  grok: '#71717A',       // Soft gray instead of black
  deepseek: '#60A5FA',   // Softer blue (was #2563EB)
};

// Multi-series color palette - SOFTENED for premium feel
// These are muted, sophisticated colors that work together harmoniously
export const seriesColors = [
  '#2DD4BF',                  // Soft teal (primary)
  '#FB923C',                  // Soft orange (accent)
  '#4ADE80',                  // Soft green
  '#FBBF24',                  // Soft amber
  '#818CF8',                  // Soft indigo
  '#F472B6',                  // Soft pink
  '#A78BFA',                  // Soft purple
  '#34D399',                  // Soft emerald
];

// Common chart configuration - STRIPE-INSPIRED refinements
export const chartConfig = {
  // Font settings - LIGHT weights for elegance
  fontFamily: 'var(--font-sans)',
  fontSize: 11,                    // Smaller, more refined
  fontWeight: 400,                 // Light weight (was 500)
  fontWeightLight: 300,            // Extra light for labels

  // Grid settings - ULTRA SUBTLE (Stripe-style)
  gridStroke: chartColors.grid,
  gridStrokeWidth: 1,
  gridDashArray: '2 2',            // Tighter dash (was 3 3)
  gridOpacity: 0.4,                // More subtle

  // Axis settings - MINIMAL (Stripe removes axis lines)
  axisStroke: 'transparent',       // No axis lines
  axisStrokeWidth: 0,
  tickSize: 0,                     // No tick marks

  // Animation - SMOOTH
  animationDuration: 400,          // Slightly slower, more elegant
  animationEasing: 'ease-out',

  // Tooltip cursor - SUBTLE tracking
  tooltipCursor: {
    fill: 'transparent',           // No filled cursor
    stroke: chartColors.trackingLine,
    strokeDasharray: '3 3',
    strokeWidth: 1,
  },
};

// Recharts component props - STRIPE-INSPIRED refinements
export const rechartsProps = {
  // XAxis defaults - MINIMAL, ELEGANT
  xAxis: {
    stroke: 'transparent',
    strokeWidth: 0,
    tick: {
      fontSize: chartConfig.fontSize,
      fill: chartColors.mutedForeground,
      fontWeight: chartConfig.fontWeightLight,  // Light weight
    },
    tickLine: false,
    axisLine: false,                            // No axis line
  },

  // YAxis defaults - MINIMAL, ELEGANT
  yAxis: {
    stroke: 'transparent',
    strokeWidth: 0,
    tick: {
      fontSize: chartConfig.fontSize,
      fill: chartColors.mutedForeground,
      fontWeight: chartConfig.fontWeightLight,  // Light weight
    },
    tickLine: false,
    axisLine: false,                            // No axis line
  },

  // CartesianGrid defaults - ULTRA SUBTLE
  cartesianGrid: {
    stroke: chartConfig.gridStroke,
    strokeWidth: chartConfig.gridStrokeWidth,
    strokeDasharray: chartConfig.gridDashArray,
    strokeOpacity: chartConfig.gridOpacity,     // More subtle
    vertical: false,
  },

  // Tooltip defaults - PREMIUM FEEL
  tooltip: {
    contentStyle: {
      backgroundColor: 'var(--background-elevated)',
      border: '1px solid var(--border)',
      borderRadius: '12px',                     // More rounded
      padding: '16px',                          // More generous
      boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)', // Softer shadow
      minWidth: '180px',
    },
    labelStyle: {
      color: 'var(--text-primary)',
      fontWeight: 500,                          // Medium, not bold
      marginBottom: '12px',                     // More breathing room
      fontSize: '13px',
    },
    itemStyle: {
      color: 'var(--text-secondary)',
      padding: '4px 0',                         // More spacing
      fontWeight: 400,                          // Light weight
      fontSize: '12px',
    },
    cursor: {
      fill: 'transparent',
      stroke: chartColors.trackingLine,
      strokeDasharray: '3 3',
    },
  },

  // Legend defaults - REFINED
  legend: {
    wrapperStyle: {
      paddingTop: '20px',                       // More breathing room
    },
    iconType: 'circle' as const,
    iconSize: 6,                                // Smaller, more refined
  },
};

// Helper to get color by index (cycles through palette)
export function getSeriesColor(index: number): string {
  return seriesColors[index % seriesColors.length];
}

// Helper to get platform color
export function getPlatformColor(platform: string): string {
  return platformColors[platform.toLowerCase()] || getSeriesColor(0);
}

// Responsive breakpoints for charts
export const chartBreakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// Chart aspect ratios
export const chartAspectRatios = {
  wide: 16 / 9,     // 1.78
  standard: 4 / 3,  // 1.33
  square: 1,
  tall: 3 / 4,      // 0.75
};
