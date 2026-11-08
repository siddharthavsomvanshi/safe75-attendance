# Safe75 Design System (Master Source of Truth)
*Generated with UI UX Pro Max for Safe75 Attendance & Academic Productivity Suite*
*Design Philosophy: Inspired by Linear, Notion, and Raycast — Precision, Clarity, Human-Crafted Simplicity*

---

## 1. Design Vision & Philosophy
- **Identity**: Safe75 is an essential daily utility for university students. It must inspire confidence, calm anxiety around attendance rules, and provide instant situational awareness.
- **Tone**: Mature, reliable, uncluttered, purposeful. No generic "AI gradient glow", no cartoonish illustrations, no emoji-heavy structural chrome.
- **Density**: Tuned to 8/10 for desktop dashboards and high-clarity mobile scanning. High information density without visual crowding.

---

## 2. Color Tokens & Theme Architecture

The system supports two meticulously calibrated modes: **Light (Refined Zinc & Slate)** and **Dark/AMOLED (Deep Obsidian & Charcoal)**. Both maintain strict WCAG AA 4.5:1+ text contrast and 3:1+ UI component boundaries.

### Semantic Status Palette (Uniform across modes)
- **Safe / Above 75%** (`--success`): `#10B981` (Emerald 500) | Light surface: `#ECFDF5`, Border: `#A7F3D0` | Dark surface: `rgba(16, 185, 129, 0.12)`, Border: `rgba(16, 185, 129, 0.25)`
- **Warning / Borderline 75–80%** (`--warning`): `#F59E0B` (Amber 500) | Light surface: `#FFFBEB`, Border: `#FDE68A` | Dark surface: `rgba(245, 158, 11, 0.12)`, Border: `rgba(245, 158, 11, 0.25)`
- **Danger / Under 75%** (`--danger`): `#EF4444` (Rose 500) | Light surface: `#FEF2F2`, Border: `#FECACA` | Dark surface: `rgba(239, 68, 68, 0.12)`, Border: `rgba(239, 68, 68, 0.25)`
- **Informational / Neutral Active** (`--info`): `#0284C7` (Sky 600) | Light surface: `#F0F9FF`, Border: `#BAE6FD` | Dark surface: `rgba(2, 132, 199, 0.12)`, Border: `rgba(2, 132, 199, 0.25)`

### Light Theme Tokens
- `--bg-body`: `#F8FAFC` (Slate 50 — clean, crisp, neutral)
- `--bg-surface`: `#FFFFFF` (Pure white card surfaces)
- `--bg-surface-subtle`: `#F1F5F9` (Slate 100 — secondary segments & input wells)
- `--bg-surface-hover`: `#E2E8F0` (Slate 200 — interactive hover states)
- `--text-primary`: `#0F172A` (Slate 900 — high-contrast primary text)
- `--text-secondary`: `#475569` (Slate 600 — clear readable body)
- `--text-muted`: `#64748B` (Slate 500 — metadata, captions, timestamps)
- `--border-subtle`: `#E2E8F0` (Slate 200 — delicate card borders)
- `--border-strong`: `#CBD5E1` (Slate 300 — input borders, focused separators)
- `--primary-brand`: `#18181B` (Zinc 900 — Linear-style solid black/charcoal CTA)
- `--primary-brand-hover`: `#27272A` (Zinc 800)
- `--primary-brand-text`: `#FFFFFF`
- `--accent`: `#0D9488` (Teal 600 — purposeful focus and active accents)

### Dark / AMOLED Theme Tokens
- `--bg-body`: `#090A0F` (True dark obsidian with neutral tint)
- `--bg-surface`: `#11131A` (Elevation 1 card background)
- `--bg-surface-subtle`: `#181B24` (Elevation 2 segments & wells)
- `--bg-surface-hover`: `#212532` (Interactive hover state)
- `--text-primary`: `#F8FAFC` (Slate 50 — crisp legible foreground)
- `--text-secondary`: `#94A3B8` (Slate 400 — descriptive secondary)
- `--text-muted`: `#64748B` (Slate 500 — supporting labels)
- `--border-subtle`: `rgba(255, 255, 255, 0.08)` (1px precision hairline)
- `--border-strong`: `rgba(255, 255, 255, 0.15)`
- `--primary-brand`: `#F8FAFC` (High-contrast clean white CTA)
- `--primary-brand-hover`: `#E2E8F0`
- `--primary-brand-text`: `#090A0F`
- `--accent`: `#14B8A6` (Teal 500)

---

## 3. Typography Hierarchy & Numerics

- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Numerics Setting**: `font-variant-numeric: tabular-nums; font-feature-settings: 'tnum', 'cv02', 'cv03', 'cv04'` for rock-solid tabular alignment of percentages, ratios, and dates.
- **Type Scale**:
  - `Hero Metric / Overall %`: 48px – 64px (`clamp(2.75rem, 6vw, 4rem)`), Weight 800, line-height 1.0, tracking `-0.035em`
  - `Page Title / H1`: 22px – 26px, Weight 700, line-height 1.25, tracking `-0.025em`
  - `Section Title / H2`: 16px – 18px, Weight 600, line-height 1.3, tracking `-0.015em`
  - `Component Subtitle`: 13px – 14px, Weight 500, color `var(--text-muted)`
  - `Body Text`: 14px – 15px, Weight 400 / 500, line-height 1.55
  - `Uppercase Label / Kicker`: 11px, Weight 700, tracking `0.06em`, text-transform `uppercase`
  - `Badge / Tag`: 11.5px – 12px, Weight 600, line-height 1

---

## 4. Component Standards

### Cards & Surfaces
- Flat, modern surfaces with crisp 1px borders (`var(--border-subtle)`).
- Border radius: `12px` (standard cards/inputs) and `16px` (hero panels/dialogs). No oversized bubble corners.
- Subtle elevation: `box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)`. No heavy colored drop shadows.
- Status indicator: Clean 3px left border accent or subtle status badge instead of loud gradients.

### Buttons & Interactive Controls
- Primary button: Solid neutral brand (`var(--primary-brand)`), `height: 38px`, `border-radius: 8px`, `padding: 0 16px`, `font-weight: 600`.
- Secondary button: Outline card (`var(--bg-surface)` + `var(--border-subtle)`), text `var(--text-primary)`, hover `var(--bg-surface-hover)`.
- Destructive button: Subdued rose wash (`var(--danger-soft)`), text `var(--danger)`.
- Hit area: Minimum 44px touch height on mobile screens.

### Progress & Attendance Meters
- Track: 6px – 8px rounded track with subtle background (`var(--bg-surface-subtle)`).
- Fill: Smooth linear transitions, semantic fill color (`--success`, `--warning`, `--danger`).
- Critical 75% indicator: Subtle vertical hairline marker at `75%` with tooltip.

### Icons
- Simple, recognizable vector Lucide icons rendered as crisp SVGs.
- Standard stroke width: `1.75px` or `2px`.
- Size scale: `14px` (inline/status), `16px` (buttons/nav), `18px` (kicker/cards), `22px` (hero headers).
- Structural icons always carry `aria-hidden="true"`. Interactive icon buttons carry explicit `aria-label`.

### Navigation
- Compact, sticky floating bar with backdrop blur (`backdrop-filter: blur(12px)`).
- Pill tabs with active highlight: subtle background + high-contrast text. No gaudy glowing tabs.
- Full responsive support with seamless mobile drawer.

---

## 5. Page-by-Page Hierarchy & UX Guidelines

1. **Dashboard (`/`)**:
   - Identity & sync status bar (Student name, Branch, Reg No, Sync time, quick Refresh/Logout).
   - High-impact Overall Standing Card: Prominent percentage, margin to safe zone, projected attendance, attended/total classes.
   - Quick Status Banner (Medical leave suggestion if <75%, Exam schedule notice if active).
   - Subject Grid: Clean scannable cards displaying current percentage, status badge, progress bar, safe bunks or classes needed to recover, and instant 1-click actions ("Plan bunks", "Log").
   - Attendance Target Sniper & Upcoming Schedule preview.
2. **Today's Status (`/today`)**:
   - Day switcher (Today vs Yesterday).
   - Clean period-by-period class cards showing timetable slot, course, room, and live marked attendance status.
3. **Attendance Planner / Strategy (`/strategy`)**:
   - Tabbed / integrated toolkit: Whole Day Bunk Simulator, Medical Leave Optimizer, Redemption Arc.
   - Clear recovery projection: exact dates and class counts needed to restore >=75%.
4. **Multiverse (`/multiverse`)**:
   - "What if" sandbox simulation with clear visual cue that it is non-destructive.
5. **Class Schedule (`/calendar`)**:
   - Clean weekly column timetable with day headers and class cards.
6. **Attendance History (`/history`)**:
   - Monthly calendar heatmap & log with filtered day breakdown.
7. **Exam Mode (`/exam`)**:
   - Datesheet view, Hall ticket downloader, and curated academic notes.
8. **Feedback & Snitch (`/feedback`)**:
   - Minimalist report form with clear input states.
