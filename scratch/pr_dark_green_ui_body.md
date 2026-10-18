## 🌿 Overview: Dark Green Task UI Implementation & Complete App Overhaul

This PR establishes the **`dark-green-task-ui`** design system skill permanently in the Orbit project and completely rebuilds the frontend UI across all pages, components, and CSS modules with a modern, high-contrast dark emerald/forest obsidian aesthetic.

---

### 🎨 Design System & Color Tokens (`:root` in `globals.css`)
- **Core Backgrounds (Deep Forest Obsidian):**
  - `--bg-app: #070d0a`
  - `--bg-surface-1: #0d1712`
  - `--bg-surface-2: #13221a`
  - `--bg-surface-3: #1a2e24`
  - `--bg-glass: rgba(19, 34, 26, 0.72)`
- **Primary Accents (Emerald & Mint):**
  - `--accent-primary: #10b981`
  - `--accent-primary-hover: #34d399`
  - `--accent-secondary: #059669`
  - `--accent-subtle: rgba(16, 185, 129, 0.12)`
  - `--accent-glow: rgba(16, 185, 129, 0.28)`
- **Typography & Semantic Priority Accents:**
  - High / Urgent: `#f43f5e`
  - Medium / Important: `#f59e0b`
  - Low / Quick: `#3b82f6`
  - None / Slate: `#64748b`

---

### 🚀 Key Components & Modules Rebuilt
1. **Skill & Governance Integration:**
   - Permanent skill definitions in `.agents/skills/dark-green-task-ui/SKILL.md` and global user skills `~/.gemini/config/skills/dark-green-task-ui/SKILL.md`.
   - Project-wide design mandate configured in `AGENTS.md` and `.agents/rules/ui-theme.md`.
2. **Task Items & Lists:**
   - Bespoke **18px × 18px rounded square checkboxes** with dynamic priority borders, emerald fill, and pop micro-interaction.
   - Pill metadata badges for tags, dates, and delivery status indicators.
   - Floating glassmorphic **Bulk Action Bar** with emerald glow.
3. **App Shell & Sticky Navigation:**
   - Deep obsidian sidebar with a crisp 3px emerald vertical indicator bar for the active route.
   - Sticky header with `backdrop-filter: blur(12px)`.
   - Real-time pulsing sync status dot (Emerald = Synced, Amber = Syncing, Rose = Conflict/Offline).
4. **Eisenhower Matrix:**
   - Responsive 2×2 grid with tinted translucent quadrant surfaces (Q1: Rose, Q2: Emerald, Q3: Blue, Q4: Slate).
5. **Focus & Pomodoro Timer:**
   - 280px diameter SVG circular countdown ring with glowing emerald progress arc.
   - Interactive tactile ambient sound selector cards (Rain, White, Pink, Brown noise).
   - Glassmorphic 7-day analytics card with monospace tabular numbers.
6. **Calendar & Jalali DatePicker:**
   - Ultra-subtle hour lines (`rgba(255, 255, 255, 0.04)`).
   - Crisp 2px current time indicator with glowing emerald dot.
   - Dual Jalali / Gregorian support with RTL/LTR alignment, Today accent ring, and solid emerald selected state.
7. **Task Detail Drawer & Timeline:**
   - Dark slide-over drawer with infinitely nested subtasks and delivery status banners.
   - Emerald linear gradient timeline bars.

---

### 🧪 Verification
- **Test Suite:** `vitest run` passed 100% across all 45 test files (539 / 539 tests).
- **TypeScript:** `npm run typecheck` passed with 0 errors across monorepo packages.
