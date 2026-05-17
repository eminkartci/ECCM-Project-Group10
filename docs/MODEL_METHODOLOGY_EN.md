# Turkey EnergyScope (SES) — Model Methodology and Development History

This document reconstructs **how the project evolved** from the initial Swiss EnergyScope (SES) setup to the current **Turkey electricity-focused** scenario suite. It is based on the full Git history (April–May 2026), `model/ses_main.mod`, scenario `.dat` / `.run` files, and existing project notes.

**Related files:** `SES_proje_rehberi_TR.md` (model mechanics), `docs/TURKEY_REFERENCE_AND_DROUGHT_SCENARIOS_EN.md` (scenario file map), `scenarios/turkey_reference_case/turkey_energy_scope_2024_baseline_research_summary.md` (2024 data sources).

---

## 1. Executive summary

| Layer | What it is | Turkey adaptation |
|--------|------------|-------------------|
| **Core formulation** | Stefano Moret (2015) SES MILP in AMPL | Unchanged structure; three small guards added in `ses_main.mod` |
| **Baseline data** | Swiss full energy system (`scenarios/baseline/ses_main.dat`) | Included as template; most non-electric demands zeroed |
| **Anchor scenario** | — | `scenarios/turkey_reference_case/ses_main_turkey_reference_case.dat` |
| **Year scenarios** | — | Reference / drought / drought+emcap for 2024, 2030, 2035 |
| **Objective** | Minimize **total system cost** | Same; optional `gwp_limit` for emcap variants |
| **Solver** | Gurobi via AMPL | Unchanged |

The Turkey work is **not a new optimization theory**; it is **calibration and scenario layering** on SES: TEİAŞ/MENR-aligned capacities and demand, IEA WEO 2025 STEPS fuel paths, merit-order thermal tiers, and hydro availability narratives (normal vs drought vs emission cap).

---

## 2. Chronological development (Git history)

| Date | Commit | What changed | Purpose |
|------|--------|--------------|---------|
| 2026-04-11 | `1f1b7a8` | Initial repo: SES model, Swiss baseline + **Swiss drought** outputs, Sankey, comparison scripts | Course baseline: demonstrate drought by **shutting hydro capacity to zero** in Swiss data |
| 2026-04-24 | `7dc53b2` | Installation guide (TR) | Reproducibility |
| 2026-04-24 | `0ae616e` | Reorganize into `model/`, `scenarios/baseline/`, `scenarios/drought/` | Clear run paths |
| 2026-05-04 | `39444c3` | First **Turkey reference case**: TEİAŞ 2024 capacities, sector electricity demand, fuel `c_op`, research summary, outputs | National electricity calibration anchor |
| 2026-05-07 | `da8846b` | Multi-year Turkey `.run` files, `run_all_turkey_scenarios.sh`, dashboard pipeline | Batch reference/drought 2024/2030/2035 |
| 2026-05-07 | `9036d85` | Fix AMPL `include` syntax in shared exports | Reliable post-solve CSV/text export |
| 2026-05-11 | `03566b5` | **Model guard** `heat_lt_input_demand_sum`; Sankey sector split; shared `export_*` modules; dashboards | Turkey runs electricity-only (no low-T heat demand) without divide-by-zero |
| 2026-05-11 | `f8c07c3` | Dashboard electricity supply table aligned with Sankey | Consistent reporting |
| 2026-05-11 | `75da5e8` | TEİAŞ-scaled **341.85 TWh** 2024 demand; **WEO 2025 STEPS** fuel files; Sankey hydro labels | Match observed 2024 generation order; unified fossil price path |
| 2026-05-15 | `1e8870a` | Hydro fix: reservoir ratio on **`c_p_t`**, not `f_min`/`f_max`; `gwp_cap` constraint; **drought_emcap** scenarios; pumped-hydro guard when no new dams | “Same turbines, less water”; enable emission-capped sensitivity |
| 2026-05-17 | `54b9404` | Dashboard data refresh after batch run | Reporting |
| 2026-05-17 | `b31232d` | **5-tier thermal dispatch** calibration to TEİAŞ/MENR mix; monthly wind/PV `c_p_t`; biomass remapped to electricity; MENR hydro share constraints (temporary) | Coal ~35%, gas ~19%, hydro/wind/solar shares |
| 2026-05-17 | `7f7d21e` | **Removed** `turkey_menr_hydro_targets.dat` and Sankey hydro split hacks | Let optimizer set hydro dispatch; simplify exports |
| 2026-05-17 | `eac5159` | Monthly supply export writes all 12 months | Dashboard time series completeness |

---

## 3. Mathematical formulation (unchanged SES core)

### 3.1 Objective function

```ampl
minimize obj: TotalCost;
```

**Total cost** (annual, MCHF):

\[
\text{TotalCost} = \sum_{i \in \text{TECHNOLOGIES}} \bigl( \tau_i \, C_{\text{inv},i} + C_{\text{maint},i} \bigr) + \sum_{j \in \text{RESOURCES}} C_{\text{op},j}
\]

| Symbol | Meaning | Data source |
|--------|---------|-------------|
| \(\tau_i\) | Capital annuity factor from `i_rate`, `lifetime[i]` | `ses_main.dat` |
| \(C_{\text{inv},i}\) | \(=\) `c_inv[i] * F_Mult[i]` | Technology table |
| \(C_{\text{maint},i}\) | \(=\) `c_maint[i] * F_Mult[i]` | Technology table |
| \(C_{\text{op},j}\) | \(\sum_t c\_op[j,t] \cdot F\_Mult\_t[j,t] \cdot period\_duration[t]\) | Fuel prices × dispatch |

**We did not change the objective** for Turkey. Emission-capped scenarios still minimize cost subject to `TotalGWP <= gwp_limit` (added in `1e8870a`).

### 3.2 Decision variables (inputs to the optimizer)

| Variable | Role |
|----------|------|
| `F_Mult[i]` | Installed capacity of technology/resource *i* (GW scale) |
| `F_Mult_t[i,t]` | Monthly operating level |
| `Number_Of_Units[i]` | Integer count of `ref_size` blocks |
| `Storage_In/Out`, `Losses` | Storage and network losses |
| `Share_Mobility_Public`, `Share_Freight_Train`, `Share_Heat_Dhn` | End-use splits (inactive when demands are zero) |
| `TotalCost`, `TotalGWP` | Accounting variables |

### 3.3 Key parameters (what we feed as data)

| Parameter group | Swiss baseline | Turkey override |
|-----------------|----------------|-----------------|
| `end_uses_demand_year[i,s]` | All end-uses by sector | **Only `ELECTRICITY`**; others set to 0 |
| `f_min`, `f_max` | Swiss capacities | TEİAŞ / projection GW by technology |
| `c_op[resource,t]` | Swiss CHF/GWh | WEO 2025 STEPS EUR/MWh\_th → MCHF/GWh |
| `c_p`, `c_p_t` | Swiss profiles | Turkey hydro monthly shape; scaled wind/PV |
| `layers_in_out` | Swiss matrix | Biomass remapped to `ELECTRICITY` layer |
| `avail` | Resource limits | `ELEC_EXPORT`, `WOOD` raised for biomass |
| `fmin_perc`, `fmax_perc` | Technology share bounds | Coal tier caps; optional biomass floor |
| `gwp_limit` | Default `1e10` (no cap) | `112000`–`128000` ktCO₂-eq/y in emcap scenarios |
| `loss_coeff`, `period_duration`, `lighting_month`, `heating_month` | From baseline | Inherited (lighting/heating inactive) |

### 3.4 Main constraint families

| Constraint | Equation idea | Turkey relevance |
|------------|---------------|------------------|
| `end_uses_input` | Annual demand aggregation | Sector electricity only |
| `end_uses_t` | Annual → monthly power + losses | Flat electricity; no heat/mobility layers active |
| `layer_balance` | Energy balance per layer × month | Core dispatch |
| `size_limit` | `f_min ≤ F_Mult ≤ f_max` | **Primary calibration knob** (GW bands) |
| `capacity_factor` / `capacity_factor_t` | Annual/monthly output caps | Hydro, wind, solar shapes |
| `resource_availability` | Fuel/import limits | Export cap, wood for biomass |
| `f_max_perc` / `f_min_perc` | Min/max share within an end-use type | Coal tiers; biomass 3% floor |
| `gwp_cap` | `TotalGWP ≤ gwp_limit` | Emcap scenarios only |
| `storage_*`, `hydro_dams_shift`, `extra_grid`, etc. | Swiss-specific structure | Mostly inherited; pumped hydro guarded when no new dams |

---

## 4. Data sources and where they are used

### 4.1 Primary external data

| Source | Used for | File(s) |
|--------|----------|---------|
| **TEİAŞ 2024** statistics | Installed capacity (GW), gross generation (~341.85 TWh), technology shares | `turkey_energy_scope_2024_baseline_research_summary.md`, `ses_main_turkey_reference_case.dat`, `ses_main_turkey_reference_2024.dat` |
| **Sector electricity table** (Mesken / Hizmet / Sanayi / Ulaştırma) | `end_uses_demand_year["ELECTRICITY", *]` | Reference case (348 TWh era) → later **TEİAŞ 341 848 GWh** split |
| **Projection table** (2030 / 2035) | Kömür, Gaz, Nükleer, Hidrolik, Rüzgar, Güneş, Diğer GW | `ses_main_turkey_reference_2030.dat`, `_2035.dat`, matching drought files |
| **Reservoir table** (user-provided: Reservoir, Min Reserv per year) | Hydro narrative ratios | Comments + `c_p_t` in drought years; 2024 uses ratio 1.0 |
| **IEA WEO 2025 STEPS** (Berkay fuel forecast) | Oil, gas, steam coal, lignite EUR/MWh\_th | `turkey_berkay_steps_fuel_prices.dat`, `turkey_weo2025_steps_fuel_operations_2030.dat`, `_2035.dat` |
| **IEA WEO 2025 CPS** (optional) | Higher fossil path sensitivity | `turkey_weo2025_cps_fuel_operations_*.dat` (not in default batch) |
| **Swiss SES baseline** | Technology costs, `layers_in_out`, sets, infrastructure | `scenarios/baseline/ses_main.dat` via `include` |

### 4.2 Scenario inheritance chain

```
scenarios/baseline/ses_main.dat
    └── scenarios/turkey_reference_case/ses_main_turkey_reference_case.dat   ← ANCHOR
            ├── turkey_reference_2024 / drought_2024 / drought_emcap_2024
            ├── turkey_reference_2030 / drought_2030 / drought_emcap_2030
            └── turkey_reference_2035 / drought_2035 / drought_emcap_2035
```

Each year file **`include`s the anchor**, then overrides only deltas (capacities, demand, fuels, hydro `c_p_t`).

---

## 5. What we changed, and why

### 5.1 Core model file (`model/ses_main.mod`)

| Change | Commit | Why |
|--------|--------|-----|
| `heat_lt_input_demand_sum` + conditional in `op_strategy_decen_1_linear` | `03566b5` | Turkey zeros heat demands; avoid 0/0 in decentralized heat constraint |
| `param gwp_limit` + `subject to gwp_cap` | `1e8870a` | Optional binding emission cap without changing objective |
| `storage_level_hydro_dams` conditional on `f_max["NEW_HYDRO_DAM"] > f_min[...]` | `1e8870a` | When new dam build is locked at 0, pumped storage RHS must be 0 (feasibility) |

**Not changed:** objective, layer balance structure, cost accounting, Swiss mobility/DHN logic (inactive via zero demand).

### 5.2 Swiss drought vs Turkey drought

| Aspect | Swiss (`scenarios/drought/ses_main_drought.dat`) | Turkey drought |
|--------|--------------------------------------------------|----------------|
| Mechanism | `f_min = f_max = 0` for all hydro tech | Reduced **`c_p_t`** (monthly availability) for `HYDRO_DAM` / `HYDRO_RIVER` |
| Interpretation | No hydro **capacity** in the system | Same **installed GW**, less water / inflow |
| Scope | Full Swiss energy system | Electricity-only Turkey |

### 5.3 Turkey anchor calibration (`ses_main_turkey_reference_case.dat`)

Evolution:

1. **v1 (`39444c3`):** Simple TEİAŞ GW mapping, indicative €/MWh fuels, 348 TWh sector demand, loose `f_max`.
2. **v3–v4 (`75da5e8`, `b31232d`):** TEİAŞ **341.85 TWh** demand; STEPS fuels; **5-tier thermal dispatch** (see below).
3. **v5 (current):** Merit-order tiers aligned to **TEİAŞ 2024 generation mix** (~35% coal, ~19% gas).

**5-tier thermal dispatch (purpose: merit order without changing SES topology)**

| Tier | Technology | Fuel resource | Price role |
|------|------------|---------------|------------|
| 1 | `COAL_IGCC` | `COAL` | Baseload coal (lowest coal MC) |
| 2 | `COAL_US` | `COAL` | Mid coal |
| 3 | `CCGT` | `NG` | Mid gas |
| 4 | `COAL_IGCC_CCS` | `COAL_CCS` | Peak coal tier |
| 5 | `CCGT_CCS` | `NG_CCS` | Peaker gas |

CCS-named technologies are **repurposed as price steps**: `c_inv` / `c_maint` / `gwp_op` equalized with non-CCS twins so **only `c_op` drives dispatch**.

Fuel price ratios (relative to steam coal base `P`):

- `NG` = 1.40 × P  
- `COAL_CCS` = 1.12 × P  
- `NG_CCS` = 1.58 × P  

### 5.4 Other Turkey-specific data edits

| Edit | Purpose |
|------|---------|
| Nuclear `f_min = f_max = 0` in 2024 anchor | No operating nuclear in 2024 calibration |
| `NEW_HYDRO_*` locked to 0 | No new-build hydro in baseline storyline |
| Non-electric `end_uses_demand_year` := 0 | **Electricity-only** system boundary |
| `IND_COGEN_WOOD` moved to `ELECTRICITY` layer | Baseline CHP is heat-led; unusable without heat demand |
| `avail["WOOD"]` increased | Allow ~3% biomass electricity (TEİAŞ share) |
| `fmin_perc["IND_COGEN_WOOD"] := 0.03` | Floor on biomass share |
| Wind/PV `c_p_t` rescaled | Swiss profiles too low vs Turkey (~34% / ~14% annual CF) |
| `avail["ELEC_EXPORT"] := 3500` GWh/y | Net export allowance |
| `fmax_perc` on coal tiers := 0.25 each | Prevent one coal tier from taking 100% of thermal |

### 5.5 Hydro modeling timeline

| Stage | Method | Issue addressed |
|-------|--------|-----------------|
| Early Turkey + 2024 year files | Reservoir ratio on **`f_min`/`f_max`** | Incorrectly reduced **turbine count** instead of energy |
| After `1e8870a` | Ratio on **`c_p_t`** (same GW, less energy) | Physical interpretation |
| Drought scenarios | `Min Reserv(year) / Reservoir(2024)` applied to drought `c_p_t` | Stress year hydro |
| Reference 2030/2035 | Comments specify `Reservoir(year)/Reservoir(2024)` on `c_p_t` | **Check numeric blocks**: drought 2030/2035 have scaled values; reference year files may still list unscaled 2024 monthly factors—verify before reporting |
| MENR `fmin_perc` hydro shares (`b31232d`) | Force dam/river split vs MENR table | **Removed** in `7f7d21e`—conflicted with optimizer flexibility |

**2024 reference vs drought:** Both use reservoir ratio **1.0** on hydro bounds in the year `.dat` files; with identical demand they coincide unless `c_p_t` is differentiated.

### 5.6 Emission-capped scenarios (`turkey_drought_emcap_*`)

| Year | Base | `gwp_limit` (ktCO₂-eq/y) | Intent |
|------|------|--------------------------|--------|
| 2024 | `turkey_drought_2024` | 112 000 | ~25% below drought-2024 baseline GWP (~148 725) |
| 2030 | `turkey_drought_2030` | 124 000 | Progressive tightening |
| 2035 | `turkey_drought_2035` | 128 000 | Policy-style cap on top of drought hydro |

Same cost objective; cap binds via `gwp_cap`.

### 5.7 Exports and dashboards (not part of MILP, but part of methodology)

| Component | Role |
|-----------|------|
| `scenarios/common/export_standard_outputs.run` | `f_mult`, costs, GWP, metrics |
| `export_sankey.run` | `sankey/input2sankey.csv` |
| `export_monthly_dashboard.run` | 12-month supply CSV |
| `build_scenario_dashboard_data.py` | `scenario_dashboard_data.json` |
| `run_all_turkey_scenarios.sh` | Nine Turkey runs + dashboard build |

---

## 6. Scenario matrix (current)

| Scenario | Demand year | Fuels | Hydro | Extra |
|----------|-------------|-------|-------|-------|
| `turkey_reference_2024` | TEİAŞ 341.85 TWh split | Anchor STEPS 2024 | Normal (ratio 1.0) | — |
| `turkey_reference_2030` | Projection TWh → GWh | `turkey_weo2025_steps_fuel_operations_2030.dat` | Normal reservoir narrative | Nuclear 4.8 GW |
| `turkey_reference_2035` | Projection | STEPS 2035 | Normal | Nuclear ~7.2 GW |
| `turkey_drought_*` | Same as reference year | Same | **Drought** `c_p_t` (min reservoir) | — |
| `turkey_drought_emcap_*` | Same as drought | Same | Same | `gwp_limit` binding |

Output directories: `output_turkey_<scenario>/`.

---

## 7. Step-by-step workflow (how to reproduce)

1. **Install** AMPL + Gurobi (see `KURULUM_VE_CALISTIRMA_REHBERI.md`).
2. **Understand the core** — read `model/ses_main.mod` and `SES_proje_rehberi_TR.md`.
3. **Run Swiss baselines** (optional): `ampl scenarios/baseline/ses_main.run`, `ampl scenarios/drought/ses_main_drought.run`.
4. **Calibrate anchor** — edit `ses_main_turkey_reference_case.dat` (capacities, tiers, fuels, renewables).
5. **Set year deltas** — edit `ses_main_turkey_reference_20XX.dat` / `turkey_drought_20XX.dat`.
6. **Solve one scenario** — e.g. `ampl scenarios/turkey_reference_2024/ses_main_turkey_reference_2024.run`.
7. **Batch** — `./run_all_turkey_scenarios.sh` (clears outputs, logs under `scenario_run_logs/`).
8. **Visualize** — open `scenario_dashboard.html` (data from `build_scenario_dashboard_data.py`).

---

## 8. Limitations and assumptions (explicit)

1. **Electricity-only boundary** — heat, mobility, hydrogen chains exist in the model but are **zeroed**; infrastructure (`GRID`, `DHN`, …) still follows Swiss coupling rules where active.
2. **Monthly resolution** — 12 periods, not hourly; drought is a **scaled availability**, not a sequential reservoir simulation.
3. **No transmission zones** — Turkey is a single node; congestion and curtailment are not explicit (see research summary).
4. **Technology aggregation** — e.g. all gas → `CCGT` tiers; coal split into three SES coal technologies.
5. **CCS tiers are economic fiction** — labels retained from SES; used only for **dispatch ordering**.
6. **Feasibility** — tight bounds + high demand can cause Gurobi infeasibility; check `scenario_run_error.txt` and logs.
7. **Demand vs label year** — Anchor default demand block is documented as near-term; 2024 files override with TEİAŞ 2024 TWh.

---

## 9. Quick reference: files to edit for each modeling goal

| Goal | Edit |
|------|------|
| Change 2024 generation mix / merit order | `ses_main_turkey_reference_case.dat` (GW bands, tier ratios, `c_op`) |
| Change 2030/2035 fleet | `ses_main_turkey_reference_2030.dat`, `_2035.dat` |
| Change sector demand | Year-specific `.dat` `end_uses_demand_year` |
| Drought severity | Drought `.dat` `c_p_t` for hydro (min reservoir scaling) |
| Carbon policy | `turkey_drought_emcap_*.dat` → `gwp_limit` |
| Fossil price path | `turkey_berkay_steps_fuel_prices.dat`, `turkey_weo2025_steps_fuel_operations_*.dat` |
| Change equations / objective | `model/ses_main.mod` (only if formulation must change) |

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| **SES** | Swiss EnergyScope MILP |
| **Layer** | Energy carrier or end-use balance (e.g. `ELECTRICITY`, `NG`) |
| **`F_Mult`** | Installed capacity variable (GW) |
| **`c_p_t`** | Monthly capacity factor cap on operation |
| **STEPS** | IEA WEO 2025 Stated Policies Scenario |
| **TEİAŞ** | Turkish electricity transmission/system operator statistics |
| **Anchor** | `ses_main_turkey_reference_case.dat` |

---

*Document generated from repository state as of commit `eac5159` (May 2026). For scenario file paths only, see `docs/TURKEY_REFERENCE_AND_DROUGHT_SCENARIOS_EN.md`.*
