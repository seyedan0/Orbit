# Orbit Project Agent Guidelines

## UI & Design System
All UI work in Orbit must follow the `dark-green-task-ui` skill specifications:
- Theme: Sleek dark emerald / deep forest green obsidian palette (`#070d0a`, `#0d1712`, `#13221a`, `#1a2e24`, `#10b981`, `#34d399`).
- Consistency: Rely strictly on standard CSS tokens defined in `apps/web/src/styles/globals.css`.
- Micro-interactions: Smooth transitions, subtle glassmorphism (`--bg-glass`), and glowing accents (`--accent-glow`).
- Numerals: Use `font-variant-numeric: tabular-nums` for timers, stats, and dates.
- Persian / English locale: Clean typography and full RTL/LTR support.
