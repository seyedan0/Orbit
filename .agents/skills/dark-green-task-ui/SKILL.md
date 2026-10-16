---
name: dark-green-task-ui
description: >-
  Design, refactor, and build sleek dark-green UI components, pages, and CSS modules
  for task management and productivity applications. Use when the user asks to design
  or style task lists, calendars, Jalali date pickers, Eisenhower matrices, Pomodoro focus
  timers, timelines, smart filters, or layout shells in a dark emerald/forest green theme.
---

# Dark Green Task UI

A complete UI/UX design system and frontend implementation skill tailored for full-featured task management and productivity applications (supporting Tasks, Subtasks, Jalali/Gregorian Calendars, Eisenhower Matrix, Pomodoro Focus Timer, Timeline, and Smart Filters) with a sleek, modern dark-green aesthetic.

## When to Use
- Creating or refactoring React (`.tsx`) components and CSS Modules (`.module.css`) or global styles (`globals.css`) for a task/productivity app.
- Designing or improving views like Today/Inbox lists, Calendar (Day/Week/Month/Agenda), Eisenhower Matrix, Pomodoro Focus timer, or Timeline.
- Applying a cohesive dark emerald/forest green theme with high contrast, subtle glassmorphism, and micro-interactions.
- Implementing RTL/LTR bidirectional layouts and clean Persian/English typography for Jalali and Gregorian calendar interfaces.

## Design System & Color Tokens
Always define or reference these CSS custom properties in `globals.css` (or `:root`) to maintain visual consistency across the application:

```css
:root {
  /* Core Backgrounds - Deep Forest Obsidian */
  --bg-app: #070d0a;
  --bg-surface-1: #0d1712;
  --bg-surface-2: #13221a;
  --bg-surface-3: #1a2e24;
  --bg-glass: rgba(19, 34, 26, 0.72);

  /* Primary Accents - Emerald & Mint */
  --accent-primary: #10b981;
  --accent-primary-hover: #34d399;
  --accent-secondary: #059669;
  --accent-subtle: rgba(16, 185, 129, 0.12);
  --accent-glow: rgba(16, 185, 129, 0.28);

  /* Typography */
  --text-primary: #ecfdf5;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;
  --text-on-accent: #041f14;

  /* Borders & Dividers */
  --border-subtle: rgba(16, 185, 129, 0.12);
  --border-default: rgba(255, 255, 255, 0.08);
  --border-focus: #10b981;

  /* Priority & Matrix Semantic Colors */
  --priority-high: #f43f5e;      /* Urgent & Important / Do First */
  --priority-medium: #f59e0b;    /* Important, Not Urgent / Schedule */
  --priority-low: #3b82f6;       /* Urgent, Not Important / Delegate */
  --priority-none: #64748b;      /* Neither / Eliminate */

  /* Radii & Shadows */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-default);
  --shadow-glow: 0 0 24px -4px var(--accent-glow);
}
```

## Steps & Component Guidelines

### 1. App Shell & Navigation (AppShell)
- **Sidebar:** Use `--bg-surface-1` with a 1px solid `var(--border-subtle)` right/left border. Active navigation items receive `background: var(--accent-subtle)`, `color: var(--accent-primary)`, and a 3px vertical indicator bar in `--accent-primary`.
- **Header / Command Bar:** Use `backdrop-filter: blur(12px)` with `background: var(--bg-glass)` so scrolling tasks smoothly pass underneath.
- **Sync Status Badge:** Display sync telemetry and online/offline states using a subtle pulsing emerald dot (`#10b981`) when synced, amber (`#f59e0b`) when syncing mutations, and rose (`#f43f5e`) on conflict or offline error.

### 2. Task Items & Lists (TaskItem, TaskList, TaskForm, BulkActionBar, TaskDetailDrawer)
- **Task Row:** Keep rows compact (`padding: 10px 14px`, `border-radius: var(--radius-md)`). Default background is transparent or `--bg-surface-1`, transitioning to `--bg-surface-2` on hover with a subtle left/right border highlight.
- **Custom Checkbox:** Style checkboxes as 18px x 18px rounded squares (`border-radius: 5px`) with border colored by priority (`--priority-high`, etc.). When checked, fill with `--accent-primary` and animate a crisp checkmark in `--text-on-accent`.
- **Metadata Badges:** Render tags, recurrence icons, reminders, and natural-date chips (Today, Tomorrow, Jalali dates) as compact pills (`font-size: 0.75rem`, `padding: 2px 8px`, `border-radius: var(--radius-full)`, `background: var(--bg-surface-3)`).
- **Bulk Action Bar:** Float at the bottom center (`position: fixed; bottom: 24px`) using `--bg-glass`, `backdrop-filter: blur(16px)`, `--shadow-glow`, and `--border-focus` for batch operations.
- **Task Detail Drawer:** Slide-over from the edge with `--bg-surface-1`, `border-right/left: 1px solid var(--border-subtle)`, backdrop blur overlay, and smooth spring animations.

### 3. Eisenhower Matrix (EisenhowerMatrixPage)
- Structure as a responsive 2x2 CSS Grid (`gap: 16px`, `height: calc(100vh - 120px)`).
- Each quadrant card uses `--bg-surface-1`, `border-radius: var(--radius-lg)`, and a subtle top border or header badge tinted with its semantic priority color:
  - **Q1 (Do First):** Rose tint (`rgba(244, 63, 94, 0.12)`) + `#f43f5e` header accent.
  - **Q2 (Schedule):** Emerald/Amber tint (`rgba(16, 185, 129, 0.12)`) + `#10b981` header accent.
  - **Q3 (Delegate):** Blue tint (`rgba(59, 130, 246, 0.12)`) + `#3b82f6` header accent.
  - **Q4 (Eliminate):** Slate tint (`rgba(100, 116, 139, 0.12)`) + `#64748b` header accent.

### 4. Pomodoro Focus & Ambient Sound (FocusPage, FocusAnalyticsCard)
- **Timer Ring:** Center a large SVG circular progress ring (280px diameter). Use `stroke: var(--bg-surface-3)` for the track and `stroke: var(--accent-primary)` with `filter: drop-shadow(0 0 8px var(--accent-glow))` for the active progress arc.
- **Ambient Sound Controls:** Style sound toggles (Rain, Forest, White Noise, Cafe) as interactive tactile cards that glow with `--border-focus` and `--accent-subtle` when active.
- **Analytics Cards:** Display daily focus minutes, completed pomodoros, and streaks using clean stat cards with monospace numbers (`font-variant-numeric: tabular-nums`) and emerald sparklines/bars.

### 5. Calendar, Jalali DatePicker & Timeline (CalendarPage, DatePicker, TimelinePage)
- **Grid & Current Time Indicator:** In DayView and WeekView, use subtle `rgba(255, 255, 255, 0.04)` hour lines. Render the current time indicator as a crisp 2px line in `--accent-primary` with a glowing emerald dot on the axis.
- **Jalali / Gregorian DatePicker:** Support clean RTL/LTR switching (`dir="rtl"` for Jalali, `dir="ltr"` for Gregorian). Highlight "Today" with a 1px solid `var(--accent-primary)` ring and the selected date with a solid `--accent-primary` fill and `--text-on-accent` text.
- **Timeline / Gantt View:** Style task bars with `background: linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))` and `border-radius: var(--radius-sm)`.

## Gotchas & Best Practices
- **Avoid Pure Black & Neon Green:** Never use `#000000` with `#00ff00` (looks like a retro terminal). Always use deep forest-tinted darks (`#070d0a`, `#0d1712`) paired with balanced emerald (`#10b981`, `#34d399`).
- **Respect CSS Modules Architecture:** When working in projects using `.module.css`, define theme tokens in `globals.css` and consume them via `var(--token-name)` inside individual `.module.css` files rather than hardcoding hex values.
- **Tabular Numbers for Timers & Dates:** Always apply `font-variant-numeric: tabular-nums` to Pomodoro countdowns, calendar grids, and Jalali/Gregorian dates so layout doesn't jitter as numbers change.
