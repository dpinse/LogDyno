# To do

Agreed on 2026-11-24 as later work, most valuable first within each group.

## Accuracy

- [ ] **Test on real logs.** Everything so far ran on simulated pulls. Column detection, header parsing and time formats have not seen real logger exports. Sample logs are to be supplied.
- [ ] **Rotating inertia.** The engine, flywheel and wheels are not accounted for, so results read low, most in lower gears. Add an effective-mass factor per gear with a sensible default.
- [ ] **Wheelspin and shifts.** Wheelspin or a slipping clutch reads as power. Warn when RPM rises implausibly fast.
- [ ] **Low smoothing is noisy.** Levels 0 and 1 wander a few hp at typical log rates. Raise the minimum window or default higher for slow loggers.

## Features

- [ ] **Tire size per run**, overriding the vehicle's value, with the size calculator beside it.
- [ ] **Choosing the pull.** A log with several pulls only shows the one with the largest RPM gain.
- [ ] **Baseline choice.** The readout compares every run to the first one shown.
- [ ] **Boost and air-fuel units.** No psi/bar/kPa switch; lambda is always converted to gasoline AFR.
- [ ] **Export the numbers** as CSV, not only a PNG.
- [ ] **Include logs in the backup file**, or say clearly in the UI that it does not.

## Housekeeping

- [ ] **Commit and deploy.** Steps are in the README.
- [ ] **Recalculation.** Every run recalculates on any change; cache per run if large logs lag.
- [ ] **Storage failures are silent.** If the browser refuses storage, runs simply do not persist.
