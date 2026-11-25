---
name: LogDyno
description: A neutral, two-theme instrument under one fixed dark bar, where the runs are the only colour on the working surface.
colors:
  bg: "light-dark(#fafafa, #0a0a0b)"
  surface: "light-dark(#ffffff, #131316)"
  border: "light-dark(#e4e4e7, #27272a)"
  muted: "light-dark(#71717a, #a1a1aa)"
  ink: "light-dark(#0a0a0a, #fafafa)"
  accent: "light-dark(#2f6bff, #5b8cff)"
  on-accent: "light-dark(#ffffff, #0a0a0b)"
  danger: "light-dark(#c62828, #ff9592)"
  chart-grid: "light-dark(#EDEDF0, #1F1F23)"
  bar-ink: "#10151c"
  bar-surface: "#1b222c"
  bar-border: "rgb(255 255 255 / 0.28)"
  bar-muted: "#aebbc5"
  bar-text: "#ffffff"
  mark-red: "#e4421b"
  run-2: "light-dark(#12A594, #0AC5B3)"
  run-3: "light-dark(#8E4EC6, #BF7AF0)"
  run-4: "light-dark(#C2570C, #F5A524)"
  run-5: "light-dark(#0E7490, #22B8CF)"
  run-6: "light-dark(#E5484D, #FF6369)"
typography:
  display:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.02em"
  wordmark:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "24px"
    letterSpacing: "0.02em"
  headline:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: "24px"
    letterSpacing: "-0.02em"
    fontFeature: "'tnum'"
  body:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
    fontFeature: "'tnum'"
  body-lg:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
  small:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
  label:
    fontFamily: "'Geist Variable', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "14px"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  button-active:
    backgroundColor: "{colors.bg}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  icon-button:
    textColor: "{colors.muted}"
    rounded: "{rounded.xs}"
    size: "24px"
  icon-button-hover:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "28px"
  field-label:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  top-bar:
    backgroundColor: "{colors.bar-ink}"
    textColor: "{colors.bar-text}"
    typography: "{typography.wordmark}"
    padding: "12px 24px"
    height: "56px"
  top-bar-mark:
    backgroundColor: "{colors.mark-red}"
    width: "12px"
    height: "22px"
  top-bar-button:
    backgroundColor: "{colors.bar-surface}"
    textColor: "{colors.bar-text}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  top-bar-button-primary:
    backgroundColor: "{colors.bar-text}"
    textColor: "{colors.bar-ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  switch-track:
    backgroundColor: "{colors.bar-surface}"
    rounded: "9px"
    width: "32px"
    height: "18px"
  switch-track-on:
    backgroundColor: "{colors.bar-text}"
  values-table:
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    padding: "2px 16px 2px 0"
  run-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  drop-zone:
    textColor: "{colors.muted}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: "40px 48px"
    width: "min(100%, 720px)"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    width: "min(720px, calc(100vw - 32px))"
  list-item:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "32px"
  list-item-current:
    backgroundColor: "{colors.bg}"
---

# Design System: LogDyno

## Overview

**Creative North Star: "The Neutral Scale"**

The interface is a measuring instrument that stays out of its own readings. Below the top bar, ground, cards, borders and text are all achromatic, so the only saturated colour on the working surface is the runs themselves. Controls are small, dense and always visible: every setting behind a curve sits in that run's card beside its peak figures, never behind a menu.

Two themes exist and are the same design at opposite ends of the lightness scale: near-white ground with white cards, or near-black ground with slightly lifted cards. Every colour token is a single `light-dark()` pair on the root. The app follows the system by default; the Dark switch in the top bar writes `data-theme` on the root element, which pins `color-scheme` to one side. The top bar is the one surface that does not change: dark ink in both themes, carrying the red mark and the name.

Depth is carried by hairline borders and a one-step tonal lift, not shadows. Type is one family at three weights in sentence case, with tabular numerals everywhere because most of what is on screen is a number.

**Key Characteristics:**
- Achromatic working surface; run data is the only saturated colour on it.
- One fixed dark top bar in both themes, holding the only brand colour (the red mark) and the only capitals (the name).
- Light and dark themes from one set of `light-dark()` tokens, system-following with a manual override.
- Hairline borders and tonal layering; a single shadow, on the modal dialog.
- Dense controls: 28px fields, 32px buttons, 11px labels, 13px body.
- Runs identified by colour and marker shape together; torque is dashed against solid power.
- Run colour is for lines, markers and swatches; text about a run is always Ink.
- One typeface (Geist Variable, self-hosted) at weights 400, 500 and 600, plus 700 for the name alone.

## Colors

A zinc-neutral scale with one blue accent, one red for danger, a separate data palette reserved for runs, and a small fixed set for the top bar.

### Primary
- **Signal Blue** (`accent`): the primary action button outside the top bar, the focus ring on every focusable element, the border of the run card that contains focus, text selection, the text caret, and the dashed outline of the file-drop overlay. Nothing else.
- **On Accent** (`on-accent`): text on Signal Blue. White in light, near-black in dark.

### Secondary
- **Fault Red** (`danger`): error text (a run that cannot be calculated, a log that failed to load) and the label of the destructive button. Text only; never a fill.

### Neutral
- **Ground** (`bg`): the page behind everything. Also the pressed state of a button, the hover state of an icon button, and the current item in a list.
- **Card** (`surface`): run cards, the dialog, the problem strip, and every button and field outside the top bar.
- **Hairline** (`border`): all 1px borders and dividers.
- **Quiet Text** (`muted`): field labels, units, secondary lines, hints, legend keys for line style, chart axis text, the difference figures in the chart readout. Also the hover colour of a control's border and the dashed border of the empty-state drop zone.
- **Ink** (`ink`): primary text, every figure drawn on a chart, the native checkbox and slider tint, and the first run.
- **Chart Grid** (`chart-grid`): gridlines inside the chart canvas only. It exists in Chart.svelte, not as a CSS custom property.

### Top bar
Fixed values, the same in both themes, set as local overrides of the neutral tokens on the bar itself (with `color-scheme: dark`, so native controls inside it render dark).
- **Bar Ink** (`bar-ink`): the bar's fill, the text of its primary button, the knob of the switch when on, and the favicon's ground.
- **Bar Surface** (`bar-surface`): fill of buttons, selects and fields in the bar, and the switch track when off.
- **Bar Hairline** (`bar-border`): borders of controls in the bar and the divider between its groups.
- **Bar Quiet** (`bar-muted`): the hover colour of a control's border in the bar.
- **Bar Text** (`bar-text`): the name, control text, the fill of the bar's primary button, the switch knob when off and its track when on.
- **Mark Red** (`mark-red`): the mark before the name and in the favicon. Nowhere else.

### Run palette
Runs take their colour from an ordered list of light/dark pairs in `src/lib/run.ts`. Run 1 is Ink; runs 2 to 6 are `run-2` (teal), `run-3` (violet), `run-4` (orange/amber), `run-5` (cyan), `run-6` (red). Red is last because it sits close to Mark Red in the top bar. The list wraps after six. Marker shapes cycle independently every four runs: circle, square, triangle, diamond.

### Named Rules
**The Runs Own The Colour Rule.** Below the top bar, chrome is achromatic. Hue there means a run, the one primary action, a focus or selection state, or an error.

**The Fixed Bar Rule.** The top bar is the one fixed-colour surface: Bar Ink with Bar Text in both themes, so the mark always sits on the same ground. Mark Red belongs to the mark alone; it is never a state, a run or a fill for anything else.

**The First Run Is Ink Rule.** The first run is drawn in Ink, so a single run, on screen and in the exported image, is fully monochrome. Colour appears only when there is something to compare.

**The Never Colour Alone Rule.** A run is always identified by colour and marker shape together, wherever it appears: card header swatch, legend, readout, line end, peak, peak figure. Where one chart carries two quantities for a run, the right-axis one (torque) is dashed 5/4 and the left-axis one (power) is solid.

**The Ink Text Rule.** Run colour is for lines, markers and swatches. Text about a run (peak figures on the canvas, values in the readout, names in the legend and the exported image) is Ink, and is tied to its run by the swatch or marker beside it.

**The Canvas Mirror Rule.** The chart canvas cannot read CSS custom properties. Chart.svelte holds literal light and dark copies of `ink`, `muted` and `bg`, plus the canvas-only grid colour, and receives a `dark` flag. A change to those tokens in app.css must be made in Chart.svelte as well.

## Typography

**Display Font:** Geist Variable (with system-ui, sans-serif)
**Body Font:** Geist Variable (with system-ui, sans-serif)

Self-hosted through the `@fontsource-variable/geist` package, imported once in `src/main.ts`. No remote font request. The chart canvas uses the same stack.

**Character:** One quiet grotesque doing everything. Hierarchy comes from weight (400, 500, 600) and a narrow size range, with headings tightened slightly and never set in capitals. The name in the top bar is the single exception on every count.

### Hierarchy
- **Wordmark** (700, 20px, 24px, 0.02em, capitals): the app name in the top bar, 10px after the mark. Used once.
- **Display** (600, 22px, 28px, -0.02em, balanced wrap): the empty-state heading only.
- **Headline** (600, 16px, -0.02em): the dialog title.
- **Title** (600, 14px, -0.02em): chart section headings, optionally followed 8px later by a qualifying note in Small at weight 400 and Quiet Text ("estimated from the log", plus the dyno scale and its factor when the factor is not 1). A run's editable name is the small sibling (600, 13px, -0.01em).
- **Figure** (500, 20px, 24px, -0.02em): peak power and torque at the top of a run card, followed by the unit in body size.
- **Body** (400, 13px, 20px): the default. Buttons and the switch label are body at weight 500.
- **Body large** (400, 14px, 22px): empty-state prose, in Quiet Text with weight-600 Ink lead-ins.
- **Small** (400, 12px, 16 to 20px): field values, legend keys, the chart readout, the values table (600 for its column heads), hints, group legends, errors, checkbox labels.
- **Label** (400, 11px, 14px): field labels and their units, in Quiet Text. Axis text on the canvas is also 11px; peak figures are 11px at weight 500 in Ink.

### Named Rules
**The Tabular Rule.** `font-variant-numeric: tabular-nums` is set on the body, so every number aligns and no figure shifts width as values change.

**The Sentence Case Rule.** All headings, labels and buttons are sentence case at normal tracking. The only capitals, the only positive tracking and the only weight 700 belong to the name in the top bar.

## Layout

A single screen. A top bar (Bar Ink, min-height 56px, padding 12px 24px, a 1px rule below) holds the mark and name at the left, then a settings group (selects for unit system, power unit, torque unit and dyno scale, a 72px factor field that appears only for a custom scale, and the Dark switch), a group of four tool buttons, and the primary button last. Items sit 8px apart; the second group is set off by a Bar Hairline on its left edge with 16px of padding.

Below it, a fixed-width rail (360px, padding 12px, 10px between cards) holds one card per run, and the chart column takes the rest (padding 20px 28px, sticky to the top so the charts stay in view while the rail scrolls). The column is a stack of single-purpose charts: wheel power and torque (440px), then air-fuel ratio and boost as separate single-axis charts (180px each, 24px above each heading), each shown only when the logs carry that column. Each chart has a heading row (min-height 32px), then the canvas, then a readout indented 48px to sit under the plot area, with room reserved for two rows (min-height 42px) so nothing below jumps when it wraps. Every chart keeps the same left and right gutters (a chart with no right-hand scale still reserves the space), so RPM lines up down the page. Only the first chart needs a legend, pushed to the right of its heading, and only the first carries the how-to hint and the values table (a disclosure under it, indented 48px like the readout).

At 900px and below the top bar becomes a two-column grid (padding 12px): name and primary action on the first row, then each group as a full-width row that wraps. Buttons share their row equally; selects grow to fill but never shrink below their text, wrapping instead; the switch and the factor field keep their size. The layout becomes one column and the charts move above the rail (chart column padding drops to 12px). The dialog's two columns collapse to one at 600px.

Spacing is a loose 4px rhythm: 4, 8, 12, 16, 20, 24. Inside a run card everything is on a two-column grid with 8px row and 12px column gaps; the dialog form uses the same grid at 12px and 16px. Field labels sit 2px above their control. The empty state is one centred drop-zone panel (up to 720px wide, 6vh below the bar; flush and tighter under 900px).

## Elevation & Depth

Flat. Layers are separated by a 1px Hairline border and one tonal step between Ground and Card. Interactive response is a border darkening to Quiet Text on hover and a fill dropping to Ground when pressed, both over 150ms; nothing lifts. The only things that move are the switch knob (14px in 150ms, ease-out) and, on the chart, the lines of other runs fading to 18% while one run is pointed at.

### Shadow Vocabulary
- **Modal** (`box-shadow: 0 16px 48px -12px rgb(0 0 0 / 0.3)`): the Vehicles dialog only, over a `rgb(0 0 0 / 0.4)` backdrop.

### Named Rules
**The One Shadow Rule.** Only a modal that floats above the whole screen casts a shadow. Cards, bars, buttons and fields are flat in every state.

## Shapes

Small, consistent radii that grow with the size of the container: 4px for the icon button, 6px for buttons, fields and list items, 8px for run cards, 12px for the dialog, the drop zone and the file-drop overlay. The switch track is a full pill (18px tall, 9px radius) with a round knob. The mark is the one slanted shape: a 12 by 22px block skewed -12 degrees, leaning forward. Borders are 1px solid Hairline. A dashed stroke always means one of two things: a place to drop files (the 1px Quiet Text border of the empty-state drop zone, and the 2px Signal Blue outline of the overlay while a file is dragged over the page), or the right-axis quantity on a chart. Run markers are four plain geometric shapes, filled at a line's end and in the legend, hollow (filled with Ground) on its peak, and small and filled beside its peak figure.

## Components

### Buttons
Compact and quiet; only one of them is ever coloured.
- **Shape:** 32px tall, 12px horizontal padding, gently rounded (6px), body size at weight 500, never wraps.
- **Default:** Card fill, Hairline border, Ink text.
- **Primary:** Signal Blue fill and border with On Accent text, for the next step in the empty-state drop zone (Add a vehicle until one exists, then Load logs). At most one per group of actions.
- **In the top bar:** the same buttons on the bar's fixed values: Bar Surface fill, Bar Hairline border, Bar Text. The bar's primary (Load logs) is the inverse, a Bar Text fill with Bar Ink text, not Signal Blue.
- **Danger:** the default button with Fault Red text (Delete vehicle).
- **Hover / Active / Focus:** border shifts to Quiet Text; pressed fill drops to Ground; primary brightens 8%. Focus is the global 2px Signal Blue outline at 1px offset. Transitions are 150ms on border and background colour.
- **Disabled:** 50% opacity with a not-allowed cursor.
- **Icon button:** 24px square, 4px radius, no border, Quiet Text; on hover Ink on a Ground fill. Holds a 12px inline SVG stroke icon (1.5px, round caps) and always carries an `aria-label`.

### Inputs / Fields
- **Style:** text, number and select controls are 28px tall with 8px horizontal padding, 12px text, Card fill, Hairline border, 6px radius. Selects and the factor field in the top bar are 32px tall at 13px to match buttons, on the bar's fixed values.
- **Labelled field:** an 11px Quiet Text label 2px above the control. The label row is split, so a unit or live value sits right-aligned on the same line (a live value is weight 500 in Ink).
- **Hover / Focus:** border shifts to Quiet Text on hover; the global focus outline on focus. The text caret is Signal Blue.
- **Checkbox and slider:** native controls tinted Ink, not the accent. Checkbox labels are 12px Quiet Text with a 6px gap.
- **Inline title field:** a run's name is an input with a transparent border and no fill that shows its Hairline border only on hover.
- **Switch:** a `role="switch"` button, 32px tall, with a visible label after the track (body at weight 500). The track is a 32 by 18px pill with a 12px knob inset 2px; the knob slides 14px in 150ms. Off is a Bar Surface track with a Bar Hairline border and a Bar Text knob; on is a Bar Text track with a Bar Ink knob. Its one use is Dark in the top bar. Switching it back to what the system prefers returns the app to following the system.
- **Field group:** related fields that feed another field (the tire-size calculator under Tire diameter) sit in a borderless `fieldset` with a 12px Quiet Text legend, always visible, with their action button aligned to the end of the row.
- **Disclosure:** content that is optional to read (a run's column mapping, the chart's values table) sits in a native `details` element with a 12px Quiet Text summary.

### Cards / Containers
- **Run card:** Card fill, Hairline border, softly rounded (8px), padding 12px 14px, 12px between internal rows. No shadow. The border turns Signal Blue while focus is anywhere inside it. Pointing at a card or focusing inside it emphasises that run on every chart.
- **Order inside:** header (swatch, editable name, Show checkbox, remove icon button), then the two peak figures, then the settings grid, then disclosures. When a run cannot be calculated, a 12px Fault Red line replaces the figures and says what the run still needs.
- **Problem strip:** a full-width Card row under the top bar (padding 8px 24px, hairline below) listing load errors in Fault Red, with a Dismiss button.
- **Drop zone:** the empty state. No fill, a 1px dashed Quiet Text border, 12px radius, padding 40px 48px (24px 20px under 900px). It holds the Display heading, Body large prose and numbered steps, and a wrapping row of up to three buttons 24px below, the first of them primary. It is the one container drawn with a dashed border, because it is where files are dropped.

### Navigation
There is no page navigation; the top bar is the only persistent chrome.
- **Top bar:** the one fixed-colour surface (requested by the user after the first build). Bar Ink with Bar Text in both themes, `color-scheme: dark` so native controls inside it render dark, and the neutral tokens overridden locally so ordinary buttons, selects and fields restyle themselves without variants. Focus inside it is still the Signal Blue outline.
- **Mark and name:** the Mark Red block (12 by 22px, skewed -12 degrees), then the name in the Wordmark style. The same mark on a Bar Ink rounded square is the favicon (`public/favicon.svg`).
- **Contents, in order:** settings group (unit selects, dyno scale, the Dark switch), tools group, primary action. See Layout for spacing and the narrow arrangement.
- **List:** inside the dialog, saved items form a vertical list of 32px rows (6px radius, no border); hover and the current item take a Ground fill, and the current item is weight 600.

### Dialog
A native modal `dialog`: Card fill, Hairline border, 12px radius, the Modal shadow, up to 720px wide and inset 16px from the viewport. A header row (padding 16px 20px, hairline below) holds the title and a Done button; the body is a 200px list column with a hairline divider and a two-column form (padding 20px, gaps 12px 16px).

### Run swatch and legend
A 24px by 12px inline SVG: a 2px line in the run's colour with the run's marker centred on it. It appears in the run card header, in the chart legend and in the chart readout, always beside the run's name in Ink. Line-style keys (solid for the first quantity, dashed for the second) are a 20px stroke in Quiet Text.

### Chart
The signature component. Lines are 2px in the run's colour. A chart carries one quantity on one axis, except power and torque, which share a chart: power solid on the left axis, torque dashed 5/4 on the right. Axis and grid text is 11px Quiet Text, gridlines are 1px Chart Grid drawn from the left axis only, and there are no tick marks. Each line ends in a filled marker; a line with a peak carries a hollow marker on it (filled with Ground). Peak figures are drawn last, above every line and marker: an opaque Ground plate 14px tall holding the run's marker (small, filled, in the run's colour) and then the figure in 11px weight-500 Ink. A figure that would collide with one already placed is lifted in 14px steps.

Pointing at a run's card or its legend entry, or moving keyboard focus into its card, emphasises that run: every other run's lines and markers drop to 35% opacity and their peak figures are hidden. This is a redraw, so the zoom is kept.

Charts on the page share one cursor: pointing at any of them moves the RPM cursor and the readout on all of them. Pointing at the chart fills the readout beneath it: the RPM in weight-600 Ink, then one group per run made of its swatch, its name (500), and its values (400), all Ink. Every run after the first follows each value with its signed difference from the first run in Quiet Text. At rest the readout under the first chart is a one-line hint in Quiet Text, worded for touch on devices without hover; under the other charts it is empty. Dragging zooms the RPM axis and a double-click resets it.

### Values table
The chart's numbers as text, in a disclosure ("Values as a table") under the main chart. 12px, one row per 250 rpm, one column per line. Every cell is right-aligned and unwrapped with tabular figures, padding 2px 16px 2px 0, and a Hairline rule under each row; no fill, no outer border, no zebra. Column heads are weight 600 with the unit in Quiet Text; row heads (RPM) are weight 400.

### Exported image
The export is redrawn at a fixed size, so it is the same image from a phone as from a desktop: charts 1200px wide (520px for power and torque, 220px for each other chart) on a Ground field with 16px margins, in whichever theme is active. It opens with a title line (the app name at weight 600, then a description in Quiet Text that ends with the dyno scale and factor when the factor is not 1), then one 22px-tall line per run (swatch, name at 600, then peaks and settings at 400, all 13px Ink). Each chart sits under its own title (600, 13px) with its line-style key beside it as 12px Quiet Text.

## Do's and Don'ts

### Do:
- **Do** define every colour as one `light-dark()` pair on the root and let `data-theme` switch `color-scheme`; a new colour needs both values.
- **Do** keep the top bar on its fixed values in both themes, and restyle controls inside it by overriding the neutral tokens on the bar, not by adding variants.
- **Do** make the top bar's primary action the inverse button (Bar Text fill, Bar Ink text).
- **Do** give every chart the same left and right gutters so RPM lines up down the page.
- **Do** update the literal copies in Chart.svelte whenever `ink`, `muted` or `bg` changes in app.css.
- **Do** give every run a colour and a marker shape together, and keep the first run in Ink.
- **Do** set every figure and name about a run in Ink, beside its swatch or on its marker.
- **Do** give each quantity its own single-axis chart; where power and torque share one, draw torque dashed 5/4 and key that in Quiet Text.
- **Do** keep a run's inputs visible in its card, with the peak figures first.
- **Do** separate layers with a 1px Hairline border and the Ground/Card tonal step.
- **Do** use weights 400, 500 and 600, sentence case, with tabular numerals; the name in the top bar is the one exception.
- **Do** keep controls dense: 28px fields, 32px buttons, 11px labels above the control.

### Don't:
- **Don't** use Signal Blue for anything except the primary action outside the top bar, focus, selection, the caret and the drop outline; in particular, never as a run colour.
- **Don't** use Mark Red anywhere but the mark and the favicon.
- **Don't** carry the top bar's fixed colours onto any other surface.
- **Don't** put a second primary button in the same group of actions.
- **Don't** colour text with a run colour, on the canvas or off it.
- **Don't** tint chrome below the top bar. Backgrounds, cards and borders there stay on the neutral scale in both themes.
- **Don't** add shadows to cards, bars, buttons or fields; only a modal casts one.
- **Don't** rely on colour alone to tell runs apart, on screen or in the exported image.
- **Don't** use Fault Red as a fill.
- **Don't** set headings, labels or buttons in uppercase, or add tracking to them.
- **Don't** load fonts from a remote host; nothing leaves the browser.
