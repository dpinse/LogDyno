# Decisions

What LogDyno is, how it calculates, and why. Product context is in [PRODUCT.md](../PRODUCT.md); the visual system is in [DESIGN.md](../DESIGN.md).

## Terms

- **Log**: a delimited text export from an engine data logger.
- **Pull**: the stretch of a log where RPM rises at full throttle in one gear.
- **Run**: one loaded log plus its settings (vehicle, gear, smoothing, RPM trim, air conditions).
- **Vehicle**: the numbers the calculation needs: weight, driver and cargo weight, gear ratios, final drive, tire diameter, drag coefficient, frontal area, rolling resistance.
- **Smoothing level**: 0 to 10. Level *n* fits RPM against time over a window of ±0.1·*n* seconds.
- **Wheel power**: power at the tires. LogDyno does not estimate crank power.

## Calculation

All internal values are SI (`src/lib/dyno.ts`); units are converted only for display (`src/lib/units.ts`).

1. **Find the pull.** Fit RPM against time; keep samples where RPM is rising and, if a throttle column is mapped, throttle is at least 95% of its maximum. Take the contiguous stretch with the largest RPM gain.
2. **Smooth and differentiate in one step.** For each sample, fit a parabola to RPM over the smoothing window. The fit gives the smoothed RPM and its rate of change. This works with uneven sample spacing. It is a parabola and not a straight line because RPM against time bends during a pull: at the two ends of the pull the window only reaches one way, and a straight line there made more smoothing read as more power at the top of the rev range.
3. **Road speed** `v = rpm · π · tire diameter / (60 · gear · final drive)`.
4. **Force** `F = m·a + ½·ρ·Cd·A·v² + Crr·m·g`, with `ρ = P / (287.05 · T)` from the run's air temperature and pressure.
5. **Power** `P = F · v`; **torque** `T = P / ω` at the engine.
6. **Optional SAE J1349 correction** `1.18 · (99 kPa / P) · √(T / 298.15 K) − 0.18`.
7. Air-fuel values of 4 or less are treated as lambda and multiplied by 14.7.

The test in `src/lib/dyno.test.ts` simulates a pull from a known power curve and checks the result is within 3% of it.

Known limits: rotating inertia of the engine and wheels is ignored, so results read slightly low in lower gears. The road is assumed flat and windless. Wheelspin or a slipping clutch looks like power.

## Decisions

| Decision | Why |
|---|---|
| Inspired by desktop road-dyno tools, not a clone of one | The goal is the idea, with known calculation flaws fixed. No third-party name, data or file format is used. |
| RPM-based, not speed-based | RPM is in every log and is cleaner than logged speed. It makes gear ratio and tire size matter. |
| Fit-then-differentiate smoothing | Differencing adjacent samples is very noisy at high log rates. |
| Rolling resistance and density-scaled drag included | Cheap, and worth several horsepower at speed. Grade, humidity and drivetrain loss are left out because few people have the inputs. |
| Vehicles entered by hand | No car database is bundled. |
| Columns detected by name, correctable, remembered per header set | Works with loggers nobody listed in advance. |
| Runs share an RPM axis every 25 rpm | Lets the readout compare all runs at one engine speed. |
| Loaded logs are stored in IndexedDB, small settings in localStorage | A reload should not lose a session. Logs are too large for localStorage. The JSON backup covers vehicles, settings and column mappings, not logs. |
| Plain Svelte 5 + Vite, no SvelteKit | One screen, no routes, no server rendering. |
| S3 + CloudFront via Terraform; Actions only uploads | Infrastructure changes stay deliberate; the deploy role can touch one bucket and one distribution. |
| `connect-src 'none'` in the Content-Security-Policy, set as a `<meta>` tag at build | The browser itself enforces that logs cannot be sent anywhere. It is in the page, not a response header, because CloudFront's free flat-rate plan only allows AWS's managed header policies. A test checks a request from the built page is refused. |
| CloudFront free flat-rate plan, with AWS's managed security headers and a one-rule web ACL | Caps the bill: the plan has no overage charges. The cost is weaker headers than a custom policy: framing allowed from the same site only (was: never), no Permissions-Policy, no Cross-Origin-Opener-Policy, HSTS for one year without subdomains (was: two years with). |
| Dyno scale: Dynojet ×1.00, Mustang ×0.90, or a custom factor | People compare against the kind of dyno they know. The factors are rough conventions, not measurements: the calculation works like an inertia dyno (power from accelerating a known mass), so that is the unscaled case, and load-bearing dynos commonly read about a tenth lower. The scale in use is printed on the chart and the export. |
| No analytics, ads, accounts or update checks | Nothing leaves the browser. |

## Not in this version

Graphing arbitrary other columns, a bundled vehicle list, a custom print layout, crank-power estimates. Planned work is in [TODO.md](TODO.md).
