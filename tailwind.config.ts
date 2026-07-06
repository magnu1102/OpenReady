import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "var(--bg-canvas)",
        surface: "var(--bg-surface)",
        subtle: "var(--bg-subtle)",
        "border-subtle": "var(--border-subtle)",
        "border-default": "var(--border-default)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
        },
        success: "var(--success)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        glass: {
          surface: "var(--glass-surface)",
          strong: "var(--glass-surface-strong)",
          border: "var(--glass-border)",
          highlight: "var(--glass-highlight)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        subtle: "var(--shadow-subtle)",
        elevated: "var(--shadow-elevated)",
        glass: "var(--shadow-glass)",
        glow: "var(--shadow-glow)",
      },
      backdropBlur: {
        glass: "var(--blur-glass)",
        "glass-strong": "var(--blur-glass-strong)",
      },
      backgroundImage: {
        "accent-gradient":
          "linear-gradient(135deg, var(--gradient-accent-from), var(--gradient-accent-to))",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.4" }],
        sm: ["0.8125rem", { lineHeight: "1.45" }],
        base: ["0.875rem", { lineHeight: "1.5" }],
        md: ["1rem", { lineHeight: "1.55" }],
        lg: ["1.125rem", { lineHeight: "1.45" }],
        xl: ["1.375rem", { lineHeight: "1.3" }],
        "2xl": ["1.75rem", { lineHeight: "1.2" }],
        "3xl": ["2.25rem", { lineHeight: "1.15" }],
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      transitionDuration: {
        micro: "150ms",
        soft: "220ms",
        route: "320ms",
      },
    },
  },
  plugins: [],
};

export default config;
