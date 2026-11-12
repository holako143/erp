---
name: Lumina ERP
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#069669'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: IBM Plex Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  data-metric:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies an ultra-clean, modern enterprise aesthetic tailored for high-density SaaS ERP and POS workflows. It balances rigorous utility with an airy, quiet luxury. The visual atmosphere minimizes cognitive fatigue during 8- to 10-hour workdays by prioritizing structural calmness, intentional white space, and low-contrast delineations over high-friction visual noise.

Key tenets:
- **Quiet Precision:** Data density achieved through razor-sharp hierarchy and typographic discipline, not cramped packaging.
- **Micro-Contrast & Tactility:** Surface depth relies on pristine layered surfaces, whisper-thin hairline borders, and subtle contrast differences between functional canvas and working cards.
- **Cognitive Ergonomics:** Softened functional indicators that inform without blaring alerts across the operator’s field of view.

## Colors

The color palette is calibrated for long operational sessions, using a neutral slate architecture with high-end corporate accents.

- **Canvas & Surface:**
  - Base Application Canvas: `#F8FAFC` (Slate 50).
  - Surface Cards & Floating Modules: `#FFFFFF`.
  - Subtle Recessed Areas & Data Headers: `#F1F5F9` (Slate 100).
- **Core Tones:**
  - Primary Structural / Brand: Deep Navy (`#0F172A`) for high-order headlines, active structural items, and primary interactions.
  - Interactive / Accent: Cobalt Blue (`#2563EB`) reserved strictly for interactive actions, focus rings, and selection indicators.
- **Muted Semantic Accents:**
  - Success / Paid / In-Stock: Muted Emerald (`#059669` foreground, `#ECFDF5` background).
  - Warning / Pending: Muted Amber (`#D97706` foreground, `#FFFBEB` background).
  - Critical / Failed: Soft Crimson (`#E11D48` foreground, `#FFF1F2` background).
  - Neutral / Draft: Slate (`#475569` foreground, `#F1F5F9` background).
- **Hairline Borders:** `#E2E8F0` (Slate 200) for cards and inputs; `#CBD5E1` (Slate 300) for active divider lines and tabs.

## Typography

Typographic scale is structured around `IBM Plex Sans` (with companion `IBM Plex Sans Arabic` for RTL environments). IBM Plex was selected for its monoline clarity, distinct technical glyph structure, and exceptional legibility when scanning Arabic and Latin numerical data side by side.

Guidelines:
- **Numerical Alignment:** Use tabular figures (`font-variant-numeric: tabular-nums`) across all data grids, cash register displays, and ledger views to keep values vertically aligned.
- **Weight Pairing:** Avoid heavy black weights. Reserve `700 Bold` strictly for standalone metrics and KPIs. Rely on `500 Medium` and `600 SemiBold` for structure and semantic labeling.
- **RTL Baseline Rhythm:** When displaying Arabic script, line heights are increased by 2-4px relative to standard English metrics to accommodate natural Arabic ascenders and descenders without clipping.

## Layout & Spacing

The layout model enforces a strictly organized 12-column responsive fluid grid pinned to a maximal container width of `1600px` for ultra-wide POS and desktop displays.

- **Application Canvas Shell:**
  - Top Navigation Bar: Fixed height of `64px`, floating cleanly above the canvas with a structural bottom border.
  - Side Navigation (Collapsible): Fixed `260px` expanded width, collapsable to `72px` icon-only state.
  - POS Layout Reflow: Split pane where the transaction basket is pinned to a fixed `380px` or `420px` right column, with the catalog grid fluidly adapting in the remaining space.
- **Breakpoints:**
  - `Mobile` (< 768px): Single-column stack. Global margins collapse to `1rem`. POS cart shifts to a bottom-sheet interface.
  - `Tablet` (768px - 1024px): 8-column layout. Navigation shifts to a compact rail. Gutter set to `1.25rem`.
  - `Desktop` (> 1024px): 12-column layout. Full operational views with permanent layout partitions and `1.5rem` gutters.

## Elevation & Depth

This system avoids deep, muddy shadows in favor of a clean, architectural approach based on micro-borders and soft ambient diffusion.

- **Level 0 (Flat Base Canvas):** `#F8FAFC` background. Borderless.
- **Level 1 (Operational Cards & Modules):** Pure white `#FFFFFF` surface bounded by a crisp 1px border of `rgba(226, 232, 240, 0.9)` (Slate 200). Shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.03), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Hover States & Active Dropdowns):** Pure white surface with border `rgba(203, 213, 225, 0.8)`. Shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 2px 4px -2px rgba(15, 23, 42, 0.02)`.
- **Level 3 (Modals & Slide-over Transaction Drawers):** Elevates off the page using an outer ambient glow: `0 20px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.03)`. Backing scrim utilizes `#0F172A` with `0.2` opacity (20% tint).

## Shapes

The interface employs a **Soft** shape language (`roundedness: 1`), keeping elements structured, architectural, and business-focused while avoiding harsh industrial edges:

- **Inputs, Buttons, and Table Rows:** `0.25rem` (4px) to `0.375rem` (6px).
- **Cards, Panels, and Dialog Windows:** `0.5rem` (8px) (`rounded-lg`).
- **Pills / Status Badges:** `9999px` full round for distinct semantic contrast against rectangular data cards.
- **POS Action Triggers (Quick-Add Keys):** `0.5rem` (8px) to optimize finger-touch tap targets without compromising geometry.

## Components

### Buttons
- **Primary:** Filled `#0F172A` with `#FFFFFF` text. Hover transitions to `#1E293B`. Active: scale `0.99`. Padding: `8px 16px` for standard UI, `12px 20px` for POS checkout triggers.
- **Secondary (Action):** Filled `#2563EB` with `#FFFFFF` text. Hover transitions to `#1D4ED8`. Used for conversion moments like "Process Payment" or "Save Order".
- **Outline / Ghost:** Base `#FFFFFF` background with 1px border of `#E2E8F0` and `#0F172A` text. Hover triggers `#F8FAFC` background and `#CBD5E1` border.

### Top Navigation Bar
- Structured at a fixed height of `64px`, finished in `#FFFFFF` with a bottom boundary of `1px solid #E2E8F0`.
- Contains minimal cognitive overhead: tenant/branch switcher, unified search input (`#F8FAFC` fill, 1px border `#E2E8F0`), live operational status badge, and user identity module.

### Input Fields & Controls
- **Inputs:** Crisp `#FFFFFF` surface with 1px `#E2E8F0` border. Text `#0F172A`, placeholder `#94A3B8`. 
- **Focus State:** 1px border `#2563EB` combined with a soft 3px box-shadow halo in `rgba(37, 99, 235, 0.12)`.
- **POS Quick-Search:** Prominent, slightly elevated input with integrated keyboard navigation shortcuts (e.g., `/` to focus, `ESC` to clear).

### Status Badges & Chips
- Designed with low-saturation backgrounds and medium-tone typography to ensure large volumes of tags do not overwhelm ledger views:
  - *Success (Completed/Paid):* `#ECFDF5` background, `#059669` text, hairline border in `rgba(5, 150, 105, 0.15)`.
  - *Warning (Pending/Low Stock):* `#FFFBEB` background, `#D97706` text, hairline border in `rgba(217, 119, 6, 0.15)`.
  - *Critical (Refunded/Overdue):* `#FFF1F2` background, `#E11D48` text, hairline border in `rgba(225, 29, 72, 0.15)`.

### Cards & Data Tables
- **Cards:** Background `#FFFFFF`, border `1px solid #E2E8F0`, padding `1.25rem` to `1.5rem`.
- **Tables:** 
  - Headers: Height `40px`, uppercase `label-sm` typography, background `#F8FAFC`, text `#64748B`, bottom border `1px solid #E2E8F0`.
  - Rows: Height `48px` to `56px`, cell padding `0 16px`, subtle hover fill `#F8FAFC`. Zero alternating row fills (zebra) to retain visual purity.