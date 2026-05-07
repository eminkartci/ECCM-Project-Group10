#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

resolve_ampl_bin() {
  if command -v ampl >/dev/null 2>&1; then
    command -v ampl
    return 0
  fi

  # Common typo fallback
  if command -v amlp >/dev/null 2>&1; then
    command -v amlp
    return 0
  fi

  # Common macOS/local install paths
  local candidate
  for candidate in \
    "/Applications/AMPL/ampl" \
    "/opt/ampl/ampl" \
    "/usr/local/bin/ampl" \
    "$HOME/ampl/ampl" \
    "$HOME/.local/bin/ampl"
  do
    if [ -x "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

if ! AMPL_BIN="$(resolve_ampl_bin)"; then
  echo "ERROR: AMPL binary not found."
  echo "Checked: ampl, amlp, /Applications/AMPL/ampl, /opt/ampl/ampl, /usr/local/bin/ampl, ~/ampl/ampl, ~/.local/bin/ampl"
  echo "If AMPL is installed elsewhere, run with:"
  echo "  AMPL_BIN=/full/path/to/ampl ./run_all_turkey_scenarios.sh"
  exit 1
fi

# Allow override from environment if user provides explicit path.
AMPL_BIN="${AMPL_BIN:-$AMPL_BIN}"

RUN_FILES=(
  "scenarios/turkey_reference_2024/ses_main_turkey_reference_2024.run"
  "scenarios/turkey_reference_2030/ses_main_turkey_reference_2030.run"
  "scenarios/turkey_reference_2035/ses_main_turkey_reference_2035.run"
  "scenarios/turkey_drought_2024/ses_main_turkey_drought_2024.run"
  "scenarios/turkey_drought_2030/ses_main_turkey_drought_2030.run"
  "scenarios/turkey_drought_2035/ses_main_turkey_drought_2035.run"
)

echo "Starting batch scenario run..."
echo "WARNING: All scenario .dat files currently reuse 2024 values."
echo "WARNING: Update year-specific and drought-specific assumptions before final analysis."

for run_file in "${RUN_FILES[@]}"; do
  echo "------------------------------------------------------------"
  echo "Running: ${run_file}"
  "$AMPL_BIN" "$run_file"
  echo "Completed: ${run_file}"
done

echo "------------------------------------------------------------"
echo "All scenario runs completed."

echo "Generating scenario comparison data..."
python3 "$ROOT_DIR/build_scenario_dashboard_data.py"

echo "Opening dashboard..."
if command -v open >/dev/null 2>&1; then
  open "$ROOT_DIR/scenario_dashboard.html"
else
  echo "Dashboard file ready: $ROOT_DIR/scenario_dashboard.html"
fi
