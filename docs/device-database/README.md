# Device Database Calibration

This folder stores calibration artifacts and samples used to tune thresholds for CPU/GPU identification.

- Put exported browser samples into `docs/device-database/samples/`.
- Optionally create `docs/device-database/expected.json` mapping sample filenames to expected families (apple/intel/amd/...).
- Run:
  - `node tools/calibrate.js ingest` to compute bands and write `calibration.json`.
  - `node tools/calibrate.js validate` to produce `regression-report.json` versus expected labels.

Artifacts:
- `calibration.json` – learned ratio bands per vendor (L1 / deep / overall).
- `regression-report.json` – validation summary and per-sample outcomes.

