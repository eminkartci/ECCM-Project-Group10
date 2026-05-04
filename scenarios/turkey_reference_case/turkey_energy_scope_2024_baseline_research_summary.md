# Turkey EnergyScope 2024 Baseline Dataset Summary

## Executive Summary

The year **2024** is selected as the most suitable historical benchmark year for the Turkey EnergyScope baseline model. It offers a more representative operating environment than adjacent years because:

- **2023** was materially affected by the February earthquake, influencing regional demand, industrial output, and infrastructure operations.
- **2025** experienced drought-related hydro variability, which can distort generation mix and water-dependent availability assumptions.
- **2024** reflects a comparatively stable system year with continued renewable expansion, mature installed capacity growth, and fewer extraordinary shocks.

Therefore, 2024 provides a balanced calibration year for historical modelling before future scenario analysis (2035 / 2053).

---

## Core Dataset Table

| Category | 2024 Value | Unit | Reference | Explanation |
|---|---:|---|---|---|
| Annual Electricity Demand / Generation | 341.848 | TWh | TEİAŞ yearly statistics (Jan-Dec 2024) | Used as closest full-year system demand proxy for baseline balancing. |
| Total Installed Capacity | 115,382 | MW | TEİAŞ installed capacity chart (31 Dec 2024) | Total national power plant fleet available to system. |
| Natural Gas Capacity | 25,384 | MW | TEİAŞ chart (22%) | Flexible thermal generation, balancing and mid-merit resource. |
| Coal Capacity (total) | 21,922 | MW | TEİAŞ chart (lignite + imported + hard coal) | Baseload and legacy thermal fleet. |
| Hydro Capacity (total) | 32,307 | MW | TEİAŞ chart (reservoir + run-of-river) | Dispatchable renewable and seasonal balancing resource. |
| Solar Capacity | 19,615 | MW | TEİAŞ chart (17%) | Rapidly growing variable renewable source. |
| Wind Capacity | 12,692 | MW | TEİAŞ chart (11%) | Main variable renewable balancing with solar complementarity. |
| Biomass Capacity | 2,308 | MW | TEİAŞ chart | Firm renewable generation source. |
| Geothermal Capacity | 1,154 | MW | TEİAŞ chart | Stable baseload renewable source. |
| Imports | 2.64 | TWh | User trade estimate using 2024 ratios | Cross-border electricity inflow assumption. |
| Exports | 3.61 | TWh | User trade estimate using 2024 ratios | Cross-border electricity outflow assumption. |
| Net Trade | +0.97 | TWh | Derived | Turkey modeled as net exporter in 2024 estimate. |

---

## Generation Mix (2024)

| Technology | Share | Notes |
|---|---:|---|
| Coal Total | 35% | Includes lignite, hard coal, imported coal |
| Natural Gas | 19% | Flexible thermal production |
| Hydro Total | 22% | Reservoir + run-of-river |
| Wind | 11% | Strong coastal resource contribution |
| Solar | 7% | Increasing utility + distributed generation |
| Biomass | 3% | Dispatchable renewable |
| Geothermal | 3% | Mainly western Anatolia |

---

## Indicative Fuel Price Assumptions (2024)

| Fuel | Value | Unit | Reference | Explanation |
|---|---:|---|---|---|
| Natural Gas | 38 | €/MWh_th | BOTAŞ / EU normalized gas benchmarks | Delivered system thermal fuel estimate. |
| Imported Coal | 22 | €/MWh_th | API2 / Newcastle benchmarks + logistics | CIF adjusted imported coal cost. |
| Domestic Lignite | 14 | €/MWh_th | Turkey domestic mining economics | Lower calorific domestic fuel. |
| Hard Coal | 26 | €/MWh_th | Import-linked industrial estimate | Higher quality coal than lignite. |
| Diesel / Fuel Oil | 78 | €/MWh_th | Brent-linked refinery estimate | Backup / peaking fuel. |
| Biomass | 18 | €/MWh_th | Bioenergy benchmark studies | Agricultural residue / local feedstock estimate. |

---

## Hydro Availability / Precipitation Context

| Year | Assessment | Modelling Relevance |
|---|---|---|
| 2023 | Recovery / transition year | Less ideal due to earthquake-year disruptions. |
| 2024 | Balanced reference year | Better neutral benchmark for hydro normalization. |
| 2025 | Drought affected | Hydro output may understate normal water availability. |

Recommendation: Use **2024 hourly hydro profile** with optional sensitivity scenarios for dry / wet years.

---

## Grid Constraints (Initial Modelling Assumptions)

| Constraint Area | Initial Treatment | Future Upgrade |
|---|---|---|
| East-West Congestion | Not explicitly modeled | Add zonal transmission constraints |
| Curtailment Risk | Implicitly absorbed | Add renewable curtailment module |
| Reserve Margin | Thermal + hydro flexibility | Add adequacy constraint |
| Interconnections | Net trade annualized | Hourly border trading model |
| Storage | External scenario input | Add batteries / pumped hydro optimization |

---

## Why 2024 Is the Preferred Base Case

1. Representative macro and electricity system year.
2. Avoids major structural shock of 2023 earthquake.
3. Avoids drought distortion visible in 2025 hydro conditions.
4. Strong renewable deployment already visible.
5. Installed capacity data is complete and recent.
6. Excellent bridge year for scenario modeling toward 2035 and 2053.

---

## Recommended Next Steps

### Phase 2 Dataset Upgrade

- Integrate hourly demand profile
- Integrate hourly solar profile
- Integrate hourly wind profile
- Integrate hourly hydro profile
- Add CAPEX / OPEX technology tables
- Add emissions factors
- Add carbon pricing scenarios
- Add Akkuyu nuclear scenarios
- Add storage expansion pathways
- Build 2035 MENR and 2053 Net Zero scenarios

