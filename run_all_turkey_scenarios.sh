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
  "scenarios/turkey_drought_emcap_2024/ses_main_turkey_drought_emcap_2024.run"
  "scenarios/turkey_drought_emcap_2030/ses_main_turkey_drought_emcap_2030.run"
  "scenarios/turkey_drought_emcap_2035/ses_main_turkey_drought_emcap_2035.run"
)

# Match OUTPUT_DIR in each ses_main_turkey_*.run (fresh outputs, no stale files).
OUTPUT_DIRS=(
  "output_turkey_reference_2024"
  "output_turkey_reference_2030"
  "output_turkey_reference_2035"
  "output_turkey_drought_2024"
  "output_turkey_drought_2030"
  "output_turkey_drought_2035"
  "output_turkey_drought_emcap_2024"
  "output_turkey_drought_emcap_2030"
  "output_turkey_drought_emcap_2035"
)

echo "Removing prior scenario output directories..."
for out_dir in "${OUTPUT_DIRS[@]}"; do
  rm -rf "$ROOT_DIR/$out_dir"
done
echo "Done. (${#OUTPUT_DIRS[@]} directories cleared or absent.)"

echo "Starting batch scenario run..."
echo "NOTE: Reference/drought 2030–2035 use IEA WEO 2025 STEPS fuel files; 2024 anchor in ses_main_turkey_reference_case.dat."
echo "NOTE: CPS fuel files remain for optional high-fossil sensitivity runs (include manually if needed)."

LOG_ROOT="$ROOT_DIR/scenario_run_logs"
mkdir -p "$LOG_ROOT"
FAILED_RUNS=()

# AMPL may exit 0 even when the solver reports infeasibility; detect failure by missing scenario_metrics.txt.
write_run_error_file() {
  local out_dir="$1"
  local run_file="$2"
  local tmp_log="$3"
  local dest="$ROOT_DIR/$out_dir/scenario_run_error.txt"
  {
    echo "Senaryo koşusu tam çıktı üretmedi (scenario_metrics.txt yok veya çözüm dışa aktarılmadı)."
    echo "Betik: ${run_file}"
    echo "Çıktı klasörü: ${out_dir}/"
    echo ""
    echo "--- Çözücü / presolve ile ilgili satırlar (grep) ---"
    grep -E "cannot hold|infeasible|Infeasible|unbounded|Unbounded|no solution|No solution|failed|Failed" "$tmp_log" 2>/dev/null | tail -n 40 || echo "(eşleşen satır yok)"
    echo ""
    echo "--- AMPL / Gurobi günlüğünün son 100 satırı ---"
    tail -n 100 "$tmp_log"
  } >"$dest"
  echo "  Wrote: $dest"
}

for run_file in "${RUN_FILES[@]}"; do
  echo "------------------------------------------------------------"
  echo "Running: ${run_file}"
  tmp_log="$(mktemp)"
  OUTPUT_DIR_FOR_RUN="$(grep -E '^param OUTPUT_DIR symbolic :=' "$ROOT_DIR/$run_file" 2>/dev/null | head -1 | sed -n 's/.*"\([^"]*\)".*/\1/p')"
  if [[ -z "$OUTPUT_DIR_FOR_RUN" ]]; then
    echo "  WARNING: could not parse OUTPUT_DIR from ${run_file}"
  fi

  set +e
  "$AMPL_BIN" "$run_file" >"$tmp_log" 2>&1
  ampl_rc=$?
  set -e

  cp -f "$tmp_log" "$LOG_ROOT/$(basename "$run_file" .run).log"

  metrics_path="$ROOT_DIR/${OUTPUT_DIR_FOR_RUN}/scenario_metrics.txt"
  run_failed=0
  if [[ -z "$OUTPUT_DIR_FOR_RUN" || ! -f "$metrics_path" ]]; then
    run_failed=1
  elif grep -qE '^TotalCost[[:space:]]+0([[:space:]]|$)' "$metrics_path" \
    && grep -qE '^TotalGWP[[:space:]]+0([[:space:]]|$)' "$metrics_path"; then
    run_failed=1
  elif grep -qE "cannot hold|infeasible|Infeasible|unbounded|Unbounded|no solution|No solution" "$tmp_log" 2>/dev/null; then
    run_failed=1
  fi

  if [[ "$run_failed" -eq 0 ]]; then
    echo "Completed: ${run_file}"
  else
    echo "FAILED (infeasible / no valid metrics): ${run_file}"
    FAILED_RUNS+=("$run_file")
    if [[ -n "$OUTPUT_DIR_FOR_RUN" ]]; then
      mkdir -p "$ROOT_DIR/$OUTPUT_DIR_FOR_RUN"
      write_run_error_file "$OUTPUT_DIR_FOR_RUN" "$run_file" "$tmp_log"
    fi
    if [[ "$ampl_rc" -ne 0 ]]; then
      echo "  AMPL exit code: ${ampl_rc}"
    fi
  fi
  rm -f "$tmp_log"
done

echo "------------------------------------------------------------"
if ((${#FAILED_RUNS[@]} > 0)); then
  echo "Batch finished with ${#FAILED_RUNS[@]} failing scenario(s) (see scenario_run_error.txt in each output_* folder)."
else
  echo "All scenario runs completed successfully (scenario_metrics.txt present for each run)."
fi

echo "Generating scenario comparison data..."
python3 "$ROOT_DIR/build_scenario_dashboard_data.py"

echo "Opening dashboard..."
if command -v open >/dev/null 2>&1; then
  open "$ROOT_DIR/scenario_dashboard.html"
else
  echo "Dashboard file ready: $ROOT_DIR/scenario_dashboard.html"
fi
