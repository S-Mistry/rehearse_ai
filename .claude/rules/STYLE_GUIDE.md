# Rehearse AI — Style Guide (Compact)

## Overview

- **Tone:** Light, warm, professional (Linear/Stripe feel)
- **Fonts:** Inter (sans) + Playfair Display (serif)
- **Base BG:** `#fcfcf7` · **Base Text:** `#383838` · **Accent:** `#ff6d4d`
- **Body:** `antialiased`, `scroll-behavior: smooth`

## Colors

| Token      | Hex       | Usage                                    |
| ---------- | --------- | ---------------------------------------- |
| `body`     | `#fcfcf7` | Page background, icon backgrounds        |
| `coral`    | `#ff6d4d` | Primary accent — buttons, links, active  |
| `coral-600`| `#e5563a` | Hover state for coral buttons            |
| `green`    | `#befd71` | Secondary accent — "Ready" state         |
| `grey-1`   | `#383838` | Primary text, headings, dark buttons     |
| `grey-2`   | `#454647` | Hover for grey-1 buttons                 |
| `grey-3`   | `#6b6b6b` | Secondary text, descriptions, nav links  |
| `grey-4`   | `#9a9a9a` | Tertiary text, placeholders, timestamps  |
| `grey-5`   | `#e5e5e0` | Borders, dividers, subtle backgrounds    |

Less-used tints: `coral-50 #fff3f0`, `coral-100 #ffe0d9`, `coral-700 #cc4028`, `green-50 #f4fee6`.

### Key opacity patterns

- `bg-coral/5` hover cards · `bg-coral/10` mic hover · `bg-coral/15` AI avatar · `bg-coral/20` nav avatar
- `hover:border-coral/30` interactive borders · `shadow-coral/25` CTA glow
- `bg-grey-5/50` toggle/icon hover · `bg-white/80` dashboard nav · `bg-white/90` landing nav

## Typography

| Class          | Usage                                      |
| -------------- | ------------------------------------------ |
| `font-serif`   | Headings, logos, blockquotes (Playfair)     |
| `font-sans`    | Body text, buttons, UI labels (Inter)       |
| `font-medium`  | Headings, buttons, card titles (500)        |
| `font-semibold` | Logo, stat values, step numbers (600)      |

**Rules:** Use one weight thinner than expected. Titles above 20px use `tracking-tight`.

### Size scale used

`text-xs` (labels/timestamps) · `text-sm` (body/buttons) · `text-lg` (subheadings) · `text-xl` (logos/section h3) · `text-2xl`–`text-7xl` (headings, responsive with `md:` prefix)

**Text styling:** `leading-tight` headings, `leading-relaxed` body, `italic` serif accents, `whitespace-pre-line` chat text.

## Border Radius (Custom)

| Token  | Value | Class         | Usage                                    |
| ------ | ----- | ------------- | ---------------------------------------- |
| `xs`   | 5px   | `rounded-xs`  | Chart bars                               |
| `sm`   | 8px   | `rounded-sm`  | —                                        |
| `md`   | 12px  | `rounded-md`  | —                                        |
| `lg`   | 16px  | `rounded-lg`  | Icon buttons, action items, stat icons   |
| `xl`   | 32px  | `rounded-xl`  | Cards, containers                        |
| —      | —     | `rounded-full`| Pill buttons, avatars, chat input        |
| —      | —     | `rounded-2xl` | Message bubbles                          |

## Shadows

Sparingly used. Most elevation via `border border-grey-5`.

- `shadow-sm` — navbar pill, active toggle
- `shadow-lg shadow-coral/25` — CTA buttons, play button
- `backdrop-blur-md` — navbars · `backdrop-blur-sm` — overlays

## Component Patterns

### Buttons

```
Primary (Coral):  px-8 py-3.5 rounded-full bg-coral text-white font-medium hover:bg-coral-600 transition-colors shadow-lg shadow-coral/25
Small Coral:      px-5 py-2 rounded-full bg-coral text-white text-sm font-medium hover:bg-coral-600 transition-colors
Secondary (Dark): px-8 py-3.5 rounded-full bg-grey-1 text-white font-medium hover:bg-grey-2 transition-colors
Accent (Green):   px-4 py-1.5 rounded-full bg-green text-grey-1 text-sm font-medium hover:bg-green/80 transition-colors
Icon:             p-2 rounded-lg text-grey-3 hover:text-grey-1 hover:bg-grey-5/50 transition-colors
Mic:              p-1.5 rounded-lg text-grey-4 hover:text-coral hover:bg-coral/10 transition-colors
Send:             p-1.5 rounded-lg bg-coral text-white disabled:opacity-30 hover:bg-coral-600 transition-colors
```

### Cards

```
Base card:        bg-white rounded-xl border border-grey-5 p-5 (or p-6)
Action item:      flex items-start gap-3 p-4 rounded-lg border border-grey-5 hover:border-coral/30 hover:bg-coral/5 transition-all text-left group
Stats card:       bg-white rounded-xl border border-grey-5 p-5 flex items-center gap-4
  Icon box:       w-11 h-11 rounded-lg bg-body flex items-center justify-center text-grey-3
  Value:          text-2xl font-semibold text-grey-1
Gradient card:    bg-gradient-to-br from-coral to-coral-600 rounded-xl p-6 text-white
```

### Navbar

```
Landing pill:     rounded-full bg-white/90 backdrop-blur-md px-6 py-3 shadow-sm border border-grey-5/50
Dashboard:        border-b border-grey-5 bg-white/80 backdrop-blur-md
Active tab:       border-b-2 border-coral text-grey-1
Inactive tab:     border-b-2 border-transparent text-grey-3 hover:text-grey-1 hover:border-grey-5
Toggle active:    rounded-full bg-white text-grey-1 shadow-sm
Toggle inactive:  rounded-full text-grey-3 hover:text-grey-1
Avatar:           w-9 h-9 rounded-full bg-coral/20 text-coral font-medium text-sm
```

### Chat

```
Input:            rounded-full bg-white px-4 py-3 border border-grey-5 focus-within:border-coral/30
AI bubble:        rounded-2xl px-4 py-3 bg-white border border-grey-5 text-grey-1
User bubble:      rounded-2xl px-4 py-3 bg-coral text-white (flex-row-reverse, ml-auto, max-w-[85%])
AI avatar:        w-8 h-8 rounded-full bg-coral/15
Timestamp:        text-xs text-grey-4 mt-1.5
```

### Interview (Variant) Page

```
Layout:           h-screen flex flex-col, content: grid grid-cols-[280px_1fr_320px]
Left/Right cols:  bg-white, border-r/l border-grey-5
Panel header:     px-8 py-4 border-b border-grey-5, label: text-xs uppercase tracking-wider font-medium
Question display: font-serif text-4xl md:text-5xl leading-tight tracking-tight font-medium
Status dot:       Listening = text-coral animate-pulse, Paused = text-grey-4
Record button:    w-16 h-16 rounded-full; recording: bg-coral shadow-lg shadow-coral/25; paused: border border-grey-5
Audio visualizer: 24 bars, w-[3px], bg-coral active / bg-grey-5 inactive, heights 4–44px
Toolbar:          rounded-full bg-grey-5/50 px-3 py-2; buttons: w-12 h-12 rounded-full bg-white border border-grey-5 shadow-sm
```

## Layout

```
AppShell:         mx-auto max-w-[1600px] lg:grid-cols-[250px_1fr] (sidebar activates at lg:1024px)
SessionShell:     h-screen flex flex-col, slim header + flex-1 overflow-y-auto (no sidebar, full viewport)
Container widths: max-w-xl (chat) · max-w-4xl (hero) · max-w-6xl (navbar/footer) · max-w-[1600px] (shells)
Breakpoints:      sm:640px · md:768px · lg:1024px · xl:1280px

Breakpoint rules for (app) pages (inside AppShell with sidebar):
  - Sidebar activates at lg: (1024px) — below that, sidebar stacks above content
  - 2-column content grids use xl: (1280px) — accounts for sidebar eating 250px+
  - Single-column or simple grids (md:grid-cols-2 stat boxes) can use md:

Breakpoint rules for (session) pages (full-viewport SessionShell):
  - 3-column workspace grid uses xl: (1280px) — center column needs ~560px+
  - 2-column summary grids can use lg: (1024px) — no sidebar to reduce space
```

## Icons

- Default: 20×20, `stroke-width="1.5"`, `stroke="currentColor"` / `fill="none"`
- Use Lucide icons. Larger: 24×24 (stars, menu). Small: 16×16 (chevrons).

## Key Hover/State Patterns

| Element           | Default              | Hover/Active                              |
| ----------------- | -------------------- | ----------------------------------------- |
| Nav link          | `text-grey-3`        | `hover:text-grey-1`                       |
| Coral button      | `bg-coral`           | `hover:bg-coral-600`                      |
| Dark button       | `bg-grey-1`          | `hover:bg-grey-2`                         |
| Card/option       | `border-grey-5`      | `hover:border-coral/30 hover:bg-coral/5`  |
| Card text (group) | `text-grey-1`        | `group-hover:text-coral`                  |
| Step card         | —                    | `hover:-translate-y-1`                    |
| Disabled send     | —                    | `disabled:opacity-30`                     |

## Common Patterns

```
Card:             bg-white rounded-xl border border-grey-5 {p-5|p-6}
Pill button:      px-{4|5|8} py-{1.5|2|3.5} rounded-full {bg} text-{color} text-sm font-medium hover:bg-{hover} transition-colors
Section heading:  font-serif text-{3xl|4xl} md:text-{4xl|5xl} font-medium text-grey-1 text-center
Body text:        text-grey-3 text-{sm|lg} leading-relaxed
Divider:          border-t border-grey-5
Full-height:      h-screen flex flex-col → flex-1 overflow-hidden → overflow-y-auto
Centering:        mx-auto (block) · flex items-center justify-center (flex)
```
