const pickFolderBtn = document.getElementById("pick-folder-btn");
const reloadBtn = document.getElementById("reload-btn");
const statusEl = document.getElementById("status");
const scenarioListEl = document.getElementById("scenario-list");
const solutionStatusEl = document.getElementById("solution-status");
const metricsTableEl = document.getElementById("metrics-table");
const costPivotEl = document.getElementById("cost-pivot");
const techSelectorEl = document.getElementById("tech-selector");

const costChart = document.getElementById("cost-chart");
const gwpChart = document.getElementById("gwp-chart");
const intensityChart = document.getElementById("intensity-chart");
const techChart = document.getElementById("tech-chart");

let projectDirHandle = null;
let scenarios = [];
let expectedScenarios = [];

pickFolderBtn.addEventListener("click", async () => {
  try {
    projectDirHandle = await window.showDirectoryPicker();
    reloadBtn.disabled = false;
    await loadDashboard();
  } catch (error) {
    setStatus(`Folder selection cancelled or failed: ${error.message}`, true);
  }
});

reloadBtn.addEventListener("click", async () => {
  if (!projectDirHandle) return;
  await loadDashboard();
});

techSelectorEl.addEventListener("change", () => {
  renderTechChart();
});

window.addEventListener("DOMContentLoaded", () => {
  if (loadFromPrecomputedData()) {
    return;
  }
  setStatus("Waiting for folder selection...");
});

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#dc2626" : "#16a34a";
}

async function loadDashboard() {
  setStatus("Scanning output folders...");
  try {
    scenarios = await scanScenarios(projectDirHandle);
    if (!scenarios.length) {
      scenarioListEl.innerHTML = "<p>No output* folders with scenario_metrics.txt found.</p>";
      metricsTableEl.innerHTML = "";
      costPivotEl.innerHTML = "";
      clearCanvas(costChart);
      clearCanvas(gwpChart);
      clearCanvas(intensityChart);
      clearCanvas(techChart);
      setStatus("No scenarios found.", true);
      return;
    }

    renderScenarioList();
    renderMetricsTable();
    renderBarChart(costChart, scenarios, "totalCost", "TotalCost");
    renderBarChart(gwpChart, scenarios, "totalGwp", "TotalGWP");
    renderIntensityChart();
    setupTechSelector();
    renderCostPivot();
    setStatus(`Loaded ${scenarios.length} scenarios successfully.`);
  } catch (error) {
    setStatus(`Failed to load dashboard: ${error.message}`, true);
  }
}

function loadFromPrecomputedData() {
  const payload = window.SCENARIO_DASHBOARD_DATA;
  if (!payload || !Array.isArray(payload.scenarios) || payload.scenarios.length === 0) {
    return false;
  }

  scenarios = payload.scenarios;
  expectedScenarios = Array.isArray(payload.expectedScenarios) ? payload.expectedScenarios : [];
  renderScenarioList();
  renderSolutionStatus();
  renderMetricsTable();
  renderBarChart(costChart, scenarios, "totalCost", "TotalCost");
  renderBarChart(gwpChart, scenarios, "totalGwp", "TotalGWP");
  renderIntensityChart();
  setupTechSelector();
  renderCostPivot();

  const generatedAt = payload.generatedAt ? ` (generated ${payload.generatedAt})` : "";
  const unsolved = Number(payload.unsolvedExpectedCount || 0);
  const unsolvedSuffix = unsolved > 0 ? ` WARNING: ${unsolved} expected scenario(s) have no solution.` : "";
  setStatus(`Loaded ${scenarios.length} scenarios from precomputed data${generatedAt}.${unsolvedSuffix}`, unsolved > 0);
  return true;
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
      costBreakdown: {}
    };

    const metricsFile = await getOptionalFile(handle, "scenario_metrics.txt");
    if (!metricsFile) continue;
    Object.assign(scenario, parseScenarioMetrics(await readText(metricsFile)));

    const totalOutputFile = await getOptionalFile(handle, "total_output.txt");
    if (totalOutputFile) {
      scenario.totalOutput = parseTwoColumnNumericTable(await readText(totalOutputFile), "Name");
    }

    const costBreakdownFile = await getOptionalFile(handle, "cost_breakdown.txt");
    if (costBreakdownFile) {
      scenario.costBreakdown = parseCostBreakdown(await readText(costBreakdownFile));
    }

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

async function readText(fileHandle) {
  const file = await fileHandle.getFile();
  return file.text();
}

function parseScenarioMetrics(content) {
  const result = { totalCost: null, totalGwp: null };
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const [key, rawValue] = line.split(/\s+/);
    const value = Number(rawValue);
    if (key === "TotalCost" && Number.isFinite(value)) result.totalCost = value;
    if (key === "TotalGWP" && Number.isFinite(value)) result.totalGwp = value;
  }
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

function renderScenarioList() {
  const listItems = scenarios
    .map((s) => `<li><code>${s.folderName}</code></li>`)
    .join("");
  scenarioListEl.innerHTML = `<ul>${listItems}</ul>`;
}

function renderMetricsTable() {
  const rows = scenarios
    .map(
      (s) => `
        <tr>
          <td>${s.folderName}</td>
          <td>${s.solved === false ? "No solution" : "Solved"}</td>
          <td>${formatNumber(s.totalCost)}</td>
          <td>${formatNumber(s.totalGwp)}</td>
        </tr>
      `
    )
    .join("");

  metricsTableEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Scenario</th>
          <th>Status</th>
          <th>TotalCost</th>
          <th>TotalGWP</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderSolutionStatus() {
  if (!expectedScenarios.length) {
    solutionStatusEl.innerHTML = "<p>Expected scenario list is not available.</p>";
    return;
  }
  const rows = expectedScenarios
    .map((s) => {
      const status = s.solved ? "Solved" : "No solution";
      const reason = s.solved ? "ok" : (s.statusReason || "unknown");
      return `
        <tr>
          <td>${s.label || s.folderName}</td>
          <td>${status}</td>
          <td>${reason}</td>
        </tr>
      `;
    })
    .join("");

  solutionStatusEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Expected Scenario</th>
          <th>Status</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function setupTechSelector() {
  const techSet = new Set();
  scenarios.forEach((s) => Object.keys(s.totalOutput).forEach((k) => techSet.add(k)));
  const techs = Array.from(techSet).sort((a, b) => {
    const sumA = scenarios.reduce((acc, s) => acc + (s.totalOutput[a] || 0), 0);
    const sumB = scenarios.reduce((acc, s) => acc + (s.totalOutput[b] || 0), 0);
    return sumB - sumA;
  });

  const topTechs = techs.slice(0, 10);
  techSelectorEl.innerHTML = topTechs.map((tech) => `<option value="${tech}">${tech}</option>`).join("");
  if (topTechs.length) techSelectorEl.value = topTechs[0];
  renderTechChart();
}

function renderTechChart() {
  const selectedTech = techSelectorEl.value;
  if (!selectedTech) {
    clearCanvas(techChart);
    return;
  }
  const data = scenarios.map((s) => ({
    folderName: s.folderName,
    value: s.totalOutput[selectedTech] || 0
  }));
  renderBarChart(techChart, data, "value", `${selectedTech} yearly output`);
}

function renderCostPivot() {
  const techTotals = new Map();
  scenarios.forEach((scenario) => {
    for (const [tech, values] of Object.entries(scenario.costBreakdown)) {
      const prev = techTotals.get(tech) || 0;
      techTotals.set(tech, prev + (values.cOp || 0));
    }
  });

  const topTechs = Array.from(techTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tech]) => tech);

  const header = scenarios.map((s) => `<th>${s.folderName}</th>`).join("");
  const rows = topTechs
    .map((tech) => {
      const cols = scenarios
        .map((s) => {
          const v = s.costBreakdown[tech]?.sum || 0;
          return `<td>${formatNumber(v)}</td>`;
        })
        .join("");
      return `<tr><td>${tech}</td>${cols}</tr>`;
    })
    .join("");

  costPivotEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Technology</th>
          ${header}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderIntensityChart() {
  const data = scenarios.map((s) => ({
    folderName: s.label || s.folderName,
    intensity: s.kpi?.gwpPerGWh ?? null
  }));
  renderBarChart(intensityChart, data, "intensity", "GWP per GWh");
}

function renderBarChart(canvas, data, valueKey, title) {
  const ctx = canvas.getContext("2d");
  clearCanvas(canvas);

  const width = canvas.width;
  const height = canvas.height;
  const padding = 42;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const values = data.map((d) => d[valueKey] ?? 0);
  const maxVal = Math.max(...values, 1);
  const barWidth = chartW / Math.max(data.length, 1) * 0.65;
  const step = chartW / Math.max(data.length, 1);

  ctx.fillStyle = "#111827";
  ctx.font = "14px Arial";
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
    const value = row[valueKey] ?? 0;
    const barH = (value / maxVal) * chartH;
    const y = height - padding - barH;

    ctx.fillStyle = "#2563eb";
    ctx.fillRect(x, y, barWidth, barH);

    ctx.fillStyle = "#334155";
    ctx.font = "10px Arial";
    ctx.save();
    ctx.translate(x + barWidth / 2, height - padding + 10);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = "left";
    ctx.fillText(row.folderName, 0, 0);
    ctx.restore();
  });
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
