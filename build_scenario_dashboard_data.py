#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime, timezone


ROOT = Path(__file__).resolve().parent
OUT_JS = ROOT / "scenario_dashboard_data.js"
OUT_JSON = ROOT / "scenario_dashboard_data.json"

EXPECTED_SCENARIOS = [
    {"folderName": "output_turkey_reference_2024", "label": "Reference 2024"},
    {"folderName": "output_turkey_reference_2030", "label": "Reference 2030"},
    {"folderName": "output_turkey_reference_2035", "label": "Reference 2035"},
    {"folderName": "output_turkey_drought_2024", "label": "Drought 2024"},
    {"folderName": "output_turkey_drought_2030", "label": "Drought 2030"},
    {"folderName": "output_turkey_drought_2035", "label": "Drought 2035"},
]


def parse_metrics(path: Path):
    total_cost = None
    total_gwp = None
    if not path.exists():
        return total_cost, total_gwp
    for raw in path.read_text(encoding="utf-8").splitlines():
        parts = raw.strip().split()
        if len(parts) < 2:
            continue
        key, value = parts[0], parts[1]
        try:
            num = float(value)
        except ValueError:
            continue
        if key == "TotalCost":
            total_cost = num
        elif key == "TotalGWP":
            total_gwp = num
    return total_cost, total_gwp


def parse_two_col(path: Path):
    result = {}
    if not path.exists():
        return result
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        if parts[0] == "Name":
            continue
        try:
            result[parts[0]] = float(parts[1])
        except ValueError:
            continue
    return result


def parse_cost_breakdown(path: Path):
    result = {}
    if not path.exists():
        return result
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) < 4 or parts[0] == "Name":
            continue
        try:
            c_inv = float(parts[1])
        except ValueError:
            c_inv = 0.0
        try:
            c_maint = float(parts[2])
        except ValueError:
            c_maint = 0.0
        try:
            c_op = float(parts[3])
        except ValueError:
            c_op = 0.0
        result[parts[0]] = {
            "cInv": c_inv,
            "cMaint": c_maint,
            "cOp": c_op,
            "sum": c_inv + c_maint + c_op,
        }
    return result


def scenario_sort_key(folder_name: str):
    # Prioritize new 6-scenario outputs first.
    preferred = [
        "output_turkey_reference_2024",
        "output_turkey_reference_2030",
        "output_turkey_reference_2035",
        "output_turkey_drought_2024",
        "output_turkey_drought_2030",
        "output_turkey_drought_2035",
    ]
    if folder_name in preferred:
        return (0, preferred.index(folder_name))
    return (1, folder_name)


def build():
    scenario_map = {}
    for d in ROOT.iterdir():
        if not d.is_dir() or not d.name.startswith("output"):
            continue
        metrics_file = d / "scenario_metrics.txt"
        total_cost, total_gwp = parse_metrics(metrics_file)
        has_metrics = metrics_file.exists()
        solved = has_metrics and total_cost is not None and total_gwp is not None
        if not has_metrics:
            reason = "scenario_metrics.txt not found"
        elif not solved:
            reason = "metrics file exists but values are missing/invalid"
        else:
            reason = "ok"

        total_output = parse_two_col(d / "total_output.txt")
        cost_breakdown = parse_cost_breakdown(d / "cost_breakdown.txt")
        elec_output = total_output.get("ELECTRICITY")
        cost_intensity = None
        gwp_intensity = None
        if solved and elec_output and elec_output > 0:
            cost_intensity = total_cost / elec_output
            gwp_intensity = total_gwp / elec_output

        scenario_map[d.name] = {
            "folderName": d.name,
            "totalCost": total_cost,
            "totalGwp": total_gwp,
            "totalOutput": total_output,
            "costBreakdown": cost_breakdown,
            "solved": solved,
            "statusReason": reason,
            "expected": False,
            "label": d.name,
            "kpi": {
                "electricityOutputGWh": elec_output,
                "costPerGWh": cost_intensity,
                "gwpPerGWh": gwp_intensity,
            },
        }

    expected_status = []
    for item in EXPECTED_SCENARIOS:
        folder_name = item["folderName"]
        label = item["label"]
        scenario = scenario_map.get(folder_name)
        if scenario is None:
            scenario = {
                "folderName": folder_name,
                "totalCost": None,
                "totalGwp": None,
                "totalOutput": {},
                "costBreakdown": {},
                "solved": False,
                "statusReason": "output folder not found",
                "expected": True,
                "label": label,
            }
            scenario_map[folder_name] = scenario
        else:
            scenario["expected"] = True
            scenario["label"] = label
        expected_status.append(
            {
                "folderName": folder_name,
                "label": label,
                "solved": scenario["solved"],
                "statusReason": scenario["statusReason"],
            }
        )

    scenarios = list(scenario_map.values())
    scenarios.sort(key=lambda s: scenario_sort_key(s["folderName"]))
    unsolved_expected = [x for x in expected_status if not x["solved"]]
    solved_expected = [x for x in expected_status if x["solved"]]
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scenarios": scenarios,
        "expectedScenarios": expected_status,
        "unsolvedExpectedCount": len(unsolved_expected),
        "solvedExpectedCount": len(solved_expected),
    }

    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    OUT_JS.write_text(
        "window.SCENARIO_DASHBOARD_DATA = " + json.dumps(payload, ensure_ascii=True) + ";\n",
        encoding="utf-8",
    )
    print(f"Generated {OUT_JSON.name} and {OUT_JS.name} with {len(scenarios)} scenarios.")


if __name__ == "__main__":
    build()
