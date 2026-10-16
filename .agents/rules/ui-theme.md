# UI & Design System Rules: Dark Green Task UI

Always use and adhere to the `dark-green-task-ui` design system for all user interface work in the Orbit project.

## Core Rules
1. **Color Palette & Theme Tokens:**
   - Consume CSS variables defined in `apps/web/src/styles/globals.css`:
     - `--bg-app: #070d0a;`
     - `--bg-surface-1: #0d1712;`
     - `--bg-surface-2: #13221a;`
     - `--bg-surface-3: #1a2e24;`
     - `--bg-glass: rgba(19, 34, 26, 0.72);`
     - `--accent-primary: #10b981;`
     - `--accent-primary-hover: #34d399;`
     - `--accent-secondary: #059669;`
     - `--accent-subtle: rgba(16, 185, 129, 0.12);`
     - `--accent-glow: rgba(16, 185, 129, 0.28);`
     - `--text-primary: #ecfdf5;`
     - `--text-secondary: #9ca3af;`
     - `--text-muted: #6b7280;`
     - `--text-on-accent: #041f14;`
     - `--border-subtle: rgba(16, 185, 129, 0.12);`
     - `--border-default: rgba(255, 255, 255, 0.08);`
     - `--border-focus: #10b981;`
   - Never use pure black (`#000000`) or harsh neon green (`#00ff00`). Always use deep obsidian forest darks paired with balanced emerald and mint accents.
2. **CSS Modules Architecture:**
   - Consume design tokens via `var(--...)` inside `.module.css` or CSS classes.
   - Maintain high contrast, subtle glassmorphism (`backdrop-filter: blur(...)`), and responsive layouts.
3. **Tabular Numerals & RTL:**
   - Always apply `font-variant-numeric: tabular-nums` to timers, countdowns, timestamps, and calendar dates.
   - Support bidirectional RTL (Jalali) and LTR (Gregorian) interfaces seamlessly.
