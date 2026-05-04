# Model Run Scripts (English)

This file contains copy-paste scripts to run the available EnergyScope scenarios.

## Prerequisites

- AMPL is installed and available in your shell (`ampl --version` works).
- You run commands from the repository root:
  - `/Users/eminkartci/Desktop/codenv/ECCM-Project-Group10`

## 1) Run Baseline Scenario

```bash
ampl scenarios/baseline/ses_main.run
```

Main outputs are written to `output/`.

## 2) Run Drought Scenario

```bash
ampl scenarios/drought/ses_main_drought.run
```

Main outputs are written to `output_drought/`.

## 3) Run Turkey Reference Case Scenario

```bash
ampl scenarios/turkey_reference_case/ses_main_turkey_reference_case.run
```

Main outputs are written to `output_turkey_reference_case/`.

## 4) Run All Scenarios (One by One)

```bash
ampl scenarios/baseline/ses_main.run && \
ampl scenarios/drought/ses_main_drought.run && \
ampl scenarios/turkey_reference_case/ses_main_turkey_reference_case.run
```

If one run fails, the next one will not start (because `&&` is used).

## 5) Optional Helper Script (macOS/Linux)

Create a shell script:

```bash
cat > run_all_models.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "Running baseline..."
ampl scenarios/baseline/ses_main.run

echo "Running drought..."
ampl scenarios/drought/ses_main_drought.run

echo "Running turkey reference case..."
ampl scenarios/turkey_reference_case/ses_main_turkey_reference_case.run

echo "All scenario runs completed successfully."
EOF
```

Make it executable and run it:

```bash
chmod +x run_all_models.sh
./run_all_models.sh
```

## 6) Quick Check After Runs

```bash
ls output/scenario_metrics.txt output_drought/scenario_metrics.txt output_turkey_reference_case/scenario_metrics.txt
```

If the three files exist, each scenario run reached the summary output stage.
