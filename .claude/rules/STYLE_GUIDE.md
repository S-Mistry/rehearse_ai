# Rehearse AI — Style Guide

A comprehensive design reference for the **landing page**, **dashboard**, and **variant (interview)** pages. Every value is extracted directly from the source code and Tailwind configuration.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Color Palette](#2-color-palette)
3. [Typography](#3-typography)
4. [Spacing System](#4-spacing-system)
5. [Border Radius](#5-border-radius)
6. [Shadows & Elevation](#6-shadows--elevation)
7. [Opacity & Transparency](#7-opacity--transparency)
8. [Component Styles](#8-component-styles)
9. [Animations & Transitions](#9-animations--transitions)
10. [Layout & Responsive Design](#10-layout--responsive-design)
11. [Icons & SVG Patterns](#11-icons--svg-patterns)
12. [Interactive States](#12-interactive-states)
13. [Common Tailwind Patterns](#13-common-tailwind-patterns)
14. [Example Component Reference](#14-example-component-reference)

---

## 1. Overview

| Detail        | Value                                        |
| ------------- | -------------------------------------------- |
| Framework     | Next.js (App Router)                         |
| Styling       | Tailwind CSS                                 |
| Design Tone   | Light, warm, professional — Linear/Stripe feel |
| Font Stack    | Inter (sans) + Playfair Display (serif)      |
| Base BG       | `#fcfcf7` (off-white / warm ivory)           |
| Base Text     | `#383838` (grey-1)                           |
| Accent        | `#ff6d4d` (coral)                            |
| Root `<body>` | `antialiased` (Tailwind font smoothing)      |
| Scroll        | `scroll-behavior: smooth` on `<html>`        |

---

## 2. Color Palette

### 2.1 Custom Colors (from `tailwind.config.ts`)

| Token         | Hex       | Usage                                              |
| ------------- | --------- | -------------------------------------------------- |
| `body`        | `#fcfcf7` | Page background, card icon backgrounds             |
| `coral`       | `#ff6d4d` | Primary accent — buttons, links, active states     |
| `coral-50`    | `#fff3f0` | Lightest coral tint (available, not heavily used)   |
| `coral-100`   | `#ffe0d9` | Light coral tint (available, not heavily used)      |
| `coral-500`   | `#ff6d4d` | Same as DEFAULT                                    |
| `coral-600`   | `#e5563a` | Hover state for coral buttons                      |
| `coral-700`   | `#cc4028`  | Darker coral (available for emphasis)              |
| `green`       | `#befd71` | Secondary accent — referral button, "Ready" state  |
| `green-50`    | `#f4fee6` | Lightest green tint                                |
| `green-500`   | `#befd71` | Same as DEFAULT                                    |
| `grey-1`      | `#383838` | Primary text, headings, dark buttons               |
| `grey-2`      | `#454647` | Hover state for grey-1 buttons                     |
| `grey-3`      | `#6b6b6b` | Secondary text, descriptions, nav links            |
| `grey-4`      | `#9a9a9a` | Tertiary text, placeholders, timestamps, icons     |
| `grey-5`      | `#e5e5e0` | Borders, dividers, subtle backgrounds              |

### 2.2 CSS Variables (from `globals.css`)

```css
:root {
  --body-bg: #fcfcf7;
  --coral: #ff6d4d;
  --green: #befd71;
}
```

### 2.3 Hardcoded Colors in JSX

| Context                   | Value     | Location              |
| ------------------------- | --------- | --------------------- |
| Star icons fill           | `#ff6d4d` | Testimonial.tsx       |
| AI avatar SVG fill        | `#ff6d4d` | MessageBubble.tsx     |
| White                     | `white`   | Buttons, text on coral |

### 2.4 Opacity Variants Used

| Class               | Meaning                    | Where Used                                     |
| -------------------- | -------------------------- | ---------------------------------------------- |
| `bg-coral/5`         | 5% coral background        | Action card hover (`hover:bg-coral/5`)         |
| `bg-coral/10`        | 10% coral background       | Step card accent, mic button hover             |
| `bg-coral/15`        | 15% coral background       | AI avatar, readiness "Getting There"           |
| `bg-coral/20`        | 20% coral background       | Dashboard nav avatar                           |
| `shadow-coral/25`    | 25% coral shadow           | CTA buttons, play button                       |
| `hover:border-coral/30` | 30% coral border        | Action cards, option buttons, chat input focus |
| `bg-green/20`        | 20% green background       | Step card accent                               |
| `hover:bg-green/80`  | 80% green on hover         | Referrals button                               |
| `bg-grey-1/5`        | 5% dark background         | Step card accent                               |
| `bg-grey-4/40`       | 40% grey waveform bars     | Inactive waveform                              |
| `text-grey-4/60`     | 60% grey text              | Logo cloud items                               |
| `bg-grey-5/50`       | 50% grey-5 background      | Toggle container, icon button hover            |
| `border-grey-5/50`   | 50% grey-5 border          | Navbar pill border                             |
| `bg-white/20`        | 20% white background       | Video play button, coach card icon             |
| `bg-white/30`        | 30% white on hover         | Video play button hover                        |
| `bg-white/75`        | 75% white text opacity     | Coach card subtitle (`text-white/75`)          |
| `bg-white/80`        | 80% white background       | Dashboard nav                                  |
| `bg-white/90`        | 90% white background       | Landing navbar                                 |
| `hover:bg-white/90`  | 90% white on hover         | Coach card "Start Call" button                 |
| `bg-body/30`         | 30% body background        | Choice card footer                             |
| `bg-body/50`         | 50% body background        | Choice card header                             |
| `from-grey-1/80`     | 80% grey-1 gradient start  | Video overlay gradient                         |

---

## 3. Typography

### 3.1 Font Families

```css
/* Imported via Google Fonts in globals.css */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
```

| Token         | Stack                                    | Usage                         |
| ------------- | ---------------------------------------- | ----------------------------- |
| `font-serif`  | Playfair Display, Georgia, serif         | Headings, logos, blockquotes  |
| `font-sans`   | Inter, system-ui, sans-serif             | Body text, buttons, UI labels |
| `font-mono`   | (system default)                         | Step numbers only             |

**Note:** DM Sans is imported via Google Fonts but not actively used. The variant page now uses the same Inter + Playfair Display stack as the rest of the app.

### 3.2 Font Weights

| Tailwind Class     | Weight | Usage                                                |
| ------------------ | ------ | ---------------------------------------------------- |
| `font-medium`      | 500    | Headings (serif), buttons, card titles, names        |
| `font-semibold`    | 600    | Logo text, stat values, step numbers                 |
| (default / 400)    | 400    | Body text, descriptions, paragraphs                  |

**Design rule (from ui-design.md):** Use one level thinner than expected — e.g., use `font-semibold` where bold would normally go.

### 3.3 Font Sizes

| Tailwind Class  | Rendered Size | Context                                              |
| --------------- | ------------- | ---------------------------------------------------- |
| `text-xs`       | 0.75rem       | Descriptions, timestamps, readiness labels, footers  |
| `text-sm`       | 0.875rem      | Nav links, buttons, body text in cards, chat text    |
| `text-lg`       | 1.125rem      | Subheadings, hero paragraph                          |
| `text-xl`       | 1.25rem       | Logo, logo cloud items, video caption, section h3    |
| `text-2xl`      | 1.5rem        | Testimonial quote (mobile), stat values, welcome     |
| `text-3xl`      | 1.875rem      | Section headings (mobile), testimonial (md+)         |
| `text-4xl`      | 2.25rem       | Section headings (md+)                               |
| `text-5xl`      | 3rem          | Hero heading (mobile), value prop heading (md+)      |
| `text-7xl`      | 4.5rem        | Hero heading (md+)                                   |

### 3.4 Text Styling

| Property              | Classes Used                    | Where                           |
| --------------------- | ------------------------------- | ------------------------------- |
| Leading (line-height) | `leading-tight`                 | Headings (h1, h2)              |
|                       | `leading-relaxed`               | Body paragraphs, descriptions  |
| Tracking              | `tracking-tight`                | Hero heading                   |
|                       | `tracking-wider`                | Logo cloud "Featured in" label |
| Italic                | `italic`                        | Serif accent words, blockquote |
| Uppercase             | `uppercase`                     | Logo cloud label               |
| Whitespace            | `whitespace-pre-line`           | Chat message text              |
| Text wrap             | `text-balance`                  | Value prop heading             |

**Design rule:** Titles above 20px use `tracking-tight`.

---

## 4. Spacing System

### 4.1 Padding

| Value      | Tailwind  | Context                                            |
| ---------- | --------- | -------------------------------------------------- |
| 1px        | `p-1`     | Toggle container                                   |
| 4px        | `p-1`     | —                                                  |
| 6px        | `p-1.5`   | Icon buttons in chat input                         |
| 8px        | `p-2`     | Mobile menu button, settings/help buttons          |
| 12px       | `p-3`     | Choice card option list, readiness buttons         |
| 14px       | `p-3.5`   | Option buttons                                     |
| 16px       | `p-4`     | Action card items, page horizontal padding         |
| 20px       | `p-5`     | Stats card, readiness card                         |
| 24px       | `p-6`     | Section padding, card bodies, chat panel, side panel |
| 32px       | `p-8`     | Step cards                                         |

### 4.2 Padding Axis-Specific

| Classes              | Context                                          |
| -------------------- | ------------------------------------------------ |
| `px-4`               | Page content horizontal padding                  |
| `px-5`               | Navbar CTA buttons                               |
| `px-6`               | Navbar pill, dashboard nav container, chat areas  |
| `px-8`               | Large CTA buttons                                |
| `py-1.5`             | Toggle buttons, referrals button                 |
| `py-2`               | Navbar CTA buttons, readiness buttons            |
| `py-2.5`             | Coach "Start Call" button                        |
| `py-3`               | Navbar pill, tab buttons, chat input, card headers |
| `py-3.5`             | Large CTA buttons                                |
| `py-4`               | Chat input area                                  |
| `py-6`               | Chat messages area                               |
| `py-16`              | Sections (testimonial, logo cloud, footer)       |
| `py-20`              | Sections (value prop, steps, how-it-works)       |
| `pt-24`              | Hero top padding                                 |
| `pb-16`              | Hero bottom padding                              |
| `pt-8`               | Footer bottom bar                                |

### 4.3 Margin

| Classes              | Context                                          |
| -------------------- | ------------------------------------------------ |
| `mt-1`               | SidePanel subtitle                               |
| `mt-1.5`             | Message timestamp                                |
| `mt-0.5`             | Action card description, option description      |
| `mt-3`               | Footer brand description, choice card below msg  |
| `mt-4`               | Step card title                                  |
| `mt-6`               | Hero paragraph, testimonial attribution, value prop paragraph |
| `mt-10`              | CTA button group                                 |
| `mt-12`              | Waveform area, footer bottom divider, how-it-works paragraph |
| `mb-3`               | Step card title, readiness label, coach card content |
| `mb-4`               | Action cards heading, footer link category headings, how-it-works heading |
| `mb-6`               | Testimonial stars                                |
| `mb-8`               | Logo cloud label                                 |
| `mb-16`              | Steps section heading                            |
| `ml-11`              | Action cards offset (aligns with chat bubbles)   |
| `ml-auto`            | User message bubble alignment                    |
| `-mb-px`             | Tab bar (overlaps border)                        |
| `mx-auto`            | All centered containers                          |

### 4.4 Gap

| Value      | Tailwind    | Context                                          |
| ---------- | ----------- | ------------------------------------------------ |
| 1px        | `gap-1`     | Star rating, tab bar                             |
| 3px        | `gap-[3px]` | Waveform bars                                    |
| 8px        | `gap-2`     | Chat input icons, readiness buttons, choice list |
| 12px       | `gap-3`     | Navbar right CTAs, action cards grid, stats grid, AI avatar + message, coach card icon + text |
| 16px       | `gap-4`     | Waveform + play btn, CTA buttons, dashboard nav right section |
| 20px       | `gap-5`     | Side panel sections                              |
| 24px       | `gap-6`     | Step cards grid, message list spacing, social icons |
| 32px       | `gap-8`     | Nav center links, footer columns                 |
| 48px       | `gap-x-12`  | Logo cloud items horizontal                      |

### 4.5 Space-Y

| Classes        | Context                         |
| -------------- | ------------------------------- |
| `space-y-2`    | Choice card options             |
| `space-y-2.5`  | Footer link lists               |
| `space-y-6`    | Chat messages list              |

---

## 5. Border Radius

### 5.1 Custom Values (from `tailwind.config.ts`)

| Token        | Value  | Tailwind Class  |
| ------------ | ------ | --------------- |
| `xs`         | 5px    | `rounded-xs`    |
| `sm`         | 8px    | `rounded-sm`    |
| `md`         | 12px   | `rounded-md`    |
| `lg`         | 16px   | `rounded-lg`    |
| `xl`         | 32px   | `rounded-xl`    |

### 5.2 Usage by Component

| Radius Class     | Components                                                  |
| ---------------- | ----------------------------------------------------------- |
| `rounded-full`   | Navbar pill, buttons (CTA, toggle, referral), play button, avatars, chat input, waveform bars |
| `rounded-xl`     | Step cards, video placeholder, coach card, action cards container, stats cards, readiness card, choice cards |
| `rounded-2xl`    | Message bubbles                                             |
| `rounded-lg`     | Settings/help buttons, icon buttons, action card items, option buttons, readiness buttons, coach "Start Call", send button, stat icon container |

---

## 6. Shadows & Elevation

| Shadow Class            | Value / Context                                      |
| ----------------------- | ---------------------------------------------------- |
| `shadow-sm`             | Navbar pill, active toggle button                    |
| `shadow-lg`             | Play button, CTA buttons (paired with color shadow)  |
| `shadow-coral/25`       | Coral shadow glow on play button and primary CTAs    |

Shadow is used sparingly — most elevation comes from borders (`border border-grey-5`) rather than shadows.

---

## 7. Opacity & Transparency

### 7.1 Backdrop Blur

| Class              | Context                        |
| ------------------ | ------------------------------ |
| `backdrop-blur-md` | Landing navbar, dashboard nav  |
| `backdrop-blur-sm` | Video play button overlay      |

### 7.2 Disabled State Opacity

| Class                | Context              |
| -------------------- | -------------------- |
| `disabled:opacity-30` | Send button disabled |
| `opacity-75`         | Video "Demo Video" label |

### 7.3 Background Opacity Patterns

See [Section 2.4 — Opacity Variants Used](#24-opacity-variants-used) for the full reference.

---

## 8. Component Styles

### 8.1 Navbar (Landing)

```
Container:  sticky top-4 z-50 mx-auto max-w-6xl px-4
Pill:       flex items-center justify-between rounded-full bg-white/90 backdrop-blur-md px-6 py-3 shadow-sm border border-grey-5/50
Logo:       font-serif text-xl font-semibold text-grey-1
Nav link:   text-sm text-grey-3 hover:text-grey-1 transition-colors
```

### 8.2 Navbar Toggle (Landing)

```
Container:  flex items-center bg-grey-5/50 rounded-full p-1
Active:     px-4 py-1.5 rounded-full text-sm font-medium bg-white text-grey-1 shadow-sm
Inactive:   px-4 py-1.5 rounded-full text-sm font-medium text-grey-3 hover:text-grey-1
```

### 8.3 Dashboard Nav

```
Container:  border-b border-grey-5 bg-white/80 backdrop-blur-md
Inner:      max-w-[1400px] mx-auto px-6
Top row:    flex items-center justify-between h-16
Tab bar:    flex items-center gap-1 -mb-px
Active tab: px-4 py-3 text-sm font-medium border-b-2 border-coral text-grey-1
Inactive:   px-4 py-3 text-sm font-medium border-b-2 border-transparent text-grey-3 hover:text-grey-1 hover:border-grey-5
```

### 8.4 Buttons — Primary (Coral)

```
Navbar CTA:     px-5 py-2 rounded-full bg-coral text-white text-sm font-medium hover:bg-coral-600 transition-colors
Large CTA:      px-8 py-3.5 rounded-full bg-coral text-white font-medium hover:bg-coral-600 transition-colors shadow-lg shadow-coral/25
Send button:    p-1.5 rounded-lg bg-coral text-white disabled:opacity-30 hover:bg-coral-600 transition-colors disabled:hover:bg-coral
```

### 8.5 Buttons — Secondary (Dark)

```
px-8 py-3.5 rounded-full bg-grey-1 text-white font-medium hover:bg-grey-2 transition-colors
(or)
px-5 py-2 rounded-full bg-grey-1 text-white text-sm font-medium hover:bg-grey-2 transition-colors
```

### 8.6 Buttons — Accent (Green)

```
px-4 py-1.5 rounded-full bg-green text-grey-1 text-sm font-medium hover:bg-green/80 transition-colors
```

### 8.7 Buttons — Icon (Toolbar)

```
p-2 rounded-lg text-grey-3 hover:text-grey-1 hover:bg-grey-5/50 transition-colors
(or for chat input icons)
p-1.5 rounded-lg text-grey-4 hover:text-grey-1 hover:bg-grey-5/50 transition-colors
```

### 8.8 Buttons — Mic (Special Hover)

```
p-1.5 rounded-lg text-grey-4 hover:text-coral hover:bg-coral/10 transition-colors
```

### 8.9 Play Button (Hero)

```
w-14 h-14 rounded-full bg-coral flex items-center justify-center hover:bg-coral-600 transition-colors shadow-lg shadow-coral/25
```

### 8.10 Cards — Generic Pattern

```
bg-white rounded-xl border border-grey-5 p-5
(or p-6 for larger cards)
```

### 8.11 Action Cards

```
Container:    bg-white rounded-xl border border-grey-5 p-6
Item:         flex items-start gap-3 p-4 rounded-lg border border-grey-5 hover:border-coral/30 hover:bg-coral/5 transition-all text-left group
Item title:   font-medium text-grey-1 text-sm group-hover:text-coral transition-colors
Item desc:    text-xs text-grey-3 mt-0.5
```

### 8.12 Stats Card

```
Container:    bg-white rounded-xl border border-grey-5 p-5 flex items-center gap-4
Icon box:     w-11 h-11 rounded-lg bg-body flex items-center justify-center text-grey-3
Value:        text-2xl font-semibold text-grey-1
Label:        text-sm text-grey-3
```

### 8.13 Coach Card (Gradient)

```
Container:    bg-gradient-to-br from-coral to-coral-600 rounded-xl p-6 text-white
Icon circle:  w-10 h-10 rounded-full bg-white/20 flex items-center justify-center
Title:        font-medium (inherits text-white)
Subtitle:     text-sm text-white/75
CTA button:   w-full py-2.5 rounded-lg bg-white text-coral font-medium text-sm hover:bg-white/90 transition-colors
```

### 8.14 Step Cards

```
Container:    ${step.color} rounded-xl p-8 transition-transform hover:-translate-y-1
Step number:  ${step.accent} font-mono text-sm font-semibold
Title:        font-serif text-xl font-medium text-grey-1 mt-4 mb-3
Description:  text-grey-3 leading-relaxed

Color variants:
  Step 1:  bg-coral/10  + text-coral
  Step 2:  bg-green/20  + text-green-700
  Step 3:  bg-grey-1/5  + text-grey-1
```

### 8.15 Readiness Buttons

```
Container:     flex gap-2
Base:          flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all
Inactive:      bg-body text-grey-3 hover:bg-grey-5/50
Active "Ready":         bg-green text-grey-1
Active "Getting There": bg-coral/15 text-coral
Active "Just Starting": bg-grey-5 text-grey-1
```

### 8.16 Chat Input

```
Container:    flex items-center gap-2 bg-white rounded-full px-4 py-3 border border-grey-5 focus-within:border-coral/30 transition-colors
Input:        flex-1 bg-transparent text-sm text-grey-1 placeholder:text-grey-4 outline-none
```

### 8.17 Message Bubbles

```
AI message:
  Avatar:     w-8 h-8 rounded-full bg-coral/15 flex items-center justify-center mt-1
  Bubble:     rounded-2xl px-4 py-3 bg-white border border-grey-5 text-grey-1
  Text:       text-sm leading-relaxed whitespace-pre-line
  Timestamp:  text-xs text-grey-4 mt-1.5

User message:
  Bubble:     rounded-2xl px-4 py-3 bg-coral text-white
  Text:       text-sm leading-relaxed whitespace-pre-line
  Timestamp:  text-xs text-grey-4 mt-1.5 text-right
  Layout:     flex-row-reverse, ml-auto, max-w-[85%]
```

### 8.18 Choice Card

```
Container:    bg-white rounded-xl border border-grey-5 overflow-hidden
Header:       px-4 py-3 border-b border-grey-5 bg-body/50 → text-sm font-medium text-grey-1
Body:         p-3 space-y-2
Footer:       px-4 py-3 border-t border-grey-5 bg-body/30 → text-xs text-grey-4 text-center italic
```

### 8.19 Option Button

```
w-full flex items-center justify-between p-3.5 rounded-lg border border-grey-5 hover:border-coral/30 hover:bg-coral/5 transition-all group text-left
Label:        text-sm font-medium text-grey-1 group-hover:text-coral transition-colors
Description:  text-xs text-grey-3 mt-0.5
Arrow icon:   text-grey-4 group-hover:text-coral transition-colors
```

### 8.20 Avatar (Dashboard Nav)

```
w-9 h-9 rounded-full bg-coral/20 flex items-center justify-center text-coral font-medium text-sm
```

### 8.21 Testimonial

```
Container:    max-w-3xl mx-auto px-4 py-16 text-center
Stars:        flex items-center justify-center gap-1 mb-6 → 24×24 SVGs filled #ff6d4d
Quote:        font-serif text-2xl md:text-3xl text-grey-1 italic leading-relaxed
Name:         font-medium text-grey-1
Role:         text-sm text-grey-3
```

### 8.22 Logo Cloud

```
Container:    max-w-6xl mx-auto px-4 py-16 border-t border-grey-5
Label:        text-center text-sm text-grey-4 mb-8 uppercase tracking-wider
Logos:        flex flex-wrap items-center justify-center gap-x-12 gap-y-6
Logo item:    text-grey-4/60 font-serif text-xl font-medium hover:text-grey-3 transition-colors
```

### 8.23 Video Placeholder (How It Works)

```
Container:    relative aspect-video rounded-xl bg-grey-1 overflow-hidden group cursor-pointer
Play button:  w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors
Gradient:     absolute inset-0 bg-gradient-to-t from-grey-1/80 via-transparent to-transparent
Caption:      absolute bottom-6 left-6 text-left text-white
  Subtitle:   text-sm opacity-75
  Title:      font-serif text-xl
```

### 8.24 Footer

```
Container:    max-w-6xl mx-auto px-4 py-16 border-t border-grey-5
Grid:         grid grid-cols-2 md:grid-cols-4 gap-8
Brand column: col-span-2 md:col-span-1
Category:     font-medium text-grey-1 text-sm mb-4
Links:        text-sm text-grey-3 hover:text-grey-1 transition-colors
Bottom bar:   mt-12 pt-8 border-t border-grey-5 flex flex-col sm:flex-row items-center justify-between gap-4
Copyright:    text-sm text-grey-4
Social icons: text-grey-4 hover:text-grey-1 transition-colors → 20×20 SVGs
```

### 8.25 Variant Layout (Interview Page)

```
Root:           h-screen flex flex-col overflow-hidden bg-body text-grey-1 font-sans
Header:         h-[60px] flex-shrink-0 (same glass nav as dashboard: bg-white/80 backdrop-blur-md border-b border-grey-5)
Content:        flex-1 grid grid-cols-[280px_1fr_320px] h-[calc(100vh-60px)]
Left column:    variant-col (border-right: 1px solid grey-5) bg-white overflow-hidden
Center column:  variant-col, flex flex-col items-center justify-center
Right column:   bg-white overflow-hidden
```

Responsive: at `max-width: 1024px`, columns collapse to `240px 1fr 240px`.

### 8.26 Session Plan (Left Sidebar)

```
Panel header:   px-8 py-4 border-b border-grey-5 flex justify-between items-center
Header label:   text-xs uppercase tracking-wider text-grey-1 font-medium
Counter:        text-xs uppercase tracking-wider text-grey-4 font-medium

Question item:  px-8 py-4 border-b border-grey-5 cursor-pointer transition-all relative
Active item:    bg-coral/5
Inactive hover: hover:bg-grey-5/50
Active bar:     absolute left-0 top-0 bottom-0 w-[3px] bg-coral
Category label: text-xs text-grey-4 mb-1 block
Question text:  font-serif text-sm leading-relaxed text-grey-1
```

### 8.27 Interview Stage (Center)

```
Container:      relative flex flex-col items-center justify-center px-16 py-16

Status label:   absolute top-8 text-center
Status text:    text-xs uppercase tracking-wider text-grey-1 font-medium inline-flex items-center gap-1.5
Status dot:     Listening = text-coral animate-pulse, Paused = text-grey-4

Question:       font-serif text-4xl md:text-5xl leading-tight tracking-tight mb-8 text-grey-1 font-medium
Context label:  text-xs uppercase tracking-wider text-grey-4 font-medium
Question area:  text-center max-w-[600px] mb-16

Transcript:     mt-16 w-full max-w-[500px] text-center text-grey-3 font-serif text-sm leading-relaxed
```

**Voice mode states:**
- **Speaking** — AI voice model is actively speaking. Visualizer animates to reflect AI output.
- **Listening** — AI has stopped speaking and is capturing the user's voice reply. Pulsing coral dot signals active listening.

### 8.28 Recording Button

```
Container:      w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer
Recording:      bg-coral border border-coral shadow-lg shadow-coral/25 → white stop icon (rect 6×6 rx-1)
Paused:         bg-transparent border border-grey-5 hover:border-coral/30 hover:scale-105 → grey-3 mic icon
Icon size:      w-6 h-6
```

### 8.29 Interview Text Controls

```
text-sm font-medium text-grey-3 hover:text-grey-1 transition-colors cursor-pointer bg-transparent border-none
Layout:         flex gap-8 items-center (controls flanking recording button)
```

### 8.30 Interview Control Toolbar (Circular Icon Buttons)

```
Container:      flex items-center gap-4 bg-grey-5/50 rounded-full px-3 py-2
Button base:    w-12 h-12 rounded-full bg-white border border-grey-5 shadow-sm flex items-center justify-center transition-colors
Default icon:   text-grey-3 hover:text-grey-1 (stroke-width 1.5)
End call:       text-coral hover:bg-coral/5 hover:border-coral/30

Buttons:        Mic (toggle mute), Transcript (show/hide text), Alert (report issue), End Call (hang up, red icon)
```

### 8.31 Audio Visualizer

```
Container:      flex items-center justify-center gap-[6px] h-[60px] mb-16
Bar count:      24
Bar:            w-[3px] rounded transition-[height] duration-100 ease-out
Active:         bg-coral (heights animate 4–44px via requestAnimationFrame, 100ms intervals)
Inactive:       bg-grey-5 (all bars collapse to 4px)
```

### 8.32 Metrics Panel (Right Sidebar)

```
Panel header:   px-8 py-4 border-b border-grey-5 (same pattern as Session Plan)
Header label:   text-xs uppercase tracking-wider text-grey-1 font-medium

Metric section: p-8 border-b border-grey-5 (last section omits border-b)
Metric label:   text-xs uppercase tracking-wider text-grey-4 font-medium
Metric value:   font-serif text-3xl tracking-tight my-2 text-grey-1
Metric unit:    text-sm text-grey-3 font-sans (inline with value)

Mini bar chart: h-10 flex items-end gap-[2px] mt-4
Chart bar:      flex-1 rounded-xs
Highlight bar:  bg-coral
Inactive bar:   bg-grey-5

Feedback list:  space-y-4
Feedback item:  flex gap-2 text-sm leading-relaxed text-grey-3
Feedback icon:  text-coral text-base flex-shrink-0 (✓ or ~)
```

---

## 9. Animations & Transitions

### 9.1 Transition Classes

| Class                 | Properties Affected       | Context                                     |
| --------------------- | ------------------------- | ------------------------------------------- |
| `transition-colors`   | Color properties          | All buttons, links, icon hovers             |
| `transition-all`      | All properties            | Toggle buttons, action cards, option buttons, readiness, waveform bars |
| `transition-transform` | Transform only           | (available, not directly used alone)        |

### 9.2 Duration

| Class             | Value  | Context            |
| ----------------- | ------ | ------------------ |
| `duration-300`    | 300ms  | Waveform bar color |

Default Tailwind transition duration (150ms) is used for all other `transition-*` classes.

### 9.3 Hover Effects

| Effect                          | Class                              | Components                     |
| ------------------------------- | ---------------------------------- | ------------------------------ |
| Color change                    | `hover:text-grey-1`                | Nav links, footer links, icons |
| Background change               | `hover:bg-coral-600`               | Coral buttons                  |
| Background change               | `hover:bg-grey-2`                  | Dark buttons                   |
| Background + border             | `hover:border-coral/30 hover:bg-coral/5` | Action cards, option buttons |
| Translate up                    | `hover:-translate-y-1`            | Step cards                     |
| Tab underline                   | `hover:border-grey-5`             | Inactive dashboard tabs        |

### 9.4 Programmatic Animations

The waveform bars in `Hero.tsx` use inline `animationDelay` (`i * 50ms`) with CSS `transition-all duration-300` for staggered color transitions when play state toggles.

The `AudioVisualizer` in the variant page uses `requestAnimationFrame` with `setTimeout(animate, 100)` to randomize bar heights (4–44px). Each bar uses `transition-[height] duration-100 ease-out` for smooth interpolation. On pause, all bars reset to `4px`.

---

## 10. Layout & Responsive Design

### 10.1 Container Widths

| Class                    | Max Width | Context                              |
| ------------------------ | --------- | ------------------------------------ |
| `max-w-xl`               | 576px     | Chat message column                  |
| `max-w-2xl`              | 672px     | Value prop paragraph                 |
| `max-w-3xl`              | 768px     | Testimonial section                  |
| `max-w-4xl`              | 896px     | Hero, value prop, how-it-works       |
| `max-w-6xl`              | 1152px    | Navbar, steps, logo cloud, footer    |
| `max-w-[1400px]`         | 1400px    | Dashboard nav inner container        |

All containers use `mx-auto` for centering.

### 10.2 Breakpoints

| Prefix | Min Width | Usage                                                   |
| ------ | --------- | ------------------------------------------------------- |
| `sm:`  | 640px     | Show navbar CTAs, footer bottom row direction            |
| `md:`  | 768px     | Show center nav links, responsive heading sizes, footer grid |
| `lg:`  | 1024px    | Dashboard two-column layout, show side panel             |

### 10.3 Dashboard Layout

```
Root:           h-screen flex flex-col bg-body
Content area:   flex-1 grid grid-cols-1 lg:grid-cols-[55fr_45fr] overflow-hidden
Chat column:    min-w-0 border-r border-grey-5 overflow-hidden
Side column:    hidden lg:block bg-body overflow-hidden
```

Chat takes 55% width, side panel takes 45% on `lg:` screens.

### 10.3b Variant (Interview) Layout

```
Root:           h-screen flex flex-col overflow-hidden bg-body
Header:         h-[60px] flex-shrink-0
Content:        flex-1 grid grid-cols-[280px_1fr_320px]
Left (plan):    variant-col bg-white overflow-hidden
Center (stage): variant-col flex-col items-center justify-center
Right (metrics): bg-white overflow-hidden
```

Fixed 3-column layout. At `max-width: 1024px` columns narrow to `240px 1fr 240px`.

### 10.4 Grid Systems

| Grid Classes                     | Context                |
| -------------------------------- | ---------------------- |
| `grid grid-cols-2 gap-3`        | Action cards, stats    |
| `grid md:grid-cols-3 gap-6`     | Step cards             |
| `grid grid-cols-2 md:grid-cols-4 gap-8` | Footer links   |

### 10.5 Flexbox Patterns

| Pattern                                        | Context              |
| ---------------------------------------------- | -------------------- |
| `flex items-center justify-between`            | Navbars, option rows |
| `flex items-center justify-center`             | Icon containers      |
| `flex items-center gap-*`                      | Button groups, rows  |
| `flex flex-col sm:flex-row items-center justify-center gap-4` | CTA pairs |
| `flex flex-col gap-5`                          | Side panel sections  |
| `flex gap-3`                                   | Message rows         |

### 10.6 Responsive Typography

| Mobile          | Desktop (md:)     | Component                   |
| --------------- | ----------------- | --------------------------- |
| `text-5xl`      | `md:text-7xl`     | Hero heading                |
| `text-4xl`      | `md:text-5xl`     | Value prop heading, interview question |
| `text-3xl`      | `md:text-4xl`     | Steps heading, how-it-works |
| `text-2xl`      | `md:text-3xl`     | Testimonial blockquote      |

---

## 11. Icons & SVG Patterns

### 11.1 Conventions

| Property        | Value              | Notes                              |
| --------------- | ------------------ | ---------------------------------- |
| Default size    | 20×20              | Most UI icons                      |
| Small size      | 16×16              | Chevrons, AI avatar icon           |
| Large size      | 24×24              | Star ratings, hamburger menu       |
| Extra large     | 32×32              | Video play button                  |
| Stroke width    | 1.5                | Outlined icons (per ui-design.md)  |
| Stroke width    | 2                  | Hamburger menu, chevron arrows     |
| Fill approach   | `fill="currentColor"` or `fill="white"` or specific hex |
| Stroke approach | `stroke="currentColor"` with `fill="none"` |

### 11.2 ViewBox Conventions

| ViewBox        | Icon Size | Usage                            |
| -------------- | --------- | -------------------------------- |
| `0 0 16 16`   | 16px      | AI avatar, option chevron        |
| `0 0 20 20`   | 20px      | All toolbar/card icons           |
| `0 0 24 24`   | 24px      | Stars, hamburger, social icons   |
| `0 0 32 32`   | 32px      | Video play button                |

### 11.3 Icon Sizing in Containers

```
Small icon box:   w-8 h-8   (AI avatar)
Medium icon box:  w-9 h-9   (user avatar)
                  w-10 h-10 (coach card icon)
                  w-11 h-11 (stats card icon)
Large icon box:   w-14 h-14 (play button)
                  w-20 h-20 (video play button)
```

---

## 12. Interactive States

### 12.1 Hover States

| Element Type        | Default State              | Hover State                              |
| ------------------- | -------------------------- | ---------------------------------------- |
| Nav link            | `text-grey-3`              | `hover:text-grey-1`                      |
| Coral button        | `bg-coral`                 | `hover:bg-coral-600`                     |
| Dark button         | `bg-grey-1`                | `hover:bg-grey-2`                        |
| Green button        | `bg-green`                 | `hover:bg-green/80`                      |
| Icon button         | `text-grey-3`              | `hover:text-grey-1 hover:bg-grey-5/50`   |
| Chat icon button    | `text-grey-4`              | `hover:text-grey-1 hover:bg-grey-5/50`   |
| Mic button          | `text-grey-4`              | `hover:text-coral hover:bg-coral/10`      |
| Action card / Option| `border-grey-5`            | `hover:border-coral/30 hover:bg-coral/5` |
| Action card text    | `text-grey-1` (via group)  | `group-hover:text-coral`                 |
| Step card           | (static)                   | `hover:-translate-y-1`                   |
| Logo cloud item     | `text-grey-4/60`           | `hover:text-grey-3`                      |
| Footer social icon  | `text-grey-4`              | `hover:text-grey-1`                      |
| Video play button   | `bg-white/20`              | `group-hover:bg-white/30`                |
| Inactive tab        | `border-transparent`       | `hover:text-grey-1 hover:border-grey-5`  |

### 12.2 Focus States

| Class                              | Context              |
| ---------------------------------- | -------------------- |
| `focus-within:border-coral/30`     | Chat input container |
| `outline-none`                     | Text input           |

### 12.3 Disabled States

| Class                              | Context       |
| ---------------------------------- | ------------- |
| `disabled:opacity-30`              | Send button   |
| `disabled:hover:bg-coral`          | Send button (prevents hover change when disabled) |

### 12.4 Active / Selected States

| Element               | Active State                                       |
| --------------------- | -------------------------------------------------- |
| Nav toggle            | `bg-white text-grey-1 shadow-sm`                   |
| Dashboard tab         | `border-coral text-grey-1`                         |
| Readiness "Ready"     | `bg-green text-grey-1`                             |
| Readiness "Getting There" | `bg-coral/15 text-coral`                       |
| Readiness "Just Starting" | `bg-grey-5 text-grey-1`                        |

### 12.5 Group Hover Pattern

The `group` / `group-hover:` pattern is used for compound interactive elements:

```jsx
// Parent gets `group` class
<button className="... group">
  // Child responds to parent hover
  <p className="text-grey-1 group-hover:text-coral transition-colors">
```

Used in: ActionCards, OptionButton, HowItWorks video placeholder.

---

## 13. Common Tailwind Patterns

### 13.1 Centering

```
mx-auto                            // horizontal centering for block elements
flex items-center justify-center   // flex centering (icons in circles)
text-center                        // text alignment
```

### 13.2 Sections

```
max-w-{size} mx-auto px-4 py-{16|20} text-center
```

### 13.3 Card Base

```
bg-white rounded-xl border border-grey-5 {p-5|p-6}
```

### 13.4 Pill Button Base

```
px-{4|5|8} py-{1.5|2|3.5} rounded-full {bg-color} text-{color} text-sm font-medium hover:bg-{hover-color} transition-colors
```

### 13.5 Section Heading

```
font-serif text-{3xl|4xl} md:text-{4xl|5xl} font-medium text-grey-1 {text-center} {mb-*}
```

With optional italic span:
```
<span className="italic">accent words</span>
```

### 13.6 Body Text

```
text-grey-3 text-{sm|lg} leading-relaxed
```

### 13.7 Divider / Border

```
border-t border-grey-5       // horizontal divider
border-b border-grey-5       // bottom border
border-r border-grey-5       // vertical divider (dashboard columns)
border border-grey-5         // full border (cards)
```

### 13.8 Full-Height Layout

```
h-screen flex flex-col       // root container
flex-1 overflow-hidden       // grow to fill remaining space
overflow-y-auto              // scrollable content area
```

### 13.9 Flex Shrink Prevention

```
flex-shrink-0    // prevent avatar/icon from shrinking
min-w-0          // allow flex children to shrink below content size
```

---

## 14. Example Component Reference

### 14.1 Primary CTA Button

```jsx
<Link
  href="/dashboard"
  className="px-8 py-3.5 rounded-full bg-coral text-white font-medium hover:bg-coral-600 transition-colors shadow-lg shadow-coral/25"
>
  Start practicing
</Link>
```

### 14.2 Section Heading

```jsx
<h2 className="font-serif text-3xl md:text-4xl font-medium text-grey-1 text-center mb-16">
  Three steps to your <span className="italic">best</span> interview
</h2>
```

### 14.3 Card with Border

```jsx
<div className="bg-white rounded-xl border border-grey-5 p-6">
  <h3 className="font-medium text-grey-1 mb-4">Card title</h3>
  {/* content */}
</div>
```

### 14.4 Interactive Card Item (with group hover)

```jsx
<button className="flex items-start gap-3 p-4 rounded-lg border border-grey-5 hover:border-coral/30 hover:bg-coral/5 transition-all text-left group">
  <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
  <div>
    <p className="font-medium text-grey-1 text-sm group-hover:text-coral transition-colors">
      {title}
    </p>
    <p className="text-xs text-grey-3 mt-0.5">{description}</p>
  </div>
</button>
```

### 14.5 Stats Card

```jsx
<div className="bg-white rounded-xl border border-grey-5 p-5 flex items-center gap-4">
  <div className="w-11 h-11 rounded-lg bg-body flex items-center justify-center text-grey-3">
    {icon}
  </div>
  <div>
    <p className="text-2xl font-semibold text-grey-1">{value}</p>
    <p className="text-sm text-grey-3">{label}</p>
  </div>
</div>
```

### 14.6 Chat Message (AI)

```jsx
<div className="flex gap-3">
  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-coral/15 flex items-center justify-center mt-1">
    {/* avatar SVG */}
  </div>
  <div className="max-w-[85%]">
    <div className="rounded-2xl px-4 py-3 bg-white border border-grey-5 text-grey-1">
      <p className="text-sm leading-relaxed whitespace-pre-line">{content}</p>
    </div>
    <p className="text-xs text-grey-4 mt-1.5">{timestamp}</p>
  </div>
</div>
```

### 14.7 Chat Message (User)

```jsx
<div className="flex gap-3 flex-row-reverse">
  <div className="max-w-[85%] ml-auto">
    <div className="rounded-2xl px-4 py-3 bg-coral text-white">
      <p className="text-sm leading-relaxed whitespace-pre-line">{content}</p>
    </div>
    <p className="text-xs text-grey-4 mt-1.5 text-right">{timestamp}</p>
  </div>
</div>
```

### 14.8 Gradient Card (Coach)

```jsx
<div className="bg-gradient-to-br from-coral to-coral-600 rounded-xl p-6 text-white">
  <div className="flex items-center gap-3 mb-3">
    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
      {/* icon */}
    </div>
    <div>
      <p className="font-medium">Talk to Coach</p>
      <p className="text-sm text-white/75">Voice conversation</p>
    </div>
  </div>
  <button className="w-full py-2.5 rounded-lg bg-white text-coral font-medium text-sm hover:bg-white/90 transition-colors">
    Start Call
  </button>
</div>
```

---

## Quick Reference: Color → Hex

| Token      | Hex       |
| ---------- | --------- |
| body       | #fcfcf7   |
| coral      | #ff6d4d   |
| coral-50   | #fff3f0   |
| coral-100  | #ffe0d9   |
| coral-600  | #e5563a   |
| coral-700  | #cc4028   |
| green      | #befd71   |
| green-50   | #f4fee6   |
| grey-1     | #383838   |
| grey-2     | #454647   |
| grey-3     | #6b6b6b   |
| grey-4     | #9a9a9a   |
| grey-5     | #e5e5e0   |
