# Turkey reference and drought scenarios

This document describes how the **Turkey reference** and **Turkey drought** model scenarios are structured, which inputs were updated, and what each layer of the repository uses.

---

## 1. Model and solver

| Item | Usage |
|------|--------|
| **Core model** | `model/ses_main.mod` (EnergyScope-style SES formulation). |
| **Baseline data** | `scenarios/baseline/ses_main.dat` is included first from the Turkey reference case file (see below). |
| **Solver** | Gurobi (`option solver gurobi` in the `.run` files). A valid AMPL + Gurobi setup is required. |

---

## 2. Scenario hierarchy

All Turkey-specific `.dat` files build on a **single calibrated anchor**:

1. **`scenarios/turkey_reference_case/ses_main_turkey_reference_case.dat`**  
   - Starts with `include scenarios/baseline/ses_main.dat;`  
   - Then applies Turkey-specific overrides: installed capacity bands (`f_min` / `f_max`), fuel prices, sectoral electricity demand, export limit, and hydro new-build locks.

2. **Year-stamped reference and drought files**  
   - Each begins with `include scenarios/turkey_reference_case/ses_main_turkey_reference_case.dat;`  
   - Then **redefines** only what differs for that year and storyline (especially capacities, `end_uses_demand_year` for electricity, and hydro treatment for drought).

So: **reference case = full Turkey calibration**; **reference 2024 / 2030 / 2035 and drought 2024 / 2030 / 2035 = anchor + deltas**.

---

## 3. Turkey reference case (anchor file)

**File:** `scenarios/turkey_reference_case/ses_main_turkey_reference_case.dat`

### 3.1 What it encodes

| Block | Purpose |
|-------|--------|
| **Installed capacity (2024, GW)** | `f_min` / `f_max` for technologies such as `CCGT`, `COAL_US`, `COAL_IGCC`, `HYDRO_DAM`, `HYDRO_RIVER`, `PV`, `WIND`, `IND_COGEN_WOOD`, `GEOTHERMAL`. Nuclear is set to **0 GW** in this anchor (no operating nuclear in the 2024 calibration). |
| **New hydro** | `NEW_HYDRO_DAM` and `NEW_HYDRO_RIVER` are forced to **0** (no new-build hydro in the scenario intent). |
| **Fuel prices** | Turkey fuel inputs in **EUR/MWh (LHV, thermal)** via named parameters (`turkey_fuel_EUR_per_MWh__*`), converted to model `c_op` in **MCHF/GWh** using `chf_per_eur` (often `1.0` for a EUR-like numeraire) and the factor `0.001`. Comments document a **v3** adjustment (e.g. coal vs natural gas levels) aimed at generation shares closer to **TEİAŞ 2024**-style calibration targets (coal, gas, hydro, wind, solar, biomass/geothermal). |
| **Sector electricity demand** | `end_uses_demand_year` for `ELECTRICITY` and sectors `HOUSEHOLDS`, `SERVICES`, `INDUSTRY`, `TRANSPORTATION` in **GWh/year**. Values are aligned with a **2025** column from a national sector electricity table (see comments in the file: e.g. industry / residential / services / transport in TWh, converted to GWh). This block is the **near-term demand** used consistently as the “2024 scenario year” demand baseline. |
| **Trade** | `avail["ELEC_EXPORT"]` sets an annual export allowance (**GWh/year** in the file comments). |

### 3.2 How it is executed

**File:** `scenarios/turkey_reference_case/ses_main_turkey_reference_case.run`

- Loads `model/ses_main.mod` and `ses_main_turkey_reference_case.dat`.
- Solves, then writes outputs under **`output_turkey_reference_case/`** (text exports, metrics, and **Sankey** CSV via `scenarios/common/export_sankey.run`).

---

## 4. Turkey reference scenarios by year

### 4.1 Reference 2024

**File:** `scenarios/turkey_reference_2024/ses_main_turkey_reference_2024.dat`

- Includes the full reference case, then sets **hydro** `f_min` / `f_max` using a **reservoir ratio** for the reference storyline:  
  **Reservoir(year) / Reservoir(2024)**. For 2024 this ratio is **1.0**, so hydro GW bands match the anchor after scaling.

**Run:** `scenarios/turkey_reference_2024/ses_main_turkey_reference_2024.run` → **`output_turkey_reference_2024/`**

### 4.2 Reference 2030 and 2035

**Files:**  
`scenarios/turkey_reference_2030/ses_main_turkey_reference_2030.dat`  
`scenarios/turkey_reference_2035/ses_main_turkey_reference_2035.dat`

**Updated relative to the anchor:**

| Topic | What is used |
|-------|----------------|
| **Installed capacity** | Turkish **projection** totals (GW) for coal, gas, nuclear, hydro, wind, solar, and “other”, mapped into SES technologies (e.g. gas → `CCGT`, coal split → `COAL_US` / `COAL_IGCC` using the **same shares as in the 2024 reference case**). |
| **Hydro GW** | Total installed hydro from the projection table is split between dam and river classes using **2024 dam/river shares**, then multiplied by a **reservoir index ratio vs 2024** (normal-year hydro availability narrative). |
| **Electricity demand** | Sectoral **2030** or **2035** columns (TWh → GWh) for the four electricity sectors in `end_uses_demand_year`. |
| **Fuel prices (fossil)** | **`scenarios/turkey_weo2025_cps_fuel_operations_2030.dat`** or **`turkey_weo2025_cps_fuel_operations_2035.dat`**: **IEA World Energy Outlook 2025**, **Current Policies Scenario (CPS)** wholesale fossil fuel assumptions, converted to EUR/MWh thermal and then to `c_op`, with CCS premia documented in those files. |

**Runs:**  
`ses_main_turkey_reference_2030.run` → `output_turkey_reference_2030/`  
`ses_main_turkey_reference_2035.run` → `output_turkey_reference_2035/`

---

## 5. Turkey drought scenarios

Drought variants use the **same sectoral electricity demand and non-hydro capacity structure** as the **reference scenario of the same year**, unless noted in the file comments. The **difference is hydro availability**:

| Storyline | Hydro scaling idea (see each `.dat` for numeric ratios) |
|-----------|---------------------------------------------------------|
| **Reference year-hydro** | Uses **normal** reservoir index: **Reservoir(year) / Reservoir(2024)**. |
| **Drought year-hydro** | Uses **stress** index: **Min reservoir (year) / Reservoir(2024)** (drought / low inflow). |

### 5.1 Files and outputs

| Scenario | Data file | Output directory (via `.run`) |
|----------|-----------|--------------------------------|
| Drought 2024 | `scenarios/turkey_drought_2024/ses_main_turkey_drought_2024.dat` | `output_turkey_drought_2024/` |
| Drought 2030 | `scenarios/turkey_drought_2030/ses_main_turkey_drought_2030.dat` | `output_turkey_drought_2030/` |
| Drought 2035 | `scenarios/turkey_drought_2035/ses_main_turkey_drought_2035.dat` | `output_turkey_drought_2035/` |

- **2030 / 2035** drought files also include the same **WEO 2025 CPS** fuel snippets as the corresponding reference year (`turkey_weo2025_cps_fuel_operations_2030.dat` / `_2035.dat`).
- **2035 drought** special case: comments state that **minimum reservoir** for 2035 is **negative**; the file **clamps** hydro `f_min` / `f_max` to **0** for both dam and river classes (extreme drought narrative, but can stress feasibility of the rest of the system).

---

## 6. Batch runs, exports, and dashboard

| Mechanism | Role |
|-----------|------|
| **`run_all_turkey_scenarios.sh`** | Runs the six short year-stamped `.run` files (reference and drought 2024 / 2030 / 2035) and then `build_scenario_dashboard_data.py`. It does **not** automatically run the full **`ses_main_turkey_reference_case.run`**; run that separately when you need `output_turkey_reference_case/`. |
| **`scenarios/common/export_standard_outputs.run`** | Standard text outputs (`sets.txt`, `params.txt`, `total_output.txt`, costs, GWP, `f_mult.txt`, `End_Uses.txt`, `losses.txt`, `scenario_metrics.txt`, etc.) under `OUTPUT_DIR`. Also **`include`s** `export_sankey.run`. |
| **`scenarios/common/export_sankey.run`** | Writes **`OUTPUT_DIR/sankey/input2sankey.csv`** for Sankey diagrams (same logic as historically inlined in the Turkey reference case). |
| **`build_scenario_dashboard_data.py`** | Aggregates scenario folders into `scenario_dashboard_data.json` / `.js` for `scenario_dashboard.html` (including Sankey links when the CSV exists and has rows). |

---

## 7. Practical notes and known limitations

1. **Feasibility**  
   Some year/story combinations can hit **presolve infeasibility** (e.g. conflicting bounds on nuclear or hydro units vs capacity). When the model does not solve to a feasible optimum, post-solve exports may be missing or **Sankey CSVs may contain only the header row**. Fixing that requires adjusting the corresponding `.dat` (bounds, demands, or other assumptions), not the export scripts alone.

2. **“2024” vs demand year**  
   The **reference case** uses **2025-sector electricity (GWh)** as the documented near-term electricity demand while capacities are anchored to a **2024 Turkey** reading. Year-stamped files (2030 / 2035) use projection tables for those target years.

3. **Paths in comments**  
   Some `.dat` headers mention screenshot paths on a developer machine. For reproducibility, treat the **numeric tables and ratios** in the files as the source of truth, or replace those comments with your own archived references.

---

## 8. Quick file map

| Role | Path |
|------|------|
| Anchor Turkey data | `scenarios/turkey_reference_case/ses_main_turkey_reference_case.dat` |
| Full reference run | `scenarios/turkey_reference_case/ses_main_turkey_reference_case.run` |
| Reference by year | `scenarios/turkey_reference_2024|2030|2035/ses_main_turkey_reference_*.dat` + `.run` |
| Drought by year | `scenarios/turkey_drought_2024|2030|2035/ses_main_turkey_drought_*.dat` + `.run` |
| WEO 2025 CPS fuels | `scenarios/turkey_weo2025_cps_fuel_operations_2030.dat`, `..._2035.dat` |
| Shared exports | `scenarios/common/export_standard_outputs.run`, `export_sankey.run` |

This should be enough for a reader to see **what was updated**, **what is inherited from the anchor**, and **what each scenario run uses** end to end.
