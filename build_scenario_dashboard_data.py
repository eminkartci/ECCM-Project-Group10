#!/usr/bin/env python3
import csv
import json
import re
from pathlib import Path
from datetime import datetime, timezone


ROOT = Path(__file__).resolve().parent
OUT_JS = ROOT / "scenario_dashboard_data.js"
OUT_JSON = ROOT / "scenario_dashboard_data.json"

# Dashboard: kurulu güç (GW) yığılmış bar sırası ve Türkçe etiketler
INSTALLED_CAPACITY_FUEL_ORDER = [
    "nuclear",
    "natural_gas",
    "coal",
    "hydro",
    "solar_pv",
    "wind",
    "geothermal",
    "biomass",
    "other_electric",
]
INSTALLED_CAPACITY_FUEL_LABELS_TR = {
    "nuclear": "Nükleer",
    "natural_gas": "Doğal gaz (CCGT)",
    "coal": "Kömür",
    "hydro": "Hidro",
    "solar_pv": "Güneş (PV)",
    "wind": "Rüzgar",
    "geothermal": "Jeotermal",
    "biomass": "Biyokütle (odun)",
    "other_electric": "Diğer (elektrik teknolojileri)",
}

EXPECTED_SCENARIOS = [
    {"folderName": "output_turkey_reference_2024", "label": "Reference 2024"},
    {"folderName": "output_turkey_reference_2030", "label": "Reference 2030"},
    {"folderName": "output_turkey_reference_2035", "label": "Reference 2035"},
    {"folderName": "output_turkey_drought_2024", "label": "Drought 2024"},
    {"folderName": "output_turkey_drought_2030", "label": "Drought 2030"},
    {"folderName": "output_turkey_drought_2035", "label": "Drought 2035"},
    {"folderName": "output_turkey_drought_emcap_2024", "label": "Drought+EmCap 2024"},
    {"folderName": "output_turkey_drought_emcap_2030", "label": "Drought+EmCap 2030"},
    {"folderName": "output_turkey_drought_emcap_2035", "label": "Drought+EmCap 2035"},
]


def read_run_error(path: Path) -> str | None:
    """Written by run_all_turkey_scenarios.sh when scenario_metrics.txt is missing."""
    err = path / "scenario_run_error.txt"
    if not err.exists():
        return None
    text = err.read_text(encoding="utf-8", errors="replace").strip()
    return text or None


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


def parse_resources_for_fuel_share(sets_path: Path):
    """RESOURCES kümesi; elektrik ihracat payda dışı. total_output ile yakıt üretim oranları için."""
    if not sets_path.exists():
        return []
    text = sets_path.read_text(encoding="utf-8")
    marker = "set RESOURCES :="
    idx = text.find(marker)
    if idx < 0:
        return []
    after = text[idx + len(marker) :]
    semi = after.find(";")
    chunk = after[:semi] if semi >= 0 else after
    tokens = [t for t in chunk.split() if t]
    exclude = {"ELECTRICITY", "ELEC_EXPORT"}
    return [t for t in tokens if t not in exclude]


def parse_electricity_supply_techs(sets_path: Path):
    """Teknoloji adları: sets.txt içindeki TECHNOLOGIES_OF_END_USES_TYPE[ELECTRICITY] kümesi."""
    if not sets_path.exists():
        return []
    text = sets_path.read_text(encoding="utf-8")
    marker = "set TECHNOLOGIES_OF_END_USES_TYPE[ELECTRICITY] :="
    idx = text.find(marker)
    if idx < 0:
        return []
    after = text[idx + len(marker) :]
    semi = after.find(";")
    if semi < 0:
        return []
    chunk = after[:semi]
    return [t for t in chunk.split() if t]


def sum_electricity_supply_gwh(total_output: dict, techs: list) -> float | None:
    if not techs or not total_output:
        return None
    s = sum(float(total_output.get(t, 0) or 0) for t in techs)
    return s if s > 0 else 0.0


def parse_turkey_scenario_year_track(folder_name: str) -> tuple[int | None, str | None]:
    """output_turkey_reference_2030 → (2030, 'reference'); yoksa (None, None)."""
    low = folder_name.lower()
    if "turkey" not in low:
        return None, None
    m = re.search(r"(20\d{2})", folder_name)
    year = int(m.group(1)) if m else None
    if "drought_emcap" in low or "drought-emcap" in low:
        track = "drought_emcap"
    elif "drought" in low:
        track = "drought"
    elif "reference" in low:
        track = "reference"
    else:
        track = None
    return year, track


def aggregate_installed_capacity_from_fmult(
    f_mult: dict[str, float], electricity_techs: list[str]
) -> dict[str, float]:
    """export_installed_capacity_by_fuel.run ile aynı mantık (yedek)."""

    def gv(name: str) -> float:
        try:
            return float(f_mult.get(name, 0) or 0)
        except (TypeError, ValueError):
            return 0.0

    nuclear = gv("NUCLEAR")
    natural_gas = gv("CCGT") + gv("CCGT_CCS")
    coal = gv("COAL_US") + gv("COAL_IGCC") + gv("COAL_US_CCS") + gv("COAL_IGCC_CCS")
    hydro = gv("HYDRO_DAM") + gv("NEW_HYDRO_DAM") + gv("HYDRO_RIVER") + gv("NEW_HYDRO_RIVER")
    solar_pv = gv("PV")
    wind = gv("WIND")
    geothermal = gv("GEOTHERMAL")
    biomass = gv("IND_COGEN_WOOD")
    elec_total = sum(gv(t) for t in electricity_techs)
    mapped_core = nuclear + natural_gas + coal + hydro + solar_pv + wind + geothermal
    other_electric = max(0.0, elec_total - mapped_core)
    out = {
        "nuclear": nuclear,
        "natural_gas": natural_gas,
        "coal": coal,
        "hydro": hydro,
        "solar_pv": solar_pv,
        "wind": wind,
        "geothermal": geothermal,
        "biomass": biomass,
        "other_electric": other_electric,
    }
    return {k: round(out[k], 6) for k in INSTALLED_CAPACITY_FUEL_ORDER}


def load_installed_capacity_by_fuel(
    out_dir: Path, f_mult_path: Path, sets_path: Path
) -> dict[str, float]:
    p = out_dir / "installed_capacity_by_fuel_gw.txt"
    raw: dict[str, float] = {}
    if p.exists():
        raw = parse_two_col(p)
    raw.pop("electricity_techs_total_GW", None)
    if raw and any(abs(float(v or 0)) > 1e-15 for v in raw.values()):
        return {k: float(raw.get(k, 0) or 0) for k in INSTALLED_CAPACITY_FUEL_ORDER}
    fm = parse_two_col(f_mult_path)
    elc = parse_electricity_supply_techs(sets_path)
    return aggregate_installed_capacity_from_fmult(fm, elc)


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


MONTH_LABELS_TR = [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
]


def parse_period_matrix(path: Path, value_cols: int = 12):
    """Tab file: Name + N period columns (1..12). Returns {name: [v1..vN]}."""
    result: dict[str, list[float]] = {}
    if not path.exists():
        return result
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        name = parts[0]
        if name == "Name":
            continue
        vals: list[float] = []
        for p in parts[1 : 1 + value_cols]:
            try:
                vals.append(float(p))
            except ValueError:
                vals.append(0.0)
        while len(vals) < value_cols:
            vals.append(0.0)
        result[name] = vals[:value_cols]
    return result


def parse_monthly_energy_price(path: Path):
    """monthly_energy_price.txt → list of {period, demandGwh, costMeur, priceEurPerMwh}."""
    rows: list[dict] = []
    if not path.exists():
        return rows
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("period"):
            continue
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        try:
            period = int(parts[0])
        except ValueError:
            continue
        try:
            demand = float(parts[1])
            cost = float(parts[2])
            price = float(parts[3])
        except ValueError:
            continue
        label = MONTH_LABELS_TR[period - 1] if 1 <= period <= 12 else str(period)
        rows.append(
            {
                "period": period,
                "monthLabel": label,
                "demandGwh": demand,
                "costMeur": cost,
                "priceEurPerMwh": price,
            }
        )
    rows.sort(key=lambda r: r["period"])
    return rows


def parse_end_uses(path: Path):
    """Annual activity per carrier: sum of absolute period values (GWh per period in model output)."""
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
        name = parts[0]
        if name == "Name":
            continue
        total = 0.0
        for p in parts[1:]:
            try:
                total += abs(float(p))
            except ValueError:
                continue
        result[name] = total
    return result


def parse_sankey_csv(path: Path):
    """Rows from sankey/input2sankey.csv (energy flows, TWh)."""
    links = []
    if not path.exists():
        return links
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                val = float(row.get("realValue", 0) or 0)
            except (TypeError, ValueError):
                continue
            if val <= 0:
                continue
            src = (row.get("source") or "").strip()
            tgt = (row.get("target") or "").strip()
            if not src or not tgt:
                continue
            links.append(
                {
                    "source": src,
                    "target": tgt,
                    "value": val,
                    "color": (row.get("layerColor") or "").strip(),
                    "unit": (row.get("layerUnit") or "TWh").strip(),
                }
            )
    return links


# Sankey export: links into the central "Elec" node (same as dashboard Sankey).
SANKEY_ELEC_SOURCE_ORDER = [
    "Nuclear",
    "NG CCS",
    "NG",
    "Coal CCS",
    "Coal",
    "Hydro Dams",
    "Hydro River",
    "Wind",
    "Solar",
    "Geothermal",
    "Electricity",
]


def aggregate_sankey_supply_to_elec_gwh(links: list) -> dict[str, float]:
    """Sum realValue (TWh) for target 'Elec' → GWh to align with total_output-style numbers in UI."""
    out: dict[str, float] = {}
    for L in links or []:
        tgt = (L.get("target") or "").strip().lower()
        if tgt != "elec":
            continue
        src = (L.get("source") or "").strip()
        if not src:
            continue
        try:
            twh = float(L.get("value", 0) or 0)
        except (TypeError, ValueError):
            continue
        if twh <= 0:
            continue
        out[src] = out.get(src, 0.0) + twh * 1000.0
    return out


def merge_sankey_elec_row_order(keys: set[str]) -> list[str]:
    if not keys:
        return []
    rest = sorted(k for k in keys if k not in SANKEY_ELEC_SOURCE_ORDER)
    return [k for k in SANKEY_ELEC_SOURCE_ORDER if k in keys] + rest


def parse_losses(path: Path) -> dict[str, float]:
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
        "output_turkey_drought_emcap_2024",
        "output_turkey_drought_emcap_2030",
        "output_turkey_drought_emcap_2035",
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
        run_error = read_run_error(d)
        has_metrics = metrics_file.exists()
        solved = has_metrics and total_cost is not None and total_gwp is not None
        if not has_metrics:
            reason = "scenario_metrics.txt not found — model run did not export metrics"
            if run_error:
                reason += " (scenario_run_error.txt present)"
        elif not solved:
            reason = "metrics file exists but values are missing/invalid"
        else:
            reason = "ok"

        total_output = parse_two_col(d / "total_output.txt")
        cost_breakdown = parse_cost_breakdown(d / "cost_breakdown.txt")
        end_uses_annual = parse_end_uses(d / "End_Uses.txt")
        sankey_links = parse_sankey_csv(d / "sankey" / "input2sankey.csv")
        electricity_sankey_supply_gwh = aggregate_sankey_supply_to_elec_gwh(sankey_links)
        elec_row = total_output.get("ELECTRICITY")
        elec_supply_techs = parse_electricity_supply_techs(d / "sets.txt")
        elec_supply = sum_electricity_supply_gwh(total_output, elec_supply_techs)
        denom = None
        if elec_row is not None and elec_row > 0:
            denom = elec_row
        elif elec_supply is not None and elec_supply > 0:
            denom = elec_supply
        cost_intensity = None
        gwp_intensity = None
        if solved and denom and denom > 0 and total_cost is not None and total_gwp is not None:
            cost_intensity = total_cost / denom
            gwp_intensity = total_gwp / denom

        scenario_year, scenario_track = parse_turkey_scenario_year_track(d.name)
        installed_by_fuel = load_installed_capacity_by_fuel(d, d / "f_mult.txt", d / "sets.txt")

        losses = parse_losses(d / "losses.txt")
        elec_losses_gwh = losses.get("ELECTRICITY", 0.0)
        elec_demand_gwh = None
        if denom is not None and denom > 0:
            elec_demand_gwh = denom - elec_losses_gwh
            if elec_demand_gwh <= 0:
                elec_demand_gwh = denom

        energy_price_eur_per_mwh = None
        if solved and total_cost is not None and elec_demand_gwh and elec_demand_gwh > 0:
            energy_price_eur_per_mwh = total_cost / elec_demand_gwh * 1000.0

        total_emissions_kt_co2 = total_gwp if solved else None
        monthly_energy_price = parse_monthly_energy_price(d / "monthly_energy_price.txt")
        monthly_electricity_supply_gwh = parse_period_matrix(
            d / "monthly_electricity_supply_gwh.txt"
        )

        scenario_map[d.name] = {
            "folderName": d.name,
            "totalCost": total_cost,
            "totalGwp": total_gwp,
            "totalOutput": total_output,
            "costBreakdown": cost_breakdown,
            "endUsesAnnual": end_uses_annual,
            "sankeyLinks": sankey_links,
            "electricitySankeySupplyGwh": electricity_sankey_supply_gwh,
            "solved": solved,
            "statusReason": reason,
            "runError": run_error,
            "scenarioYear": scenario_year,
            "scenarioTrack": scenario_track,
            "installedCapacityByFuelGw": installed_by_fuel,
            "monthlyEnergyPrice": monthly_energy_price,
            "monthlyElectricitySupplyGwh": monthly_electricity_supply_gwh,
            "expected": False,
            "label": d.name,
            "kpi": {
                "electricityOutputGWh": elec_row,
                "electricitySupplyGWh": elec_supply,
                "electricityDemandGWh": elec_demand_gwh,
                "electricityLossesGWh": elec_losses_gwh,
                "costPerGWh": cost_intensity,
                "gwpPerGWh": gwp_intensity,
                "endUseDemandGWh": sum(end_uses_annual.values()) if end_uses_annual else None,
                "energyPriceEurPerMwh": energy_price_eur_per_mwh,
                "totalEmissionsKtCO2": total_emissions_kt_co2,
            },
        }

    expected_status = []
    for item in EXPECTED_SCENARIOS:
        folder_name = item["folderName"]
        label = item["label"]
        scenario = scenario_map.get(folder_name)
        if scenario is None:
            _yr, _tr = parse_turkey_scenario_year_track(folder_name)
            scenario = {
                "folderName": folder_name,
                "totalCost": None,
                "totalGwp": None,
                "totalOutput": {},
                "costBreakdown": {},
                "endUsesAnnual": {},
                "sankeyLinks": [],
                "electricitySankeySupplyGwh": {},
                "solved": False,
                "statusReason": "output folder not found",
                "runError": None,
                "scenarioYear": _yr,
                "scenarioTrack": _tr,
                "installedCapacityByFuelGw": {},
                "monthlyEnergyPrice": [],
                "monthlyElectricitySupplyGwh": {},
                "expected": True,
                "label": label,
                "kpi": {
                    "electricityOutputGWh": None,
                    "electricitySupplyGWh": None,
                    "electricityDemandGWh": None,
                    "electricityLossesGWh": None,
                    "costPerGWh": None,
                    "gwpPerGWh": None,
                    "endUseDemandGWh": None,
                    "energyPriceEurPerMwh": None,
                    "totalEmissionsKtCO2": None,
                },
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
                "runError": scenario.get("runError"),
            }
        )

    scenarios = list(scenario_map.values())
    scenarios.sort(key=lambda s: scenario_sort_key(s["folderName"]))

    fuel_resources_for_share = []
    for probe in [
        "output_turkey_reference_2024",
        "output_turkey_reference_case",
    ] + [s["folderName"] for s in scenarios]:
        sp = ROOT / probe / "sets.txt"
        if sp.exists():
            fuel_resources_for_share = parse_resources_for_fuel_share(sp)
            if fuel_resources_for_share:
                break
    if not fuel_resources_for_share:
        for d in ROOT.iterdir():
            if d.is_dir() and d.name.startswith("output"):
                sp = d / "sets.txt"
                if sp.exists():
                    fuel_resources_for_share = parse_resources_for_fuel_share(sp)
                    if fuel_resources_for_share:
                        break

    sankey_elec_keys: set[str] = set()
    for s in scenarios:
        m = s.get("electricitySankeySupplyGwh") or {}
        for k, v in m.items():
            if (v or 0) > 0:
                sankey_elec_keys.add(k)
    electricity_sankey_supply_row_order = merge_sankey_elec_row_order(sankey_elec_keys)

    unsolved_expected = [x for x in expected_status if not x["solved"]]
    solved_expected = [x for x in expected_status if x["solved"]]
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scenarios": scenarios,
        "expectedScenarios": expected_status,
        "unsolvedExpectedCount": len(unsolved_expected),
        "solvedExpectedCount": len(solved_expected),
        "fuelResourcesForShare": fuel_resources_for_share,
        "electricitySankeySupplyRowOrder": electricity_sankey_supply_row_order,
        "installedCapacityFuelOrder": INSTALLED_CAPACITY_FUEL_ORDER,
        "installedCapacityFuelLabels": INSTALLED_CAPACITY_FUEL_LABELS_TR,
        "monthLabels": MONTH_LABELS_TR,
    }

    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    OUT_JS.write_text(
        "window.SCENARIO_DASHBOARD_DATA = " + json.dumps(payload, ensure_ascii=True) + ";\n",
        encoding="utf-8",
    )
    print(f"Generated {OUT_JSON.name} and {OUT_JS.name} with {len(scenarios)} scenarios.")


if __name__ == "__main__":
    build()
