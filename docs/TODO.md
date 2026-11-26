# To do

Agreed on 2026-11-24 as later work, most valuable first within each group.

## Accuracy

- [ ] **Test on more real logs.** Three Hondata exports from one car have been run (2026-11-25); other loggers have not. No comparison numbers from another dyno tool have been checked yet.
- [ ] **Gear check.** A gear change ends the pull, and clutch slip and wheelspin are reported (2026-11-25), but nothing checks that the gear chosen on the run is the gear the log was driven in.
- [ ] **Level 1 is still wavy on real logs**, where RPM only updates about 30 times a second and jitters by 20 rpm. The scale became 1 to 5 on 2026-11-25 (was 0 to 10; the bottom levels were unusable), default 2. The last few hundred rpm of a pull still moves with the level.

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
