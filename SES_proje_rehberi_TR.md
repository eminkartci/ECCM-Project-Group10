# Swiss-EnergyScope (SES) — Project Guide (English)

This document is based on `model/ses_main.mod`, `scenarios/baseline/ses_main.dat`, and `scenarios/baseline/ses_main.run`, and is prepared to explain **what the model in this folder represents** and **how it works**. The model is the **Swiss-EnergyScope (SES)** MILP (mixed-integer linear programming) formulation written by Stefano Moret in 2015; it is used with Swiss energy system data as course material.

---

## 1. Summary: What exactly is being modeled?

**Modeled problem:** Over a one-year horizon, select **which energy resources and conversion technologies operate at what capacity** to satisfy **fixed (data-given) annual demands**; under monthly **power balances**, **storage**, **grid and district-heating losses**, and a set of **policy/physical constraints**, the model minimizes **total cost (discounted investment + operation + fuel)**.

This is **not a climate or atmospheric dynamics model**; it is an **energy-economy optimization** model. Its climate linkage is limited to defined **GWP (global warming potential)** emission terms that can be calculated optionally; **the objective function is cost minimization**, and there is no carbon objective term in this version.

---

## 2. Roles of the files

| File | Role |
|--------|-----|
| `model/ses_main.mod` | **Sets, parameters, decision variables, constraints, and objective** in AMPL (mathematical model). |
| `scenarios/baseline/ses_main.dat` | Numerical **data** file for the baseline scenario: sector demands, technology costs, `layers_in_out` matrix, monthly durations, capacity factors, etc. |
| `scenarios/baseline/ses_main.run` | Solves the baseline scenario and writes **text and CSV outputs** under `output/`. |
| `scenarios/drought/ses_main_drought.dat` | Numerical data file for the drought scenario. |
| `scenarios/drought/ses_main_drought.run` | Solves the drought scenario and writes output under `output_drought/`. |

Execution is typically done inside AMPL: `ampl scenarios/baseline/ses_main.run` (requires Gurobi license and AMPL installation). For drought: `ampl scenarios/drought/ses_main_drought.run`.

---

## 3. Time and geographic scope

- **Time:** 12 **months** (`PERIODS := 1..12`). For each month, `period_duration[t]` gives duration in **hours** (e.g., January 744 hours); yearly total is approximately 8760 hours.
- **Geography:** Dataset and technology naming are tailored to the **Swiss** energy system; mathematically, the model can be adapted to **any country** with similar data.
- **Demand:** Annual energy demands are provided by **sector**; the model converts them into monthly **power** demand (GW-like scale).

---

## 4. Units (from data file header)

Default units (as defined at the top of `scenarios/baseline/ses_main.dat`):

- Energy: **GWh**
- Power: **GW**
- Cost: **MCHF** (million Swiss francs)
- Time: **hours (h)**
- Passenger transport: **Mpkm** (million passenger-km)
- Freight transport: **Mtkm** (million ton-km)

---

## 5. Core concept: "Layers" (`LAYERS`)

The model balances energy and services through **layers**:

- **Resources (`RESOURCES`):** Imported electricity, fuels (gasoline, diesel, natural gas, coal, uranium, waste, H2, ...), exports (`ELEC_EXPORT`), etc.
- **End-use types (`END_USES_TYPES`):** For example `ELECTRICITY`, `HEAT_HIGH_T`, `HEAT_LOW_T_DHN`, `HEAT_LOW_T_DECEN`, `MOB_PUBLIC`, `MOB_PRIVATE`, `MOB_FREIGHT_RAIL`, `MOB_FREIGHT_ROAD`.

The **`LAYERS`** set is the union of resources (excluding imported biofuel and export) and end-use layers. For each period `t`, a **layer balance** is written: technology and resource outputs/inputs + storage - demand = 0.

The `layers_in_out[i, l]` matrix gives the **net contribution** to layer `l` per **unit output** (reference: 1 GW main output of the technology, or unit mobility output): positive = production/output, negative = consumption/input. This lets the model encode **efficiency** and **multi-output** processes (CHP, heat pumps) in a single table.

---

## 6. Sectors and demand input

`SECTORS`: `HOUSEHOLDS`, `SERVICES`, `INDUSTRY`, `TRANSPORTATION`.

`end_uses_demand_year[i, s]`: **annual demand** for each end-use type `i` and sector `s` (GWh or transport unit). For example, electricity demand is distributed across households/services/industry; passenger and freight mobility are fully under **TRANSPORTATION**.

The model aggregates annual demand with `End_Uses_Input[i] = sum_s end_uses_demand_year[i,s]`, then converts it into **monthly power** demand through `end_uses_t` constraints:

- **Lighting** and **space heating** use seasonal profiles via `lighting_month[t]` and `heating_month[t]` (shares sum to 1 over the year).
- **Low-temperature heat:** demand split between **district heating network (DHN)** and **decentralized** via `Share_Heat_Dhn`.
- **Passenger mobility:** public/private split via `Share_Mobility_Public`.
- **Freight mobility:** rail/road split via `Share_Freight_Train`.

These shares are constrained by **bounds** (e.g., public mobility 30%-50%).

---

## 7. Decision variables (what is chosen?)

In short, the optimization determines:

| Variable (summary) | Meaning |
|------------------|--------|
| `F_Mult[i]` | **Installed capacity** of technology `i` (multiplier relative to reference unit table). |
| `F_Mult_t[i,t]` | **Operating level** in period `t` (monthly; upper-bounded by capacity factors). |
| `Number_Of_Units` | Integer number of units (except infrastructure), discrete size aligned with `ref_size`. |
| `Storage_In/Out` | Storage charge/discharge powers. |
| `Share_*` | Heating and mobility splits. |
| `Y_Solar_Backup` | Binary selector of a **single** backup technology for solar thermal. |
| `Losses` | Grid/DHN losses. |

**Objective:** minimize `TotalCost`:

\[
\text{TotalCost} = \sum_{i \in \text{TECH}} \left( \tau_i \, C_{\text{inv},i} + C_{\text{maint},i} \right) + \sum_j C_{\text{op},j}
\]

Here, `tau[i]` is the annualization (annuity) factor of capital cost using discount rate `i_rate` and lifetime `lifetime[i]`.

---

## 8. Main constraint groups (from `.mod` file)

1. **Capacity and capacity factor:** `F_Mult_t[i,t] <= F_Mult[i] * c_p_t[i,t]` and annual energy upper bound via `c_p[i]`.
2. **Layer balance:** for each `l`, `t`, production + net storage - `End_Uses[l,t] = 0`.
3. **Resource availability:** annual resource consumption <= `avail[i]`.
4. **Storage:** layer compatibility (`storage_eff_in/out`), no simultaneous charge/discharge within period (binary `y_sto_in`, `y_sto_out`), state equation with **cyclic year** (`prev(t)`).
5. **Losses:** `Losses[i,t]` as `loss_coeff[i]` fraction of energy entering the layer (e.g., electricity 7%, DHN 5%).
6. **Technology shares:** annual energy share limits in each end-use layer via `fmin_perc` / `fmax_perc`.
7. **Decentral low-temperature operation + solar backup:** linearized constraints (`X_Solar_Backup_Aux`, `Y_Solar_Backup`).
8. **Swiss-specific extensions:** seasonal dam storage (`PUMPED_HYDRO` linked with `NEW_HYDRO_DAM`), DHN peak factor (`peak_dhn_factor`), grid cost linked to wind+PV (`extra_grid`), Power-to-Gas unit sizes, efficiency "virtual" technology (`EFFICIENCY`), and smooth private-mobility operation constraint.

---

## 9. What is in the data file? (`scenarios/baseline/ses_main.dat`)

- **Sets:** full lists of technologies and resources (nuclear, CCGT, PV, wind, hydro, geothermal, industrial CHP/boilers, DHN and decentralized heating options, public/private vehicle types, rail/truck freight, storage: `PUMPED_HYDRO`, `POWER2GAS`, infrastructure: `GRID`, `DHN`, H2 routes, gasification, pyrolysis, ...).
- **`layers_in_out`:** each row is a resource or technology; columns are layers - **energy balance and efficiency** are encoded here.
- **Cost and technical parameters:** `c_inv`, `c_maint`, `ref_size`, `f_min`/`f_max`, `lifetime`, `c_p`, `c_p_t` (especially monthly profiles for PV, wind, hydro, solar thermal).
- **Emission factors:** `gwp_op` (operation/resource use), `gwp_constr` (construction, by capacity).
- **Discount rate:** `i_rate := 0.03215`.

---

## 10. What does the run script do? (`scenarios/baseline/ses_main.run`)

1. Loads `model model/ses_main.mod;` and `data scenarios/baseline/ses_main.dat;`.
2. Solver: **Gurobi** (`option solver gurobi`).
3. Solves MILP with `solve;`.
4. Prints sets and parameters into `output/sets.txt`, `output/params.txt` (via temporary `comfile.txt`).
5. Additional reports:
   - `total_output.txt`: annual energy by resource/technology (`sum_t F_Mult_t * period_duration`).
   - `cost_breakdown.txt`, `gwp_breakdown.txt`.
   - `f_mult_t.txt`, `f_mult.txt`, `End_Uses.txt`.
   - Storage files: `PUMPED_HYDRO.txt`, `POWER2GAS.txt`.
   - `losses.txt`, `period_duration.txt`.
   - `output/sankey/input2sankey.csv`: source-target flows for **Sankey diagram** (rows filtered by threshold > 10).

---

## 11. Important notes while reading this model

- **Demand is exogenous:** sector demands are fixed in data; the model **does not endogenously determine demand from economic growth or price elasticity**.
- **MILP nature:** due to `Number_Of_Units` and binary storage/solar-backup terms, the problem is **not purely continuous linear**; the solver uses integer branch-and-bound.
- **`ELECTRICITY` resource:** positive matrix column can be interpreted like imported/external electricity; it appears in the balance equation together with other production and consumption terms.
- **GWP:** `TotalGWP` is defined, but **the objective is cost**; carbon price or emissions cap may not be included as objective/constraint in this version (can be added for scenario studies).

---

## 12. Suggested learning order

1. Read **`SECTORS`** and **`END_USES_INPUT`** in `scenarios/baseline/ses_main.dat` to clarify system boundaries.
2. Pick a technology (e.g., `CCGT` or `DHN_COGEN_GAS`) and inspect its **`layers_in_out`** row to see **which fuel produces which outputs**.
3. In `model/ses_main.mod`, read **`layer_balance`** and **`end_uses_t`** together to build the chain **demand -> balance -> cost**.
4. From `scenarios/baseline/ses_main.run` outputs, track the optimal mix numerically with **`total_output.txt`** and **`cost_breakdown.txt`**.

---

## 13. Source and attribution

In the model header: **Swiss-EnergyScope (SES)**, author **Stefano Moret**, date **01.04.2015**. In the course context, it is used together with Polimi "Energy and Climate Change Modeling" material.

---

*This guide is produced by directly reading `model/ses_main.mod`, `scenarios/baseline/ses_main.dat`, and `scenarios/baseline/ses_main.run` in the repository; solver versions or data updates may cause differences.*
