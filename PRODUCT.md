# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Svelte 5 + TypeScript on Vite (plain Svelte, not SvelteKit), uPlot for charts, Vitest plus one Playwright smoke test. Static files on a private S3 bucket behind CloudFront, defined in Terraform; GitHub Actions uploads the build. No backend.

## Users

Three overlapping people, none dominant:

- A tuner at a desk reviewing logs after a drive, comparing before and after a change.
- Someone on a laptop in a garage, car park or at the track, between pulls, often in poor light.
- A car owner who logs occasionally and wants a clean graph to post on a forum or in a group chat.

## Product Purpose

LogDyno estimates wheel power and torque from an engine data log recorded during a full-throttle pull in one gear. The person drops in one or more logs, picks the vehicle and gear, and gets power and torque against RPM, with air-fuel ratio and boost alongside. Success is two things: differences between several runs are obvious at a glance, and the session ends with one clean image that carries the peak numbers and run details.

## Positioning

Everything happens in the browser. Logs are never uploaded, there is no account, and logs, vehicles and settings stay in the browser's own storage. Vehicles and settings have a JSON backup.

## Operating Context

- Input is a CSV-style log from any engine data logger. Columns for time, RPM, throttle, air-fuel ratio and boost are detected by name and can be corrected by hand; the correction is remembered for logs with the same headers.
- Vehicles are entered by hand: weight, occupant weight, gear ratios, final drive, tyre diameter (with a tyre-size calculator), drag coefficient, frontal area, rolling resistance.
- Each run has its own vehicle, gear, smoothing level, RPM trim, and optional SAE correction with temperature and pressure.
- Several runs are overlaid on one chart. The chart exports as a PNG.
- Loaded logs and their run settings are kept in the browser (IndexedDB) and come back after a reload, until the run is removed. Vehicles, settings and column mappings are kept too (localStorage), with a JSON backup that does not include logs.

## Capabilities and Constraints

- The calculation is RPM-based: road speed comes from RPM, gear ratio, final drive and tyre size. The result is wheel power, not crank power.
- Force is acceleration plus aerodynamic drag (scaled by air density) plus rolling resistance.
- Units: imperial or metric; power in hp, kW or PS; torque in lb-ft or Nm. Imperial is the default.
- A dyno scale setting multiplies every figure: Dynojet ×1.00 (unscaled), Mustang ×0.90, or a custom factor. These are rough conventions, and the scale in use is shown on the chart and the export.
- No analytics, ads, registration or update checks.
- Not in the first version: graphing arbitrary other columns, a bundled car database, custom print layout.

## Brand Commitments

- Working name: LogDyno.
- The product does not name, reference or imitate any existing desktop dyno application.

## Evidence on Hand

- No real customer logs, testimonials or benchmark comparisons exist. Demonstration curves must be labelled synthetic.
- No logo or brand assets exist yet.

## Product Principles

1. The number is only as good as the inputs, so the inputs behind every curve stay visible and easy to reach.
2. Comparing runs comes first; a single run is the simple case of a comparison.
3. The exported image must stand on its own, with peaks and run details on it.
4. Nothing leaves the browser.
5. It must not feel like an old desktop utility, and it must not be so stripped back that settings are hidden.

## Accessibility & Inclusion

Usable on a laptop in poor light. Runs are distinguished by more than colour alone (line style and labels), since several curves overlap.
