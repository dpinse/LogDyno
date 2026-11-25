---
version: 1
slug: "src-app-svelte"
primary_target: "src/App.svelte"
related_targets: []
---

# LogDyno main screen

Scope: the single app screen (src/App.svelte and src/lib components). Mode: Operate.

Audience and job: tuners at a desk, people on a laptop between pulls, and owners who want a graph to share. They load logs, set vehicle and gear per run, compare runs, export an image.

Constraints: nothing leaves the browser; settings behind every curve stay visible; light and dark themes (user request), following the system with a manual switch.

## Direction contract

THESIS: The interface is a neutral scale so the runs are the only colour on screen. It refuses the dark neon telemetry dashboard and the grey desktop utility.

OWN-WORLD: Near-white ground, white cards, hairline borders, one blue accent for the primary action and focus; dark theme mirrors it on near-black. Geist at 400/500/600, sentence case, tabular numerals. Runs carry colour plus a marker shape; torque is dashed.

STORY: The visitor drops logs, sees each run's peak figures at the top of its card, reads differences on the chart, and exports one image that carries peaks and run details.

FIRST VIEWPORT: 56px top bar (name left; unit selects, theme, Vehicles, Export PNG, Backup, Restore, primary Load logs right). 360px left rail of run cards, each leading with peak power and torque, then vehicle, gear, smoothing, RPM trim, air and SAE, columns. Right: power and torque chart, then air-fuel and boost chart.

FORM: Monochrome Product (dealt challenger, user's choice). seed:6b3da85e7f7e1616. Signature interaction: hover readout across all runs at one RPM; drag to zoom.

USER PINS (after the first build, in the user's words; these override the blocks above where they differ):
- "Make sure to add a dark mode as well"
- "I liked the top bar of the model pick. Particularly the red line logo": the top bar is a fixed dark ink surface with a red slanted mark and a bold capital wordmark, in both themes; its primary button is white.
- "Make the light and dark mode a toggle switch": a Dark switch replaces the theme select.
- "can we add tire calculation like virtual dyno": the tire-size calculator is always visible in the vehicle editor.
- "Add the logs survive reload. and all the design and polish": runs and logs persist; pointing at a run dims the others; a values table sits under the main chart.
- "Might be good to have a scaling setting like dynojet vs mustang dyno": a Dyno scale select in the top bar; the scale in use is shown on the chart and the export, marked approximate.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
