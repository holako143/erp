---
name: RLM Enterprise Prism
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#005a89'
  on-tertiary: '#ffffff'
  tertiary-container: '#0073ae'
  on-tertiary-container: '#e7f2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style
The design system establishes a high-performance, precision-engineered enterprise ERP environment tailored for operational mission control and high-density transactional processing. The aesthetic balances Corporate Modern with crisp Minimalist principles, eliminating visual clutter in favor of high-legibility information hierarchy. 

The experience evokes feelings of absolute certainty, speed, and analytical rigor. The interface is engineered natively for dual-direction layout (LTR and full RTL Arabic support), with geometric visual balance, tight rhythm, and razor-sharp separation lines that remain stable across complex data tables, real-time analytics, and messaging workflows.

## Colors
The palette utilizes clinical contrast on clean, ultra-light backdrops to optimize day-long cognitive endurance.
- **Base Surfaces**: The primary canvas rests on pure white (`#ffffff`) for focused workspaces, framed by structured auxiliary layers in `slate-50` (`#f8fafc`) and subtle control insets in `slate-100` (`#f1f5f9`).
- **Dividers & Structural Borders**: Edges and table grids leverage precise hairline delineations in `slate-200` (`#e2e8f0`), stepping up to `slate-300` (`#cbd5e1`) for interactive states and active form controls.
- **Typography & Content Hierarchy**: Primary headings leverage `slate-950` / `slate-900` (`#020617` / `#0f172a`) for crisp optical priority. Long-form body copy relies on `slate-800` (`#1e293b`) and `slate-700` (`#334155`), while meta markers and tertiary data utilize `slate-500` (`#64748b`).
- **Primary & Operational Accents**: Enterprise Blue `#2563eb` (hover: `#1d4ed8`) drives workflow execution and focus indicators. 
- **Functional Communications & Status**: Emerald `#059669` and vibrant `#10b981` indicate active WhatsApp sessions, healthy pipelines, and positive financial delta. Warnings deploy Amber (`#d97706`), while errors and system blocks deploy Ruby (`#dc2626`).

## Typography
Typography is tuned for instant scannability across dense records, dashboards, and operational flows:
- **Font Stack**: `Plus Jakarta Sans` delivers balanced metrics and distinct letterforms that perform consistently in high-density ERP modules. Numerical sequences, IDs, currency markers, timestamps, and WhatsApp payload logs strictly utilize `JetBrains Mono` with tabular lining numbers (`tnum`) enabled to ensure vertical column alignment.
- **RTL Language Strategy**: In Arabic mode, typography transitions dynamically to native Naskh-style systemic rendering (`IBM Plex Sans Arabic` or `Noto Sans Arabic`), with baseline adjustments and a 1.1x line-height multiplier to account for vertical diacritics without clipping table cell bounds.

## Layout & Spacing
The layout model employs a fluid 12-column grid bound to a strict 4px/8px modular spacing rhythm, engineered for dense multi-pane dashboards and master-detail split screens.

- **Breakpoints & Adaptation**:
  - **Mobile (< 768px)**: 4-column layout; gutter `1rem`; horizontal margin `1rem`. Secondary analytical panels collapse to off-canvas sheets.
  - **Tablet (768px - 1023px)**: 8-column layout; gutter `1rem`; margin `1.5rem`. Navigational sidebar auto-collapses to an icon rail.
  - **Desktop (1024px - 1440px)**: 12-column layout; gutter `1.5rem`; margin `2rem`.
  - **Wide Displays (> 1440px)**: 12-column layout; canvas can span dynamically or constrain to a maximum width of 1920px for multi-monitor data operations.
- **RTL Adaptation Architecture**: Grid column order, margin alignments, navigation drawers, and floating utility bars flip along the logical horizontal axis (`start` and `end` properties). Tabular numeric data and monospaced codes remain LTR aligned for universal accounting syntax.

## Elevation & Depth
This design system avoids heavy drop shadows in favor of low-contrast outlines and clean surface-tier layering, guaranteeing maximum screen brightness and crispness.

- **Structural Depth**: Spatial hierarchy is achieved through distinct background shifts. Modals, tooltips, and floating menus float above base tiers using a surgical micro-border (`1px solid #cbd5e1`) combined with a diffused, slate-tinted ambient glow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 10px 15px -3px rgba(15, 23, 42, 0.04)`.
- **Layer Stacking Model**:
  - *Tier 0 (Canvas Base)*: `#f8fafc` (slate-50).
  - *Tier 1 (Cards, Data Grid Containers, Work Areas)*: Pure `#ffffff` framed by `1px solid #e2e8f0`.
  - *Tier 2 (Popovers, Sticky Headers, In-Context Menus)*: `#ffffff` with `1px solid #cbd5e1` and low-opacity ambient lift.
  - *Tier 3 (Global Modals, Command Palette)*: Elevated overlay backed by a soft, semi-transparent backdrop blur (`rgba(15, 23, 42, 0.35)` with `backdrop-filter: blur(4px)`).

## Shapes
The system utilizes compact, soft geometry (Level 1) to convey precision and maximize available data display density:
- **Base Components**: Standard controls—including form fields, buttons, table cell wrappers, and segmented controls—utilize a 4px (`0.25rem`) border radius.
- **Card Containers & Modules**: Major data cards, master panels, and modals scale up to 8px (`0.5rem`).
- **Pills & Status Indicators**: WhatsApp indicators, tag chips, and micro state tags deploy fully rounded radii (`9999px`) to create clear optical contrast against strict rectangular data grids.

## Components

### Buttons
- **Primary**: Solid background `#2563eb`, pure white text, font weight 600. Hover: `#1d4ed8`. Active: `#1e40af`. Focus: 2px ring offset in `#ffffff` with `#2563eb`.
- **Secondary**: Surface `#ffffff`, border `1px solid #cbd5e1`, text `slate-700`. Hover: background `#f8fafc`, text `slate-900`, border `#94a3b8`.
- **WhatsApp Action**: Background `#059669`, white text. Hover: `#047857`. Focus ring in `#10b981`. Includes integrated left (or right in RTL) 16px messaging glyph.
- **Destructive**: Background `#ffffff`, border `1px solid #fecaca`, text `#dc2626`. Hover: background `#fef2f2`, border `#ef4444`.

### Chips & Badges
- **Status Pills**: Compact padding (`2px 8px`), height 20px, font `label-sm`.
- **Active WhatsApp**: Background `#ecfdf5`, border `1px solid #a7f3d0`, text `#065f46`, with an active pulsing status dot (`#10b981`).
- **Filter Chips**: Background `#f1f5f9`, border `1px solid #e2e8f0`, text `slate-700`. Selected state toggles to `#eff6ff`, border `#bfdbfe`, text `#1d4ed8`.

### Input Fields & Controls
- **Inputs & Selects**: Height 36px (compact enterprise density). Background `#ffffff`, border `1px solid #cbd5e1`, text `slate-900`, placeholder `slate-400`. Focus: border `#2563eb`, box-shadow `0 0 0 1px #2563eb`. Error: border `#dc2626`.
- **Checkboxes & Radios**: 16x16px footprint. Checked state uses solid `#2563eb` with crisp white mark. Unchecked state uses `#ffffff` with `1px solid #cbd5e1`. Focus ring matches primary blue.

### Data Tables & Grids
- **Header**: Height 36px, background `#f8fafc`, border-bottom `1px solid #cbd5e1`, text `slate-600`, font weight 600, uppercase `label-sm`.
- **Rows**: Alternating or clean `#ffffff` with `1px solid #f1f5f9` cell dividers. Row hover: `#f8fafc`. Active selection: `#eff6ff`. Monospaced tabular alignment for financial and quantity records.

### Cards & Analytical KPI Blocks
- **Card**: Pure white surface, `1px solid #e2e8f0`, radius `0.5rem`, padding `1.25rem`.
- **KPI Metrics**: Large numerical display in `Plus Jakarta Sans` (bold, `slate-900`), accompanied by monospaced micro-delta indicators (`#059669` for gain, `#dc2626` for loss).

### RTL Component Adaptations
- Icons indicating directionality (arrows, step navigators, chevron expanders) flip 180 degrees automatically.
- WhatsApp communication drawers slide from the left in LTR and the right in RTL.
- Badges and numeric IDs maintain uniform digit ordering regardless of reading direction.