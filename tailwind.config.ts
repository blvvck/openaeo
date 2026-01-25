import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  // Safelist dynamic skeleton width classes used in dashboard
  safelist: [
    // Competitor Rankings brand name widths
    "w-20",
    "w-24",
    "w-28",
    "w-32",
    // Alert title widths (fractional)
    "w-2/3",
    "w-3/4",
    "w-full",
    // Insight title widths (fractional)
    "w-1/2",
    "w-3/5",
  ],
  theme: {
    extend: {
      /* ===== TYPOGRAPHY ===== */
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        /* Display */
        display: [
          "var(--text-display-size)",
          {
            lineHeight: "var(--text-display-line-height)",
            letterSpacing: "var(--text-display-letter-spacing)",
            fontWeight: "var(--text-display-weight)",
          },
        ],
        /* Headings */
        h1: [
          "var(--text-h1-size)",
          {
            lineHeight: "var(--text-h1-line-height)",
            letterSpacing: "var(--text-h1-letter-spacing)",
            fontWeight: "var(--text-h1-weight)",
          },
        ],
        h2: [
          "var(--text-h2-size)",
          {
            lineHeight: "var(--text-h2-line-height)",
            letterSpacing: "var(--text-h2-letter-spacing)",
            fontWeight: "var(--text-h2-weight)",
          },
        ],
        h3: [
          "var(--text-h3-size)",
          {
            lineHeight: "var(--text-h3-line-height)",
            letterSpacing: "var(--text-h3-letter-spacing)",
            fontWeight: "var(--text-h3-weight)",
          },
        ],
        h4: [
          "var(--text-h4-size)",
          {
            lineHeight: "var(--text-h4-line-height)",
            letterSpacing: "var(--text-h4-letter-spacing)",
            fontWeight: "var(--text-h4-weight)",
          },
        ],
        /* Body */
        "body-lg": [
          "var(--text-body-lg-size)",
          {
            lineHeight: "var(--text-body-lg-line-height)",
            letterSpacing: "var(--text-body-lg-letter-spacing)",
          },
        ],
        body: [
          "var(--text-body-size)",
          {
            lineHeight: "var(--text-body-line-height)",
            letterSpacing: "var(--text-body-letter-spacing)",
          },
        ],
        "body-sm": [
          "var(--text-body-sm-size)",
          {
            lineHeight: "var(--text-body-sm-line-height)",
            letterSpacing: "var(--text-body-sm-letter-spacing)",
          },
        ],
        /* Utility */
        caption: [
          "var(--text-caption-size)",
          {
            lineHeight: "var(--text-caption-line-height)",
            letterSpacing: "var(--text-caption-letter-spacing)",
          },
        ],
        label: [
          "var(--text-label-size)",
          {
            lineHeight: "var(--text-label-line-height)",
            letterSpacing: "var(--text-label-letter-spacing)",
          },
        ],
        /* Additional sizes from spec */
        "2xs": ["0.625rem", { lineHeight: "1.3" }], /* 10px - micro labels, chart axes */

        /* ===== FIGMA DASHBOARD TYPOGRAPHY ===== */
        /* Exact sizes from Figma dashboard cards */
        "figma-2xs": ["0.6875rem", { lineHeight: "1.4" }],  /* 11px - subtitles, legends */
        "figma-xs": ["0.75rem", { lineHeight: "1.4" }],     /* 12px - labels, captions */
        "figma-sm": ["0.8125rem", { lineHeight: "1.5" }],   /* 13px - body text, buttons */
        "figma-base": ["0.875rem", { lineHeight: "1.5" }],  /* 14px - card titles, trends */
        "figma-md": ["1rem", { lineHeight: "1.5" }],        /* 16px - prompts, emphasis */
        "figma-lg": ["2rem", { lineHeight: "1" }],          /* 32px - hero metrics */
      },
      fontWeight: {
        regular: "var(--font-weight-regular)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold: "var(--font-weight-bold)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        /* === SEMANTIC BACKGROUND TOKENS === */
        background: "var(--background)",
        "background-elevated": "var(--background-elevated)",
        "background-muted": "var(--background-muted)",
        "background-subtle": "var(--background-subtle)",

        /* === SEMANTIC TEXT TOKENS === */
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "text-disabled": "var(--text-disabled)",

        /* === BORDER TOKENS === */
        border: "var(--border)",
        "border-muted": "var(--border-muted)",
        "border-focus": "var(--border-focus)",

        /* === SEMANTIC STATUS COLORS === */
        success: {
          DEFAULT: "var(--success)",
          muted: "var(--success-muted)",
          50: "var(--success-50)",
          100: "var(--success-100)",
          200: "var(--success-200)",
          300: "var(--success-300)",
          400: "var(--success-400)",
          500: "var(--success-500)",
          600: "var(--success-600)",
          700: "var(--success-700)",
          800: "var(--success-800)",
          900: "var(--success-900)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          muted: "var(--warning-muted)",
          50: "var(--warning-50)",
          100: "var(--warning-100)",
          200: "var(--warning-200)",
          300: "var(--warning-300)",
          400: "var(--warning-400)",
          500: "var(--warning-500)",
          600: "var(--warning-600)",
          700: "var(--warning-700)",
          800: "var(--warning-800)",
          900: "var(--warning-900)",
        },
        error: {
          DEFAULT: "var(--error)",
          muted: "var(--error-muted)",
          50: "var(--error-50)",
          100: "var(--error-100)",
          200: "var(--error-200)",
          300: "var(--error-300)",
          400: "var(--error-400)",
          500: "var(--error-500)",
          600: "var(--error-600)",
          700: "var(--error-700)",
          800: "var(--error-800)",
          900: "var(--error-900)",
        },
        info: {
          DEFAULT: "var(--info)",
          muted: "var(--info-muted)",
        },

        /* === TREND INDICATORS === */
        trend: {
          up: "var(--trend-up)",
          down: "var(--trend-down)",
          neutral: "var(--trend-neutral)",
        },

        /* === BRAND COLOR PALETTES === */
        primary: {
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          200: "var(--primary-200)",
          300: "var(--primary-300)",
          400: "var(--primary-400)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          800: "var(--primary-800)",
          900: "var(--primary-900)",
          950: "var(--primary-950)",
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        accent: {
          50: "var(--accent-50)",
          100: "var(--accent-100)",
          200: "var(--accent-200)",
          300: "var(--accent-300)",
          400: "var(--accent-400)",
          500: "var(--accent-500)",
          600: "var(--accent-600)",
          700: "var(--accent-700)",
          800: "var(--accent-800)",
          900: "var(--accent-900)",
          950: "var(--accent-950)",
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          primary: "var(--accent-primary)",
          "primary-hover": "var(--accent-primary-hover)",
          "primary-muted": "var(--accent-primary-muted)",
          secondary: "var(--accent-secondary)",
        },
        gray: {
          50: "var(--gray-50)",
          100: "var(--gray-100)",
          200: "var(--gray-200)",
          300: "var(--gray-300)",
          400: "var(--gray-400)",
          500: "var(--gray-500)",
          600: "var(--gray-600)",
          700: "var(--gray-700)",
          800: "var(--gray-800)",
          900: "var(--gray-900)",
          950: "var(--gray-950)",
        },

        /* === COMPONENT SEMANTIC COLORS === */
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        input: "var(--input)",
        ring: "var(--ring)",

        /* === CHART PALETTE (8 colors, colorblind-safe) === */
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
          "6": "var(--chart-6)",
          "7": "var(--chart-7)",
          "8": "var(--chart-8)",
          "1-muted": "var(--chart-1-muted)",
          "2-muted": "var(--chart-2-muted)",
          "3-muted": "var(--chart-3-muted)",
          "4-muted": "var(--chart-4-muted)",
          "5-muted": "var(--chart-5-muted)",
          "6-muted": "var(--chart-6-muted)",
          "7-muted": "var(--chart-7-muted)",
          "8-muted": "var(--chart-8-muted)",
        },

        /* === SIDEBAR === */
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },

        /* === FIGMA ALIGNMENT === */
        figma: {
          /* Text colors */
          primary: "var(--figma-text-primary)",       /* #111827 - titles, emphasis */
          secondary: "var(--figma-text-secondary)",   /* #6B7380 - labels, names */
          muted: "var(--figma-text-muted)",           /* #9CA3B0 - subtitles, counts */
          tertiary: "var(--figma-text-tertiary)",     /* #D1D6DB - divider chars */

          /* Border colors */
          border: "var(--figma-border)",              /* #E5E7EB - card borders */
          "border-light": "var(--figma-border-light)",/* #E8EAED - light dividers */

          /* Background colors */
          hover: "var(--figma-bg-hover)",             /* #F9FAFB - row hover */
          "bar-track": "var(--figma-bar-track)",      /* #F2F5F7 - progress bar track */
          card: "var(--figma-bg-card)",               /* #FFFFFF - card bg */

          /* Accent colors */
          blue: "var(--figma-blue)",                  /* #2462EB - primary action */
          "blue-light": "var(--figma-blue-light)",    /* #EEF6FF - blue bg */

          /* Trend colors */
          "trend-up": "var(--figma-trend-up)",        /* #17A34A - positive */
          "trend-down": "var(--figma-trend-down)",    /* #DC2626 - negative */

          /* Status colors */
          green: "var(--figma-green)",                /* #17A34A */
          success: "var(--figma-green-success)",      /* #21B873 */
          orange: "var(--figma-orange)",              /* #F29E26 */
          red: "var(--figma-red)",                    /* #DC2626 */
        },
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out forwards",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
