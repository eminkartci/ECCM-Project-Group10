const pickFolderBtn = document.getElementById("pick-folder-btn");
const reloadBtn = document.getElementById("reload-btn");
const statusEl = document.getElementById("status");
const scenarioTogglesEl = document.getElementById("scenario-toggles");
const solutionStatusEl = document.getElementById("solution-status");
const metricsTableEl = document.getElementById("metrics-table");
const costPivotEl = document.getElementById("cost-pivot");
const techSelectorEl = document.getElementById("tech-selector");
const energySummaryEl = document.getElementById("energy-summary-table");
const sankeyStackEl = document.getElementById("sankey-stack");
const sankeyMasterToggle = document.getElementById("sankey-master-toggle");
const scenariosAllBtn = document.getElementById("scenarios-all");
const scenariosNoneBtn = document.getElementById("scenarios-none");

const costChart = document.getElementById("cost-chart");
const gwpChart = document.getElementById("gwp-chart");
const intensityChart = document.getElementById("intensity-chart");
const energyPriceChart = document.getElementById("energy-price-chart");
const totalEmissionsChart = document.getElementById("total-emissions-chart");
const techChart = document.getElementById("tech-chart");
const enduseChart = document.getElementById("enduse-chart");
const productionChart = document.getElementById("production-chart");
const fuelShareChart = document.getElementById("fuel-share-chart");
const fuelShareTableEl = document.getElementById("fuel-share-table");
const installedCapYearChart = document.getElementById("installed-capacity-year-chart");
const installedCapTableEl = document.getElementById("installed-capacity-table");
const monthlyEnergyPriceChartEl = document.getElementById("monthly-energy-price-chart");
const monthlySupplyStackEl = document.getElementById("monthly-supply-stack");

let projectDirHandle = null;
let scenarios = [];
let expectedScenarios = [];
/** RESOURCES (elektrik/ihracat hariç); ön paket veya klasör taramasında doldurulur */
let fuelResourcesForShare = [];
/** Kurulu güç grafiği — sunucu JSON veya varsayılan sıra */
let installedFuelOrder = [];
let installedFuelLabels = {};

const SCENARIO_COLORS = ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#dc2626", "#0891b2", "#db2777", "#4f46e5"];

const DEFAULT_INSTALLED_FUEL_ORDER = [
  "nuclear",
  "natural_gas",
  "coal",
  "hydro",
  "solar_pv",
  "wind",
  "geothermal",
  "biomass",
  "other_electric"
];

const DEFAULT_INSTALLED_FUEL_LABELS = {
  nuclear: "Nükleer",
  natural_gas: "Doğal gaz (CCGT)",
  coal: "Kömür",
  hydro: "Hidro",
  solar_pv: "Güneş (PV)",
  wind: "Rüzgar",
  geothermal: "Jeotermal",
  biomass: "Biyokütle (odun)",
  other_electric: "Diğer (elektrik)"
};

const INSTALLED_FUEL_SEGMENT_COLORS = [
  "#64748b",
  "#f59e0b",
  "#44403c",
  "#0ea5e9",
  "#eab308",
  "#22c55e",
  "#dc2626",
  "#78350f",
  "#94a3b8"
];

const FUEL_SHARE_COLORS = [
  "#991b1b",
  "#9a3412",
  "#a16207",
  "#4d7c0f",
  "#0f766e",
  "#1d4ed8",
  "#6d28d9",
  "#9d174d",
  "#115e59",
  "#854d0e",
  "#7c2d12",
  "#431407",
  "#312e81",
  "#134e4a",
  "#64748b"
];

/** Sankey `input2sankey.csv` içinde hedef düğüm `Elec` olan kaynaklar (export_sankey.run ile aynı sıra) */
const SANKEY_ELEC_SOURCE_ORDER = [
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
  "CHP",
  "Biofuels"
];

const DEFAULT_MONTH_LABELS = [
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
  "Ara"
];

let monthLabels = [...DEFAULT_MONTH_LABELS];

pickFolderBtn.addEventListener("click", async () => {
  try {
    projectDirHandle = await window.showDirectoryPicker();
    reloadBtn.disabled = false;
    await loadDashboard();
  } catch (error) {
    setStatus(`Klasör seçimi iptal veya hata: ${error.message}`, true);
  }
});

reloadBtn.addEventListener("click", async () => {
  if (!projectDirHandle) return;
  await loadDashboard();
});

techSelectorEl.addEventListener("change", () => {
  renderTechChart(getActiveScenarios());
});

scenariosAllBtn.addEventListener("click", () => {
  setAllScenarioChecks(true);
});

scenariosNoneBtn.addEventListener("click", () => {
  setAllScenarioChecks(false);
});

sankeyMasterToggle.addEventListener("change", () => {
  sankeyStackEl.hidden = !sankeyMasterToggle.checked;
  if (sankeyMasterToggle.checked) {
    renderSankeySection(getActiveScenarios());
  } else {
    sankeyStackEl.innerHTML = "";
  }
});

window.addEventListener("DOMContentLoaded", () => {
  initCollapsibleCards();
  initExportButtons();
  document.getElementById("export-all-tables-btn")?.addEventListener("click", exportAllTablesXlsx);

  if (loadFromPrecomputedData()) {
    return;
  }
  setStatus("Klasör seçimi bekleniyor…");
});

function setAllScenarioChecks(checked) {
  scenarioTogglesEl.querySelectorAll('input[type="checkbox"]').forEach((el) => {
    el.checked = checked;
  });
  refreshDashboard();
}

function sanitizeId(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#fecaca" : "#bbf7d0";
}

function getActiveScenarios() {
  const active = new Set();
  scenarioTogglesEl.querySelectorAll('input[type="checkbox"]').forEach((el) => {
    if (el.checked) active.add(el.dataset.folder);
  });
  return scenarios.filter((s) => active.has(s.folderName));
}

function buildScenarioToggles() {
  scenarioTogglesEl.innerHTML = "";
  scenarios.forEach((s) => {
    const displayName = s.label || s.folderName;
    const label = document.createElement("label");
    label.className = "scenario-toggle";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !displayName.startsWith("output");
    cb.dataset.folder = s.folderName;
    cb.addEventListener("change", refreshDashboard);
    label.appendChild(cb);
    const text = document.createTextNode(` ${displayName}`);
    label.appendChild(text);
    scenarioTogglesEl.appendChild(label);
  });
}

function refreshDashboard() {
  const active = getActiveScenarios();
  if (!active.length) {
    setStatus("Hiç senaryo seçilmedi; grafikler boş.", true);
    clearCanvas(costChart);
    clearCanvas(gwpChart);
    clearCanvas(intensityChart);
    if (energyPriceChart) clearCanvas(energyPriceChart);
    if (totalEmissionsChart) clearCanvas(totalEmissionsChart);
    clearCanvas(techChart);
    clearCanvas(enduseChart);
    clearCanvas(productionChart);
    if (fuelShareChart) clearCanvas(fuelShareChart);
    if (fuelShareTableEl) fuelShareTableEl.innerHTML = "";
    if (installedCapYearChart) clearCanvas(installedCapYearChart);
    if (installedCapTableEl) installedCapTableEl.innerHTML = "";
    energySummaryEl.innerHTML = "<p class=\"muted\">Bir veya daha fazla senaryo seçin.</p>";
    metricsTableEl.innerHTML = "";
    costPivotEl.innerHTML = "";
    sankeyStackEl.innerHTML = "";
    purgePlotlyHost(monthlyEnergyPriceChartEl);
    if (monthlySupplyStackEl) monthlySupplyStackEl.innerHTML = "";
    return;
  }

  renderEnergySummaryTable(active);
  renderEndUseChart(active);
  renderFuelShares(active);
  renderInstalledCapacitySection(active);
  renderProductionChart(active);
  renderMetricsTable(active);
  renderBarChart(costChart, active, "totalCost", "TotalCost (MEUR)");
  renderBarChart(gwpChart, active, "totalGwp", "TotalGWP (ktCO₂eq)");
  renderIntensityChart(active);
  renderEnergyPriceChart(active);
  renderTotalEmissionsChart(active);
  renderMonthlySection(active);
  setupTechSelector(active);
  renderTechChart(active);
  renderCostPivot(active);
  if (sankeyMasterToggle.checked) {
    renderSankeySection(active);
  } else {
    sankeyStackEl.innerHTML = "";
  }
  setStatus(`${active.length} senaryo seçili — grafikler güncellendi.`, false);
}

async function loadDashboard() {
  setStatus("Çıktı klasörleri taranıyor…");
  try {
    fuelResourcesForShare = [];
    expectedScenarios = [];
    scenarios = await scanScenarios(projectDirHandle);
    enrichScenariosElectricitySankeySupply();
    if (!scenarios.length) {
      scenarioTogglesEl.innerHTML = "";
      energySummaryEl.innerHTML = "";
      metricsTableEl.innerHTML = "";
      costPivotEl.innerHTML = "";
      clearCanvas(costChart);
      clearCanvas(gwpChart);
      clearCanvas(intensityChart);
      if (energyPriceChart) clearCanvas(energyPriceChart);
      if (totalEmissionsChart) clearCanvas(totalEmissionsChart);
      clearCanvas(techChart);
      clearCanvas(enduseChart);
      clearCanvas(productionChart);
      if (fuelShareChart) clearCanvas(fuelShareChart);
      if (fuelShareTableEl) fuelShareTableEl.innerHTML = "";
      if (installedCapYearChart) clearCanvas(installedCapYearChart);
      if (installedCapTableEl) installedCapTableEl.innerHTML = "";
      setStatus("scenario_metrics.txt içeren output* klasörü bulunamadı.", true);
      return;
    }

    buildScenarioToggles();
    renderSolutionStatus();
    refreshDashboard();
    setStatus(`${scenarios.length} senaryo yüklendi.`, false);
  } catch (error) {
    setStatus(`Yükleme hatası: ${error.message}`, true);
  }
}

function sumObjectValues(obj) {
  if (!obj) return 0;
  return Object.values(obj).reduce((a, b) => a + (Number(b) || 0), 0);
}

function loadFromPrecomputedData() {
  const payload = window.SCENARIO_DASHBOARD_DATA;
  if (!payload || !Array.isArray(payload.scenarios) || payload.scenarios.length === 0) {
    return false;
  }

  scenarios = payload.scenarios;
  enrichScenariosElectricitySankeySupply();
  expectedScenarios = Array.isArray(payload.expectedScenarios) ? payload.expectedScenarios : [];
  fuelResourcesForShare = Array.isArray(payload.fuelResourcesForShare) ? payload.fuelResourcesForShare : [];
  installedFuelOrder = Array.isArray(payload.installedCapacityFuelOrder) ? payload.installedCapacityFuelOrder : [];
  installedFuelLabels =
    payload.installedCapacityFuelLabels && typeof payload.installedCapacityFuelLabels === "object"
      ? payload.installedCapacityFuelLabels
      : {};
  monthLabels = Array.isArray(payload.monthLabels) && payload.monthLabels.length === 12
    ? payload.monthLabels
    : [...DEFAULT_MONTH_LABELS];
  buildScenarioToggles();
    renderSolutionStatus();
    refreshDashboard();

  const generatedAt = payload.generatedAt ? ` (${payload.generatedAt})` : "";
  const unsolved = Number(payload.unsolvedExpectedCount || 0);
  const unsolvedSuffix = unsolved > 0 ? ` Uyarı: ${unsolved} beklenen senaryoda çözüm yok.` : "";
  setStatus(
    `Önceden üretilmiş veriden ${scenarios.length} senaryo${generatedAt}.${unsolvedSuffix}`,
    unsolved > 0
  );
  return true;
}

function scenarioMetaFromFolderName(folderName) {
  if (!folderName || !/turkey/i.test(folderName)) return null;
  const ym = folderName.match(/(20\d{2})/);
  if (!ym) return null;
  const year = parseInt(ym[1], 10);
  let track = null;
  if (/drought/i.test(folderName)) track = "drought";
  else if (/reference/i.test(folderName)) track = "reference";
  return track ? { year, track } : null;
}

function scenarioMetaFrom(s) {
  if (s.scenarioYear != null && s.scenarioTrack != null) return { year: s.scenarioYear, track: s.scenarioTrack };
  return scenarioMetaFromFolderName(s.folderName || "");
}

function fuelOrderResolved() {
  return installedFuelOrder.length ? installedFuelOrder : DEFAULT_INSTALLED_FUEL_ORDER;
}

function labelForInstalledFuelKey(key) {
  const labels = Object.keys(installedFuelLabels).length ? installedFuelLabels : DEFAULT_INSTALLED_FUEL_LABELS;
  return labels[key] || key;
}

function parseInstalledCapacityFuelFile(text) {
  const raw = parseTwoColumnNumericTable(text, "fuel_group");
  delete raw.electricity_techs_total_GW;
  const order = fuelOrderResolved();
  const out = {};
  order.forEach((k) => {
    out[k] = Number(raw[k]) || 0;
  });
  return out;
}

function aggregateInstalledFromFmultJs(fm, elecTechs) {
  const gv = (n) => Number(fm[n]) || 0;
  const nuclear = gv("NUCLEAR");
  const natural_gas = gv("CCGT") + gv("CCGT_CCS");
  const coal = gv("COAL_US") + gv("COAL_IGCC") + gv("COAL_US_CCS") + gv("COAL_IGCC_CCS");
  const hydro = gv("HYDRO_DAM") + gv("NEW_HYDRO_DAM") + gv("HYDRO_RIVER") + gv("NEW_HYDRO_RIVER");
  const solar_pv = gv("PV");
  const wind = gv("WIND");
  const geothermal = gv("GEOTHERMAL");
  const biomass = gv("IND_COGEN_WOOD");
  const elecTotal = elecTechs.reduce((acc, t) => acc + gv(t), 0);
  const mappedCore = nuclear + natural_gas + coal + hydro + solar_pv + wind + geothermal;
  const other_electric = Math.max(0, elecTotal - mappedCore);
  const order = fuelOrderResolved();
  const o = {
    nuclear,
    natural_gas,
    coal,
    hydro,
    solar_pv,
    wind,
    geothermal,
    biomass,
    other_electric
  };
  const out = {};
  order.forEach((k) => {
    out[k] = Math.round((o[k] || 0) * 1e6) / 1e6;
  });
  return out;
}

function renderInstalledCapacitySection(active) {
  if (!installedCapYearChart || !installedCapTableEl) return;
  if (!active.length) {
    clearCanvas(installedCapYearChart);
    installedCapTableEl.innerHTML = "";
    return;
  }
  const withIc = active.filter((s) => scenarioMetaFrom(s) && s.installedCapacityByFuelGw);
  if (!withIc.length) {
    clearCanvas(installedCapYearChart);
    const ctx = installedCapYearChart.getContext("2d");
    ctx.fillStyle = "#64748b";
    ctx.font = "14px system-ui";
    ctx.fillText("Türkiye senaryosu seçin; kurulu güç için installed_capacity_by_fuel_gw.txt veya f_mult gerekli.", 16, 48);
    installedCapTableEl.innerHTML =
      "<p class=\"muted\">Kurulu güç verisi yok. <code>export_standard_outputs.run</code> ile güncel modeli çalıştırın.</p>";
    return;
  }
  renderInstalledCapacityYearChart(installedCapYearChart, withIc);
  renderInstalledCapacityTable(withIc);
}

function renderInstalledCapacityYearChart(canvas, activeScenarios) {
  const ctx = canvas.getContext("2d");
  clearCanvas(canvas);
  const order = fuelOrderResolved();
  const byYear = new Map();
  activeScenarios.forEach((s) => {
    const m = scenarioMetaFrom(s);
    if (!m || !s.installedCapacityByFuelGw) return;
    if (!byYear.has(m.year)) byYear.set(m.year, { reference: null, drought: null });
    const slot = byYear.get(m.year);
    if (m.track === "reference") slot.reference = s;
    if (m.track === "drought") slot.drought = s;
  });
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);
  if (!years.length) return;

  const tracks = [
    { key: "reference", label: "Referans" },
    { key: "drought", label: "Kuraklık" }
  ];

  let yMax = 1;
  years.forEach((y) => {
    const slot = byYear.get(y);
    tracks.forEach((tr) => {
      const sc = slot[tr.key];
      if (!sc || !sc.installedCapacityByFuelGw) return;
      let t = 0;
      order.forEach((fk) => {
        t += Number(sc.installedCapacityByFuelGw[fk]) || 0;
      });
      yMax = Math.max(yMax, t);
    });
  });

  const w = canvas.width;
  const h = canvas.height;
  const pad = { l: 48, r: 16, t: 36, b: 112 };
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;
  const nYears = years.length;
  const groupW = chartW / Math.max(nYears, 1);
  const innerPad = groupW * 0.12;
  const barW = (groupW - innerPad * 2) / 2 - 4;

  ctx.fillStyle = "#0f172a";
  ctx.font = "14px system-ui";
  ctx.fillText("Kurulu güç (GW) — yıl başına Referans / Kuraklık (yığılmış yakıt grupları)", pad.l, 22);

  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(pad.l, h - pad.b);
  ctx.lineTo(w - pad.r, h - pad.b);
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "11px system-ui";
  ctx.textAlign = "right";
  for (let gi = 0; gi <= 4; gi++) {
    const val = (yMax * gi) / 4;
    const y = h - pad.b - (chartH * gi) / 4;
    ctx.fillText(`${val.toFixed(0)}`, pad.l - 8, y + 4);
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
  }
  ctx.textAlign = "left";

  years.forEach((year, yi) => {
    const gx = pad.l + yi * groupW + innerPad;
    const slot = byYear.get(year);
    tracks.forEach((tr, ti) => {
      const sc = slot[tr.key];
      const x0 = gx + ti * (barW + 8);
      if (!sc || !sc.installedCapacityByFuelGw) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("—", x0 + barW / 2, h - pad.b - 8);
        return;
      }
      let yBase = h - pad.b;
      order.forEach((fk, fi) => {
        const v = Number(sc.installedCapacityByFuelGw[fk]) || 0;
        if (v <= 0) return;
        const segH = (v / yMax) * chartH;
        yBase -= segH;
        ctx.fillStyle = INSTALLED_FUEL_SEGMENT_COLORS[fi % INSTALLED_FUEL_SEGMENT_COLORS.length];
        ctx.fillRect(x0, yBase, barW, segH);
      });
      ctx.strokeStyle = "#64748b";
      ctx.strokeRect(x0, h - pad.b - (barTotalHeight(sc, order) / yMax) * chartH, barW, (barTotalHeight(sc, order) / yMax) * chartH);
    });

    ctx.fillStyle = "#334155";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(String(year), pad.l + yi * groupW + groupW / 2, h - pad.b + 18);

    tracks.forEach((tr, ti) => {
      const x0 = gx + ti * (barW + 8);
      ctx.save();
      ctx.translate(x0 + barW / 2, h - pad.b + 34);
      ctx.rotate(-Math.PI / 8);
      ctx.textAlign = "right";
      ctx.font = "10px system-ui";
      ctx.fillStyle = "#475569";
      ctx.fillText(tr.label, 0, 0);
      ctx.restore();
    });
  });

  let lx = pad.l;
  const ly = h - pad.b + 72;
  order.forEach((fk, fi) => {
    ctx.fillStyle = INSTALLED_FUEL_SEGMENT_COLORS[fi % INSTALLED_FUEL_SEGMENT_COLORS.length];
    ctx.fillRect(lx, ly, 12, 10);
    lx += 16;
    ctx.fillStyle = "#475569";
    ctx.font = "10px system-ui";
    ctx.textAlign = "left";
    const lab = labelForInstalledFuelKey(fk);
    const short = lab.length > 16 ? `${lab.slice(0, 14)}…` : lab;
    ctx.fillText(short, lx, ly + 9);
    lx += ctx.measureText(short).width + 14;
    if (lx > w - 40) {
      lx = pad.l;
    }
  });
}

function barTotalHeight(scenario, order) {
  if (!scenario.installedCapacityByFuelGw) return 0;
  let t = 0;
  order.forEach((fk) => {
    t += Number(scenario.installedCapacityByFuelGw[fk]) || 0;
  });
  return t;
}

function renderInstalledCapacityTable(activeScenarios) {
  const order = fuelOrderResolved();
  const sorted = activeScenarios
    .filter((s) => scenarioMetaFrom(s) && s.installedCapacityByFuelGw)
    .sort((a, b) => {
      const ma = scenarioMetaFrom(a);
      const mb = scenarioMetaFrom(b);
      if (!ma || !mb) return 0;
      if (ma.year !== mb.year) return ma.year - mb.year;
      const o = (t) => (t === "reference" ? 0 : 1);
      return o(ma.track) - o(mb.track);
    });
  const rows = sorted
    .map((s) => {
      const m = scenarioMetaFrom(s);
      const ic = s.installedCapacityByFuelGw;
      let tot = 0;
      const cells = order
        .map((fk) => {
          const v = Number(ic[fk]) || 0;
          tot += v;
          return `<td>${formatNumber(v)}</td>`;
        })
        .join("");
      return `<tr>
        <td>${escapeHtml(s.label || s.folderName)}</td>
        <td>${m.year}</td>
        <td>${m.track === "drought" ? "Kuraklık" : "Referans"}</td>
        ${cells}
        <td><strong>${formatNumber(tot)}</strong></td>
      </tr>`;
    })
    .join("");

  const headFuels = order.map((fk) => `<th>${escapeHtml(labelForInstalledFuelKey(fk))}</th>`).join("");
  installedCapTableEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Senaryo</th>
          <th>Yıl</th>
          <th>İz</th>
          ${headFuels}
          <th>Toplam GW</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function scanScenarios(rootHandle) {
  const found = [];
  for await (const [name, handle] of rootHandle.entries()) {
    if (handle.kind !== "directory") continue;
    if (!name.startsWith("output")) continue;

    const scenario = {
      folderName: name,
      totalCost: null,
      totalGwp: null,
      totalOutput: {},
      costBreakdown: {},
      endUsesAnnual: {},
      sankeyLinks: [],
      electricitySankeySupplyGwh: {},
      solved: false,
      statusReason: "",
      runError: null,
      scenarioYear: null,
      scenarioTrack: null,
      installedCapacityByFuelGw: null,
      monthlyEnergyPrice: [],
      monthlyElectricitySupplyGwh: {},
      label: name
    };

    const metricsFile = await getOptionalFile(handle, "scenario_metrics.txt");
    if (metricsFile) {
      Object.assign(scenario, parseScenarioMetrics(await readText(metricsFile)));
    } else {
      scenario.solved = false;
      scenario.statusReason = "scenario_metrics.txt not found";
    }

    const errFile = await getOptionalFile(handle, "scenario_run_error.txt");
    if (errFile) {
      scenario.runError = await readText(errFile);
      if (!scenario.solved) {
        scenario.statusReason = "scenario_metrics.txt yok — scenario_run_error.txt bakın";
      }
    }

    const totalOutputFile = await getOptionalFile(handle, "total_output.txt");
    if (totalOutputFile) {
      scenario.totalOutput = parseTwoColumnNumericTable(await readText(totalOutputFile), "Name");
    }

    const costBreakdownFile = await getOptionalFile(handle, "cost_breakdown.txt");
    if (costBreakdownFile) {
      scenario.costBreakdown = parseCostBreakdown(await readText(costBreakdownFile));
    }

    const endUsesFile = await getOptionalFile(handle, "End_Uses.txt");
    if (endUsesFile) {
      scenario.endUsesAnnual = parseEndUses(await readText(endUsesFile));
    }

    const sankeyFile = await getSankeyFileHandle(handle);
    if (sankeyFile) {
      scenario.sankeyLinks = parseSankeyCsv(await readText(sankeyFile));
    }
    scenario.electricitySankeySupplyGwh = aggregateSankeySupplyToElecGwh(scenario.sankeyLinks);

    const setsFile = await getOptionalFile(handle, "sets.txt");
    let elecSupplyTechs = [];
    if (setsFile) {
      const setsText = await readText(setsFile);
      elecSupplyTechs = parseElectricitySupplyTechsFromSets(setsText);
      if (!fuelResourcesForShare.length) {
        fuelResourcesForShare = parseResourcesFromSetsForFuelShare(setsText);
      }
    }

    const metaFromFolder = scenarioMetaFromFolderName(name);
    scenario.scenarioYear = metaFromFolder ? metaFromFolder.year : null;
    scenario.scenarioTrack = metaFromFolder ? metaFromFolder.track : null;

    const icFile = await getOptionalFile(handle, "installed_capacity_by_fuel_gw.txt");
    let installedByFuel = null;
    if (icFile) {
      try {
        installedByFuel = parseInstalledCapacityFuelFile(await readText(icFile));
      } catch {
        installedByFuel = null;
      }
    }
    const fmultIcFile = await getOptionalFile(handle, "f_mult.txt");
    if (!installedByFuel && fmultIcFile && elecSupplyTechs.length) {
      const ftxt = await readText(fmultIcFile);
      const fm = parseTwoColumnNumericTable(ftxt, "Name");
      installedByFuel = aggregateInstalledFromFmultJs(fm, elecSupplyTechs);
    }
    scenario.installedCapacityByFuelGw = installedByFuel;

    const monthlyPriceFile = await getOptionalFile(handle, "monthly_energy_price.txt");
    if (monthlyPriceFile) {
      scenario.monthlyEnergyPrice = parseMonthlyEnergyPrice(await readText(monthlyPriceFile));
    } else {
      scenario.monthlyEnergyPrice = [];
    }

    const monthlySupplyFile = await getOptionalFile(handle, "monthly_electricity_supply_gwh.txt");
    if (monthlySupplyFile) {
      scenario.monthlyElectricitySupplyGwh = parsePeriodMatrix(await readText(monthlySupplyFile));
    } else {
      scenario.monthlyElectricitySupplyGwh = {};
    }

    const lossesFile = await getOptionalFile(handle, "losses.txt");
    let elecLossesGwh = 0;
    if (lossesFile) {
      const lossMap = parseTwoColumnNumericTable(await readText(lossesFile), "");
      elecLossesGwh = Number(lossMap.ELECTRICITY) || 0;
    }

    const elecRow = scenario.totalOutput.ELECTRICITY;
    const elecSupply = sumElectricitySupplyGwh(scenario.totalOutput, elecSupplyTechs);
    let denom = null;
    if (Number.isFinite(elecRow) && elecRow > 0) denom = elecRow;
    else if (elecSupply != null && elecSupply > 0) denom = elecSupply;

    let elecDemandGwh = null;
    if (denom != null && denom > 0) {
      elecDemandGwh = denom - elecLossesGwh;
      if (elecDemandGwh <= 0) elecDemandGwh = denom;
    }

    let energyPriceEurPerMwh = null;
    if (scenario.solved && scenario.totalCost != null && elecDemandGwh && elecDemandGwh > 0) {
      energyPriceEurPerMwh = scenario.totalCost / elecDemandGwh * 1000.0;
    }

    const endSum = sumObjectValues(scenario.endUsesAnnual);
    scenario.kpi = {
      electricityOutputGWh: Number.isFinite(elecRow) ? elecRow : null,
      electricitySupplyGWh: elecSupply == null ? null : elecSupply,
      electricityDemandGWh: elecDemandGwh,
      electricityLossesGWh: elecLossesGwh,
      endUseDemandGWh: endSum > 0 ? endSum : null,
      costPerGWh:
        scenario.solved && denom && denom > 0 && scenario.totalCost != null ? scenario.totalCost / denom : null,
      gwpPerGWh:
        scenario.solved && denom && denom > 0 && scenario.totalGwp != null ? scenario.totalGwp / denom : null,
      energyPriceEurPerMwh: energyPriceEurPerMwh,
      totalEmissionsKtCO2: scenario.solved ? scenario.totalGwp : null
    };

    found.push(scenario);
  }

  found.sort((a, b) => a.folderName.localeCompare(b.folderName));
  return found;
}

async function getOptionalFile(dirHandle, fileName) {
  try {
    return await dirHandle.getFileHandle(fileName);
  } catch {
    return null;
  }
}

async function getSankeyFileHandle(dirHandle) {
  try {
    const dir = await dirHandle.getDirectoryHandle("sankey");
    return await dir.getFileHandle("input2sankey.csv");
  } catch {
    return null;
  }
}

async function readText(fileHandle) {
  const file = await fileHandle.getFile();
  return file.text();
}

function parseScenarioMetrics(content) {
  const result = {
    totalCost: null,
    totalGwp: null,
    solved: false,
    statusReason: "metrics ok"
  };
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const [key, rawValue] = line.split(/\s+/);
    const value = Number(rawValue);
    if (key === "TotalCost" && Number.isFinite(value)) result.totalCost = value;
    if (key === "TotalGWP" && Number.isFinite(value)) result.totalGwp = value;
  }
  result.solved = result.totalCost != null && result.totalGwp != null;
  if (!result.solved) result.statusReason = "TotalCost veya TotalGWP eksik";
  return result;
}

function parseTwoColumnNumericTable(content, headerFirstCol) {
  const result = {};
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/\t+/);
    if (parts.length < 2) continue;
    if (parts[0] === headerFirstCol) continue;
    const val = Number(parts[1]);
    if (Number.isFinite(val)) {
      result[parts[0]] = val;
    }
  }
  return result;
}

function parseCostBreakdown(content) {
  const result = {};
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/\t+/);
    if (parts.length < 4) continue;
    if (parts[0] === "Name") continue;
    const cInv = Number(parts[1]) || 0;
    const cMaint = Number(parts[2]) || 0;
    const cOp = Number(parts[3]) || 0;
    result[parts[0]] = { cInv, cMaint, cOp, sum: cInv + cMaint + cOp };
  }
  return result;
}

function parseElectricitySupplyTechsFromSets(content) {
  const marker = "set TECHNOLOGIES_OF_END_USES_TYPE[ELECTRICITY] :=";
  const idx = content.indexOf(marker);
  if (idx < 0) return [];
  const after = content.slice(idx + marker.length);
  const semi = after.indexOf(";");
  const chunk = semi < 0 ? after : after.slice(0, semi);
  return chunk.split(/\s+/).filter(Boolean);
}

function parseResourcesFromSetsForFuelShare(content) {
  const marker = "set RESOURCES :=";
  const idx = content.indexOf(marker);
  if (idx < 0) return [];
  const after = content.slice(idx + marker.length);
  const semi = after.indexOf(";");
  const chunk = semi < 0 ? after : after.slice(0, semi);
  const exclude = new Set(["ELECTRICITY", "ELEC_EXPORT"]);
  return chunk.split(/\s+/).filter((t) => t && !exclude.has(t));
}

function getFuelResourceList() {
  return Array.isArray(fuelResourcesForShare) ? fuelResourcesForShare : [];
}

function scenarioFuelTotalFromList(s, fuelList) {
  let sum = 0;
  for (const f of fuelList) {
    const v = s.totalOutput?.[f];
    if (Number.isFinite(v) && v > 0) sum += v;
  }
  return sum;
}

function formatPercent(p) {
  if (!Number.isFinite(p)) return "—";
  return `${p.toLocaleString("tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 0 })}%`;
}

/** total_output yakıt satırları GWh; panelde MWh gösterimi için */
function formatMwhFromGwh(gwh) {
  if (!Number.isFinite(gwh)) return "—";
  const mwh = gwh * 1000;
  return `${mwh.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} MWh`;
}

function sumElectricitySupplyGwh(totalOutput, techs) {
  if (!techs.length || !totalOutput) return null;
  let s = 0;
  for (const t of techs) {
    const v = totalOutput[t];
    if (Number.isFinite(v)) s += v;
  }
  return s > 0 ? s : 0;
}

function parseEndUses(content) {
  const result = {};
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/\t+/);
    if (parts.length < 2) continue;
    const name = parts[0];
    if (name === "Name") continue;
    let total = 0;
    for (let i = 1; i < parts.length; i++) {
      const v = Number(parts[i]);
      if (Number.isFinite(v)) total += Math.abs(v);
    }
    result[name] = total;
  }
  return result;
}

function parsePeriodMatrix(content, valueCols = 12) {
  const result = {};
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/\t+/);
    if (parts.length < 2) continue;
    const name = parts[0];
    if (name === "Name") continue;
    const vals = [];
    for (let i = 1; i < parts.length && vals.length < valueCols; i++) {
      const v = Number(parts[i]);
      vals.push(Number.isFinite(v) ? v : 0);
    }
    while (vals.length < valueCols) vals.push(0);
    result[name] = vals.slice(0, valueCols);
  }
  return result;
}

function parseMonthlyEnergyPrice(content) {
  const rows = [];
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("period")) continue;
    const parts = line.split(/\t+/);
    if (parts.length < 4) continue;
    const period = Number(parts[0]);
    const demandGwh = Number(parts[1]);
    const costMeur = Number(parts[2]);
    const priceEurPerMwh = Number(parts[3]);
    if (!Number.isFinite(period) || period < 1 || period > 12) continue;
    rows.push({
      period,
      monthLabel: (monthLabels[period - 1] || DEFAULT_MONTH_LABELS[period - 1] || String(period)),
      demandGwh: Number.isFinite(demandGwh) ? demandGwh : 0,
      costMeur: Number.isFinite(costMeur) ? costMeur : 0,
      priceEurPerMwh: Number.isFinite(priceEurPerMwh) ? priceEurPerMwh : null
    });
  }
  rows.sort((a, b) => a.period - b.period);
  return rows;
}

function purgePlotlyHost(host) {
  if (!host || typeof Plotly === "undefined") return;
  try {
    Plotly.purge(host);
  } catch {
    /* ignore */
  }
  host.innerHTML = "";
}

function monthlySupplyRowOrder(keySet) {
  return mergeSankeyElecRowOrder(keySet);
}

function scenarioHasMonthlyData(s) {
  const price = s.monthlyEnergyPrice;
  const supply = s.monthlyElectricitySupplyGwh;
  const hasPrice = Array.isArray(price) && price.some((r) => Number(r?.priceEurPerMwh) > 0);
  const hasSupply =
    supply &&
    typeof supply === "object" &&
    Object.values(supply).some((arr) => Array.isArray(arr) && arr.some((v) => Number(v) > 0));
  return hasPrice || hasSupply;
}

function renderMonthlySection(active) {
  if (!monthlyEnergyPriceChartEl && !monthlySupplyStackEl) return;

  const withMonthly = active.filter(scenarioHasMonthlyData);
  if (!withMonthly.length) {
    purgePlotlyHost(monthlyEnergyPriceChartEl);
    if (monthlyEnergyPriceChartEl) {
      monthlyEnergyPriceChartEl.innerHTML =
        "<p class=\"muted\">Aylık veri yok. Senaryoları <code>run_all_turkey_scenarios.sh</code> ile yeniden çalıştırın (export_monthly_dashboard.run).</p>";
    }
    if (monthlySupplyStackEl) {
      monthlySupplyStackEl.innerHTML = "";
    }
    return;
  }

  renderMonthlyEnergyPriceChart(withMonthly);
  renderMonthlySupplyStackCharts(withMonthly);
}

function renderMonthlyEnergyPriceChart(activeScenarios) {
  if (!monthlyEnergyPriceChartEl) return;
  purgePlotlyHost(monthlyEnergyPriceChartEl);

  if (typeof Plotly === "undefined") {
    monthlyEnergyPriceChartEl.innerHTML =
      "<p class=\"muted\">Plotly yüklenemedi; aylık fiyat grafiği çizilemiyor.</p>";
    return;
  }

  const xMonths = monthLabels;
  const traces = activeScenarios
    .map((s, i) => {
      const rows = s.monthlyEnergyPrice || [];
      if (!rows.length) return null;
      const byPeriod = new Map(rows.map((r) => [r.period, r.priceEurPerMwh]));
      const y = xMonths.map((_, idx) => {
        const v = byPeriod.get(idx + 1);
        return v != null && Number.isFinite(v) ? v : null;
      });
      if (!y.some((v) => v != null && v > 0)) return null;
      return {
        type: "scatter",
        mode: "lines+markers",
        name: s.label || s.folderName,
        x: xMonths,
        y,
        line: { color: SCENARIO_COLORS[i % SCENARIO_COLORS.length], width: 2 },
        marker: { size: 6 }
      };
    })
    .filter(Boolean);

  if (!traces.length) {
    monthlyEnergyPriceChartEl.innerHTML =
      "<p class=\"muted\">Seçili senaryolarda <code>monthly_energy_price.txt</code> verisi yok.</p>";
    return;
  }

  Plotly.newPlot(
    monthlyEnergyPriceChartEl,
    traces,
    {
      margin: { l: 56, r: 24, t: 36, b: 48 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#f8fafc",
      yaxis: { title: "EUR/MWh", gridcolor: "#e2e8f0" },
      xaxis: { title: "Ay", gridcolor: "#e2e8f0" },
      legend: { orientation: "h", y: 1.12, x: 0 },
      hovermode: "x unified"
    },
    { responsive: true, displayModeBar: false }
  );
}

function renderMonthlySupplyStackCharts(activeScenarios) {
  if (!monthlySupplyStackEl) return;
  monthlySupplyStackEl.innerHTML = "";

  if (typeof Plotly === "undefined") {
    monthlySupplyStackEl.innerHTML =
      "<p class=\"muted\">Plotly yüklenemedi; aylık üretim grafikleri çizilemiyor.</p>";
    return;
  }

  const withSupply = activeScenarios.filter((s) => {
    const m = s.monthlyElectricitySupplyGwh;
    return m && Object.keys(m).length > 0;
  });

  if (!withSupply.length) {
    monthlySupplyStackEl.innerHTML =
      "<p class=\"muted\">Seçili senaryolarda <code>monthly_electricity_supply_gwh.txt</code> yok.</p>";
    return;
  }

  const unionKeys = new Set();
  withSupply.forEach((s) => {
    Object.entries(s.monthlyElectricitySupplyGwh || {}).forEach(([k, arr]) => {
      if (Array.isArray(arr) && arr.some((v) => Number(v) > 0)) unionKeys.add(k);
    });
  });
  const rowOrder = monthlySupplyRowOrder(unionKeys);

  withSupply.forEach((s) => {
    const matrix = s.monthlyElectricitySupplyGwh || {};
    const sources = rowOrder.filter((src) => {
      const arr = matrix[src];
      return Array.isArray(arr) && arr.some((v) => Number(v) > 0);
    });
    if (!sources.length) return;

    const panel = document.createElement("div");
    panel.className = "monthly-supply-panel";
    const title = document.createElement("h4");
    title.className = "monthly-supply-panel__title";
    title.textContent = s.label || s.folderName;
    const host = document.createElement("div");
    host.className = "monthly-supply-panel__chart";
    host.id = `monthly-supply-${sanitizeId(s.folderName)}`;
    panel.appendChild(title);
    panel.appendChild(host);
    monthlySupplyStackEl.appendChild(panel);

    const traces = sources.map((src, fi) => ({
      type: "bar",
      name: src,
      x: monthLabels,
      y: (matrix[src] || []).map((v) => (Number(v) > 0 ? Number(v) : 0)),
      marker: { color: FUEL_SHARE_COLORS[fi % FUEL_SHARE_COLORS.length] }
    }));

    Plotly.newPlot(
      host,
      traces,
      {
        barmode: "stack",
        margin: { l: 56, r: 16, t: 24, b: 48 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "#ffffff",
        yaxis: { title: "GWh", gridcolor: "#e2e8f0" },
        xaxis: { title: "Ay" },
        legend: { orientation: "h", y: 1.18, x: 0, font: { size: 10 } }
      },
      { responsive: true, displayModeBar: false }
    );
  });
}

function parseSankeyCsv(text) {
  const links = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return links;
  const header = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const si = header.indexOf("source");
  const ti = header.indexOf("target");
  const vi = header.indexOf("realvalue");
  if (si < 0 || ti < 0 || vi < 0) return links;
  const colorIdx = header.indexOf("layercolor");
  const unitIdx = header.indexOf("layerunit");
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]);
    if (parts.length <= Math.max(si, ti, vi)) continue;
    const source = parts[si]?.trim();
    const target = parts[ti]?.trim();
    const val = Number(parts[vi]);
    if (!source || !target || !Number.isFinite(val) || val <= 0) continue;
    links.push({
      source,
      target,
      value: val,
      color: colorIdx >= 0 ? (parts[colorIdx] || "").trim() : "",
      unit: unitIdx >= 0 ? (parts[unitIdx] || "TWh").trim() : "TWh"
    });
  }
  return links;
}

/** Sankey realValue = TWh → GWh (total_output ile aynı birim ailesi; MWh = GWh×1000) */
function aggregateSankeySupplyToElecGwh(links) {
  const out = {};
  if (!Array.isArray(links)) return out;
  for (const L of links) {
    if (!L || String(L.target || "").trim().toLowerCase() !== "elec") continue;
    const src = String(L.source || "").trim();
    if (!src) continue;
    const twh = Number(L.value);
    if (!Number.isFinite(twh) || twh <= 0) continue;
    out[src] = (out[src] || 0) + twh * 1000;
  }
  return out;
}

function mergeSankeyElecRowOrder(keySet) {
  const keys = [...keySet].filter(Boolean);
  if (!keys.length) return [];
  const rest = keys.filter((k) => !SANKEY_ELEC_SOURCE_ORDER.includes(k)).sort((a, b) => a.localeCompare(b));
  return [...SANKEY_ELEC_SOURCE_ORDER.filter((k) => keySet.has(k)), ...rest];
}

function scenarioSankeyElecSupplyTotal(s) {
  const m = s.electricitySankeySupplyGwh || {};
  let t = 0;
  for (const v of Object.values(m)) {
    if (Number.isFinite(v) && v > 0) t += v;
  }
  return t;
}

function enrichScenariosElectricitySankeySupply() {
  scenarios.forEach((s) => {
    if (!s.electricitySankeySupplyGwh || !Object.keys(s.electricitySankeySupplyGwh).length) {
      s.electricitySankeySupplyGwh = aggregateSankeySupplyToElecGwh(s.sankeyLinks);
    }
  });
}

function fuelShareRowKeysForActive(active) {
  const anySankey = active.some((s) => scenarioSankeyElecSupplyTotal(s) > 0);
  if (anySankey) {
    const union = new Set();
    active.forEach((s) => {
      const m = s.electricitySankeySupplyGwh || {};
      Object.entries(m).forEach(([k, v]) => {
        if (Number(v) > 0) union.add(k);
      });
    });
    return mergeSankeyElecRowOrder(union);
  }
  return getFuelResourceList();
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function renderEnergySummaryTable(active) {
  const rows = active
    .map((s) => {
      const demand = s.kpi?.endUseDemandGWh;
      const demandCell =
        demand != null && Number.isFinite(demand)
          ? formatNumber(demand)
          : sumObjectValues(s.endUsesAnnual) > 0
            ? formatNumber(sumObjectValues(s.endUsesAnnual))
            : "—";
      const supply = s.kpi?.electricitySupplyGWh;
      const rowE = s.totalOutput?.ELECTRICITY;
      let elecCell = "—";
      if (supply != null && Number.isFinite(supply) && supply > 0) {
        elecCell = formatNumber(supply);
      } else if (rowE != null && Number.isFinite(rowE) && rowE > 0) {
        elecCell = formatNumber(rowE);
      } else if (supply === 0) {
        elecCell = "0";
      }
      return `
        <tr>
          <td>${s.label || s.folderName}</td>
          <td>${s.solved === false ? "Çözüm yok" : "Çözüldü"}</td>
          <td>${demandCell}</td>
          <td>${elecCell}</td>
        </tr>`;
    })
    .join("");

  energySummaryEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Senaryo</th>
          <th>Durum</th>
          <th>Talep özeti (End_Uses, GWh)</th>
          <th>Elektrik üretimi (sets.txt → ELECTRICITY teknolojileri, GWh)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="muted">
      Talep: <code>End_Uses.txt</code> (yoksa &quot;—&quot;). Elektrik üretimi: <code>sets.txt</code> içindeki
      <code>TECHNOLOGIES_OF_END_USES_TYPE[ELECTRICITY]</code> kümesindeki teknolojilerin <code>total_output.txt</code>
      değerleri toplanır; <code>ELECTRICITY</code> satırı 0 olsa da bu sütun dolabilir. GWP/maliyet yoğunluğu aynı toplam GWh paydasını kullanır.
    </p>
  `;
}

function topKeysByAggregate(scenarios, keyObj, topN) {
  const totals = new Map();
  scenarios.forEach((s) => {
    const o = s[keyObj] || {};
    for (const [k, v] of Object.entries(o)) {
      if (!Number.isFinite(v) || v <= 0) continue;
      totals.set(k, (totals.get(k) || 0) + v);
    }
  });
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([k]) => k);
}

function renderEndUseChart(active) {
  const cats = topKeysByAggregate(active, "endUsesAnnual", 10);
  if (!cats.length) {
    clearCanvas(enduseChart);
    const ctx = enduseChart.getContext("2d");
    ctx.fillStyle = "#64748b";
    ctx.font = "14px system-ui";
    ctx.fillText("End_Uses.txt verisi yok veya tüm değerler sıfır.", 24, 80);
    return;
  }
  renderGroupedBarChart(enduseChart, active, cats, (s, c) => s.endUsesAnnual?.[c] || 0, "Taşıyıcı talebi (GWh)");
}

function renderProductionChart(active) {
  const cats = topKeysByAggregate(active, "totalOutput", 12);
  if (!cats.length) {
    clearCanvas(productionChart);
    return;
  }
  renderGroupedBarChart(
    productionChart,
    active,
    cats,
    (s, c) => s.totalOutput?.[c] || 0,
    "Teknoloji yıllık çıktı (total_output, GWh)"
  );
}

function renderFuelShares(active) {
  if (!fuelShareTableEl || !fuelShareChart) return;
  const useSankey = active.some((s) => scenarioSankeyElecSupplyTotal(s) > 0);
  const resourceFuels = getFuelResourceList();
  const rowKeys = fuelShareRowKeysForActive(active);

  if (!rowKeys.length) {
    fuelShareTableEl.innerHTML = useSankey
      ? "<p class=\"muted\">Seçili senaryolarda <code>sankey/input2sankey.csv</code> içinde <code>→ Elec</code> akışı yok.</p>"
      : "<p class=\"muted\"><code>sets.txt</code> yok veya <code>RESOURCES</code> okunamadı. Yakıt listesi için veri paketini yenileyin veya klasör seçin.</p>";
    clearCanvas(fuelShareChart);
    return;
  }

  const agg = new Map();
  active.forEach((s) => {
    rowKeys.forEach((f) => {
      const v = useSankey
        ? Number(s.electricitySankeySupplyGwh?.[f]) || 0
        : Number(s.totalOutput?.[f]) || 0;
      if (v > 0) agg.set(f, (agg.get(f) || 0) + v);
    });
  });
  const fuelsOrdered = rowKeys.filter((f) => (agg.get(f) || 0) > 0).sort((a, b) => (agg.get(b) || 0) - (agg.get(a) || 0));
  if (!fuelsOrdered.length) {
    fuelShareTableEl.innerHTML = useSankey
      ? "<p class=\"muted\">Sankey dosyasında Elec hedefine pozitif akış yok.</p>"
      : "<p class=\"muted\">Seçili senaryolarda bu yakıt satırlarında pozitif <code>total_output</code> yok.</p>";
    clearCanvas(fuelShareChart);
    return;
  }

  const firstCol = useSankey
    ? `Kaynak <span class="fuel-share-th-sub">(Sankey → Elec, <code>input2sankey.csv</code>)</span>`
    : "Yakıt (RESOURCES)";
  const footerLabel = useSankey
    ? `<strong>Toplam</strong> <span class="fuel-share-th-sub">(Sankey → Elec, GWh)</span>`
    : `<strong>Toplam</strong> <span class="fuel-share-th-sub">(liste içi RESOURCES)</span>`;

  const header = active
    .map(
      (s) =>
        `<th>${escapeHtml(s.label || s.folderName)}<div class="fuel-share-th-sub">MWh · toplam içinde %</div></th>`
    )
    .join("");
  const rows = fuelsOrdered
    .map((f) => {
      const cells = active
        .map((s) => {
          const tot = useSankey ? scenarioSankeyElecSupplyTotal(s) : scenarioFuelTotalFromList(s, resourceFuels);
          const v = useSankey
            ? Number(s.electricitySankeySupplyGwh?.[f]) || 0
            : Number(s.totalOutput?.[f]) || 0;
          const pct = tot > 0 ? (100 * v) / tot : 0;
          if (!(tot > 0)) {
            return `<td class="fuel-share-cell">—</td>`;
          }
          const titleGwh = `${formatNumber(v)} GWh`;
          return `<td class="fuel-share-cell" title="${titleGwh}"><span class="fuel-share-cell__mwh">${formatMwhFromGwh(v)}</span><span class="fuel-share-cell__pct">${formatPercent(pct)}</span></td>`;
        })
        .join("");
      return `<tr><td>${escapeHtml(f)}</td>${cells}</tr>`;
    })
    .join("");

  const footerCells = active
    .map((s) => {
      const tot = useSankey ? scenarioSankeyElecSupplyTotal(s) : scenarioFuelTotalFromList(s, resourceFuels);
      if (!(tot > 0)) return `<td class="fuel-share-cell">—</td>`;
      return `<td class="fuel-share-cell"><span class="fuel-share-cell__mwh"><strong>${formatMwhFromGwh(tot)}</strong></span><span class="fuel-share-cell__pct">%100</span></td>`;
    })
    .join("");

  fuelShareTableEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>${firstCol}</th>
          ${header}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td>${footerLabel}</td>
          ${footerCells}
        </tr>
      </tfoot>
    </table>
  `;

  renderFuelShareStackedChart(fuelShareChart, active, resourceFuels, fuelsOrdered, useSankey);
}

function renderFuelShareStackedChart(canvas, activeScenarios, resourceFuels, fuelsOrdered, useSankey) {
  const ctx = canvas.getContext("2d");
  const maxSeg = 9;
  const head = fuelsOrdered.slice(0, maxSeg);
  const tail = fuelsOrdered.slice(maxSeg);
  const labelParts = [...head];
  if (tail.length) labelParts.push("Diğer");

  const rowH = 44;
  const pad = { t: 32, r: 20, b: 52, l: 8 };
  const h = Math.max(200, pad.t + activeScenarios.length * rowH + pad.b);
  canvas.height = h;

  clearCanvas(canvas);
  const w = canvas.width;
  const barW = w - pad.l - pad.r - 160;
  const x0 = pad.l + 150;

  ctx.fillStyle = "#0f172a";
  ctx.font = "13px system-ui";
  ctx.fillText(useSankey ? "Sankey → Elec payı (%) — her satır bir senaryo" : "Yakıt payı (%) — her satır bir senaryo", pad.l, 20);

  activeScenarios.forEach((s, si) => {
    const yMid = pad.t + si * rowH + rowH / 2;
    const tot = useSankey ? scenarioSankeyElecSupplyTotal(s) : scenarioFuelTotalFromList(s, resourceFuels);
    ctx.fillStyle = "#334155";
    ctx.font = "11px system-ui";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const lab = (s.label || s.folderName).slice(0, 22);
    ctx.fillText(lab, x0 - 8, yMid);

    if (tot <= 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("veri yok", x0, yMid);
      return;
    }

    let x = x0;
    const segs = [];
    head.forEach((f) => {
      const v = useSankey
        ? Number(s.electricitySankeySupplyGwh?.[f]) || 0
        : Number(s.totalOutput?.[f]) || 0;
      segs.push({ label: f, val: v });
    });
    let other = 0;
    tail.forEach((f) => {
      other += useSankey
        ? Number(s.electricitySankeySupplyGwh?.[f]) || 0
        : Number(s.totalOutput?.[f]) || 0;
    });
    if (tail.length && other > 0) {
      segs.push({ label: "Diğer", val: other });
    }

    segs.forEach((seg, j) => {
      const frac = seg.val / tot;
      const segW = Math.max(0, frac * barW);
      if (segW >= 0.5) {
        ctx.fillStyle = FUEL_SHARE_COLORS[j % FUEL_SHARE_COLORS.length];
        ctx.fillRect(x, yMid - 14, segW, 28);
        if (frac >= 0.08) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 10px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${(100 * frac).toFixed(0)}%`, x + segW / 2, yMid);
        }
      }
      x += segW;
    });

    ctx.strokeStyle = "#cbd5e1";
    ctx.strokeRect(x0, yMid - 14, barW, 28);
  });

  let lx = x0;
  const ly = h - pad.b + 18;
  labelParts.forEach((name, j) => {
    ctx.fillStyle = FUEL_SHARE_COLORS[j % FUEL_SHARE_COLORS.length];
    ctx.fillRect(lx, ly, 10, 10);
    lx += 14;
    ctx.fillStyle = "#475569";
    ctx.font = "10px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const short = name.length > 14 ? `${name.slice(0, 12)}…` : name;
    ctx.fillText(short, lx, ly - 1);
    lx += ctx.measureText(short).width + 12;
    if (lx > w - 40) {
      lx = x0;
    }
  });
}

function renderGroupedBarChart(canvas, activeScenarios, categories, getValue, title) {
  const ctx = canvas.getContext("2d");
  clearCanvas(canvas);
  const width = canvas.width;
  const height = canvas.height;
  const padding = { l: 52, r: 16, t: 36, b: 88 };
  const chartW = width - padding.l - padding.r;
  const chartH = height - padding.t - padding.b;
  const nS = Math.max(activeScenarios.length, 1);
  const nC = Math.max(categories.length, 1);
  let maxVal = 1;
  activeScenarios.forEach((s) => {
    categories.forEach((c) => {
      maxVal = Math.max(maxVal, getValue(s, c) || 0);
    });
  });

  ctx.fillStyle = "#0f172a";
  ctx.font = "14px system-ui";
  ctx.fillText(title, padding.l, 22);

  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(padding.l, height - padding.b);
  ctx.lineTo(width - padding.r, height - padding.b);
  ctx.moveTo(padding.l, padding.t);
  ctx.lineTo(padding.l, height - padding.b);
  ctx.stroke();

  const groupW = chartW / nC;
  const innerPad = groupW * 0.08;
  const barSlot = (groupW - innerPad * 2) / nS;
  const barW = barSlot * 0.82;

  categories.forEach((cat, ci) => {
    const gx = padding.l + ci * groupW + innerPad;
    activeScenarios.forEach((s, si) => {
      const val = getValue(s, cat) || 0;
      const barH = (val / maxVal) * chartH;
      const x = gx + si * barSlot + (barSlot - barW) / 2;
      const y = height - padding.b - barH;
      ctx.fillStyle = SCENARIO_COLORS[si % SCENARIO_COLORS.length];
      ctx.fillRect(x, y, barW, barH);
    });

    ctx.save();
    ctx.fillStyle = "#475569";
    ctx.font = "9px system-ui";
    ctx.translate(padding.l + ci * groupW + groupW / 2, height - padding.b + 8);
    ctx.rotate(-Math.PI / 5);
    ctx.textAlign = "right";
    const short = cat.length > 18 ? `${cat.slice(0, 16)}…` : cat;
    ctx.fillText(short, 0, 0);
    ctx.restore();
  });

  let lx = padding.l;
  const ly = padding.t - 6;
  activeScenarios.forEach((s, si) => {
    ctx.fillStyle = SCENARIO_COLORS[si % SCENARIO_COLORS.length];
    ctx.fillRect(lx, ly, 12, 8);
    lx += 16;
    ctx.fillStyle = "#334155";
    ctx.font = "10px system-ui";
    const lab = (s.label || s.folderName).slice(0, 28);
    ctx.fillText(lab, lx, ly + 8);
    lx += ctx.measureText(lab).width + 14;
    if (lx > width - 100) {
      lx = padding.l;
    }
  });
}

function renderMetricsTable(active) {
  const rows = active
    .map(
      (s) => {
        const price = s.kpi?.energyPriceEurPerMwh;
        const emissions = s.kpi?.totalEmissionsKtCO2;
        const demandGWh = s.kpi?.electricityDemandGWh;
        return `
        <tr>
          <td>${s.label || s.folderName}</td>
          <td>${s.solved === false ? "Çözüm yok" : "Çözüldü"}</td>
          <td>${formatNumber(s.totalCost)}</td>
          <td>${formatNumber(s.totalGwp)}</td>
          <td>${demandGWh != null ? formatNumber(demandGWh) : "—"}</td>
          <td style="font-weight:600">${price != null ? formatNumber(price, 2) : "—"}</td>
          <td style="font-weight:600">${emissions != null ? formatNumber(emissions, 1) : "—"}</td>
        </tr>
      `;
      }
    )
    .join("");

  metricsTableEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Senaryo</th>
          <th>Durum</th>
          <th>TotalCost (MEUR)</th>
          <th>TotalGWP (ktCO₂eq)</th>
          <th>Elektrik talebi (GWh)</th>
          <th>Enerji fiyatı (EUR/MWh)</th>
          <th>Toplam emisyon (ktCO₂eq)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function updateFailBanner() {
  const el = document.getElementById("scenario-fail-banner");
  if (!el) return;
  const bad = (expectedScenarios || []).filter((s) => !s.solved);
  if (!bad.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  const items = bad
    .map(
      (s) =>
        `<li><strong>${escapeHtml(s.label || s.folderName)}</strong> — ${escapeHtml(s.statusReason || "bilinmiyor")}</li>`
    )
    .join("");
  el.innerHTML = `
    <strong>Beklenen senaryolardan ${bad.length} tanesi çözülmedi veya metrik dosyası eksik</strong>
    <ul>${items}</ul>
    <p class="muted" style="margin: 0.6rem 0 0; color: #991b1b">
      Çözücü günlüğü: aşağıdaki tabloda «Hata günlüğü» sütunundan açın; veya
      <code>output_* /scenario_run_error.txt</code> dosyasına bakın.
    </p>
  `;
}

function renderSolutionStatus() {
  if (!expectedScenarios.length) {
    solutionStatusEl.innerHTML = "<p class=\"muted\">Beklenen senaryo listesi yok.</p>";
    updateFailBanner();
    return;
  }
  const rows = expectedScenarios
    .map((s) => {
      const status = s.solved ? "Çözüldü" : "Çözüm yok";
      const reason = s.solved ? "ok" : escapeHtml(s.statusReason || "bilinmiyor");
      const rowClass = s.solved ? "" : "row-solve-fail";
      const errCell =
        !s.solved && s.runError
          ? `<details class="run-error-details"><summary>Hata günlüğünü göster</summary><pre class="run-error-pre">${escapeHtml(s.runError)}</pre></details>`
          : !s.solved
            ? "<span class=\"muted\">— (<code>scenario_run_error.txt</code> yok; koşuyu yeniden çalıştırın)</span>"
            : "—";
      return `
        <tr class="${rowClass}">
          <td>${escapeHtml(s.label || s.folderName)}</td>
          <td>${status}</td>
          <td>${reason}</td>
          <td>${errCell}</td>
        </tr>
      `;
    })
    .join("");

  solutionStatusEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Beklenen senaryo</th>
          <th>Durum</th>
          <th>Özet</th>
          <th>Hata günlüğü</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  updateFailBanner();
}

function setupTechSelector(active) {
  const techSet = new Set();
  active.forEach((s) => Object.keys(s.totalOutput || {}).forEach((k) => techSet.add(k)));
  const techs = Array.from(techSet).sort((a, b) => {
    const sumA = active.reduce((acc, s) => acc + (s.totalOutput?.[a] || 0), 0);
    const sumB = active.reduce((acc, s) => acc + (s.totalOutput?.[b] || 0), 0);
    return sumB - sumA;
  });

  const topTechs = techs.slice(0, 12);
  techSelectorEl.innerHTML = topTechs
    .map((tech) => `<option value="${escapeHtml(tech)}">${escapeHtml(tech)}</option>`)
    .join("");
  if (!topTechs.length) {
    return;
  }
  if (!topTechs.includes(techSelectorEl.value)) {
    techSelectorEl.value = topTechs[0];
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function renderTechChart(active) {
  const selectedTech = techSelectorEl.value;
  if (!selectedTech || !active.length) {
    clearCanvas(techChart);
    return;
  }
  const data = active.map((s) => ({
    folderName: s.label || s.folderName,
    value: s.totalOutput?.[selectedTech] || 0
  }));
  renderBarChart(techChart, data, "value", `${selectedTech} — yıllık çıktı`);
}

function renderCostPivot(active) {
  const techTotals = new Map();
  active.forEach((scenario) => {
    for (const [tech, values] of Object.entries(scenario.costBreakdown || {})) {
      const prev = techTotals.get(tech) || 0;
      techTotals.set(tech, prev + (values.cOp || 0));
    }
  });

  const topTechs = Array.from(techTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tech]) => tech);

  const header = active.map((s) => `<th>${escapeHtml(s.label || s.folderName)}</th>`).join("");
  const rows = topTechs
    .map((tech) => {
      const cols = active
        .map((s) => {
          const v = s.costBreakdown?.[tech]?.sum || 0;
          return `<td>${formatNumber(v)}</td>`;
        })
        .join("");
      return `<tr><td>${escapeHtml(tech)}</td>${cols}</tr>`;
    })
    .join("");

  costPivotEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Teknoloji</th>
          ${header}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderIntensityChart(active) {
  const data = active.map((s) => ({
    folderName: s.label || s.folderName,
    intensity: s.kpi?.gwpPerGWh ?? null
  }));
  renderBarChart(intensityChart, data, "intensity", "GWP / GWh elektrik");
}

function renderEnergyPriceChart(active) {
  if (!energyPriceChart) return;
  const data = active.map((s) => ({
    folderName: s.label || s.folderName,
    price: s.kpi?.energyPriceEurPerMwh ?? null
  }));
  renderBarChart(energyPriceChart, data, "price", "Enerji fiyatı (EUR/MWh)");
}

function renderTotalEmissionsChart(active) {
  if (!totalEmissionsChart) return;
  const data = active.map((s) => ({
    folderName: s.label || s.folderName,
    emissions: s.kpi?.totalEmissionsKtCO2 ?? null
  }));
  renderBarChart(totalEmissionsChart, data, "emissions", "Toplam emisyon (ktCO₂eq)");
}

function renderBarChart(canvas, data, valueKey, title) {
  const ctx = canvas.getContext("2d");
  clearCanvas(canvas);

  const width = canvas.width;
  const height = canvas.height;
  const padding = 42;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const values = data.map((d) => (d[valueKey] == null || !Number.isFinite(d[valueKey]) ? 0 : d[valueKey]));
  const maxVal = Math.max(...values, 1);
  const barWidth = (chartW / Math.max(data.length, 1)) * 0.65;
  const step = chartW / Math.max(data.length, 1);

  ctx.fillStyle = "#0f172a";
  ctx.font = "13px system-ui";
  ctx.fillText(title, padding, 20);

  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();

  data.forEach((row, i) => {
    const x = padding + i * step + (step - barWidth) / 2;
    const value = values[i];
    const barH = (value / maxVal) * chartH;
    const y = height - padding - barH;

    ctx.fillStyle = SCENARIO_COLORS[i % SCENARIO_COLORS.length];
    ctx.fillRect(x, y, barWidth, barH);

    ctx.fillStyle = "#475569";
    ctx.font = "9px system-ui";
    ctx.save();
    ctx.translate(x + barWidth / 2, height - padding + 10);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = "left";
    const lab = String(row.folderName).slice(0, 22);
    ctx.fillText(lab, 0, 0);
    ctx.restore();
  });
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function formatNumber(value, maxDecimals) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const digits = maxDecimals !== undefined ? maxDecimals : 3;
  return value.toLocaleString("tr-TR", { maximumFractionDigits: digits });
}

/** Same Plotly Sankey trace shape as `output_turkey_reference_case/dashboard.html`. */
function buildPlotlySankeyTrace(links) {
  const names = [...new Set(links.flatMap((l) => [l.source, l.target]))];
  const idx = new Map(names.map((n, i) => [n, i]));
  const labelColor = Object.fromEntries(links.map((l) => [l.source, l.color]));
  const nodeColors = names.map((n) => labelColor[n] || "rgba(59,130,246,0.7)");
  return {
    type: "sankey",
    arrangement: "snap",
    node: {
      label: names,
      color: nodeColors,
      pad: 14,
      thickness: 14,
      line: { color: "#94a3b8", width: 0.5 }
    },
    link: {
      source: links.map((l) => idx.get(l.source)),
      target: links.map((l) => idx.get(l.target)),
      value: links.map((l) => l.value),
      color: links.map((l) => `${l.color || "#3b82f6"}88`)
    }
  };
}

function renderSankeySection(active) {
  sankeyStackEl.innerHTML = "";
  if (typeof Plotly === "undefined") {
    sankeyStackEl.innerHTML =
      "<p class=\"muted\">Plotly yüklenemedi; Sankey çizilemiyor. Ağ bağlantısı veya <code>scenario_dashboard.html</code> içindeki Plotly script etiketini kontrol edin.</p>";
    return;
  }
  const withData = active.filter((s) => Array.isArray(s.sankeyLinks) && s.sankeyLinks.length);
  if (!withData.length) {
    sankeyStackEl.innerHTML =
      "<p class=\"muted\">Seçili senaryolarda <code>sankey/input2sankey.csv</code> yok veya yalnızca başlık satırı var (veri satırı yok). Model başarıyla çözüldüğünde akışlar oluşur.</p>";
    return;
  }

  withData.forEach((s) => {
    const wrap = document.createElement("div");
    wrap.className = "sankey-panel sankey-panel--plotly";
    const head = document.createElement("div");
    head.className = "sankey-panel__head";
    const title = document.createElement("h2");
    title.className = "sankey-panel__title";
    title.textContent = "Sankey (sankey/input2sankey.csv)";
    const scen = document.createElement("div");
    scen.className = "sankey-panel__scenario";
    scen.textContent = s.label || s.folderName;
    const meta = document.createElement("p");
    meta.className = "panel-meta";
    meta.textContent = `${s.folderName}/sankey/input2sankey.csv — ${s.sankeyLinks.length} akış (TWh)`;
    head.appendChild(title);
    head.appendChild(scen);
    wrap.appendChild(head);
    wrap.appendChild(meta);
    const host = document.createElement("div");
    host.className = "sankey-chart-host";
    host.id = `sankey-${sanitizeId(s.folderName)}`;
    wrap.appendChild(host);
    sankeyStackEl.appendChild(wrap);

    const trace = buildPlotlySankeyTrace(s.sankeyLinks);
    Plotly.newPlot(
      host,
      [trace],
      {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#0f172a", size: 12 },
        margin: { l: 8, r: 8, t: 8, b: 8 }
      },
      { displaylogo: false, responsive: true }
    );
  });
}

const CARD_STORAGE_KEY = "scenario_dashboard_cards_v1";

function setCardCollapsed(card, toggle, collapsed) {
  card.dataset.collapsed = collapsed ? "true" : "false";
  toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
}

function initCollapsibleCards() {
  let stored = {};
  try {
    stored = JSON.parse(sessionStorage.getItem(CARD_STORAGE_KEY) || "{}");
  } catch {
    stored = {};
  }
  document.querySelectorAll(".card[data-collapsible]").forEach((card) => {
    const id = card.dataset.cardId;
    const toggle = card.querySelector(".card__toggle");
    if (!toggle) return;
    if (id && Object.prototype.hasOwnProperty.call(stored, id) && stored[id] === false) {
      setCardCollapsed(card, toggle, true);
    } else {
      setCardCollapsed(card, toggle, false);
    }
    toggle.addEventListener("click", () => {
      const wasCollapsed = card.dataset.collapsed === "true";
      const nowCollapsed = !wasCollapsed;
      setCardCollapsed(card, toggle, nowCollapsed);
      if (id) {
        const next = { ...JSON.parse(sessionStorage.getItem(CARD_STORAGE_KEY) || "{}") };
        next[id] = !nowCollapsed;
        sessionStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(next));
      }
    });
  });
}

function initExportButtons() {
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-export-xlsx");
    if (!btn) return;
    const target = btn.getAttribute("data-export-target");
    const file = btn.getAttribute("data-export-filename") || "export";
    if (target) {
      exportTableFromContainer(target, file);
    }
  });
}

function ensureXlsx() {
  if (typeof XLSX === "undefined" || !XLSX.utils) {
    setStatus("XLSX için SheetJS yüklenemedi; CDN veya internet erişimini kontrol edin.", true);
    return false;
  }
  return true;
}

function safeSheetName(name) {
  return String(name)
    .replace(/[:\\/?*[\]]/g, "_")
    .replace(/'/g, "_")
    .slice(0, 31);
}

function exportTableFromContainer(containerId, filenameBase) {
  if (!ensureXlsx()) return;
  const root = document.getElementById(containerId);
  if (!root) return;
  const table = root.querySelector("table");
  if (!table) {
    setStatus("Dışa aktarılacak tablo henüz yok veya boş.", true);
    return;
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  const sheet = safeSheetName(filenameBase || "Veri");
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const base = (filenameBase || "export").replace(/[^\w\-]+/g, "_");
  XLSX.writeFile(wb, `${base}_${ts}.xlsx`);
  setStatus(`XLSX indirildi: ${base}_${ts}.xlsx`, false);
}

function exportAllTablesXlsx() {
  if (!ensureXlsx()) return;
  const specs = [
    { id: "energy-summary-table", sheet: "Enerji_ozeti" },
    { id: "fuel-share-table", sheet: "Yakit_paylari" },
    { id: "installed-capacity-table", sheet: "Kurulu_guc" },
    { id: "solution-status", sheet: "Cozum_durumu" },
    { id: "cost-pivot", sheet: "Maliyet_kirilim" },
    { id: "metrics-table", sheet: "Ozet_metrikler" }
  ];
  const wb = XLSX.utils.book_new();
  let count = 0;
  for (const { id, sheet } of specs) {
    const root = document.getElementById(id);
    const table = root?.querySelector("table");
    if (!table) continue;
    const ws = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheet));
    count++;
  }
  if (!count) {
    setStatus("Dışa aktarılacak tablo bulunamadı.", true);
    return;
  }
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `senaryo_dashboard_tablolar_${ts}.xlsx`);
  setStatus(`Tek XLSX içinde ${count} çalışma sayfası indirildi.`, false);
}
