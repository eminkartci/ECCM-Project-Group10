"use client";

import type { ApexOptions } from "apexcharts";
import ApexChart from "@/components/charts/ApexChart";
import { SCENARIO_COLORS } from "@/lib/constants";
import {
  buildFuelShareStackedPercent,
  fuelShareUsesSankey,
  orderedFuelShareForTable,
  techOptionsForScenarios,
  topKeysByAggregate,
} from "@/lib/dashboardUtils";
import { apexDarkBase } from "@/lib/apexTheme";
import type { Scenario } from "@/lib/types";

type Props = {
  active: Scenario[];
  fuelResources: string[];
  selectedTech: string;
  onTechChange: (tech: string) => void;
};

function chartOpts(partial: ApexOptions): ApexOptions {
  return {
    ...apexDarkBase,
    ...partial,
    chart: { ...apexDarkBase.chart, ...partial.chart },
  };
}

export default function DashboardCharts({ active, fuelResources, selectedTech, onTechChange }: Props) {
  const scenarioLabels = active.map((s) => s.label || s.folderName);

  const costOptions = chartOpts({
    chart: { type: "bar" },
    plotOptions: { bar: { borderRadius: 3, columnWidth: "62%" } },
    xaxis: { categories: scenarioLabels, labels: { rotate: -35 } },
    yaxis: { title: { text: "TotalCost" } },
    colors: SCENARIO_COLORS.slice(0, active.length),
  });
  const costSeries = [
    {
      name: "TotalCost",
      data: active.map((s) => (s.totalCost != null && Number.isFinite(s.totalCost) ? s.totalCost : 0)),
    },
  ];

  const gwpOptions = chartOpts({
    chart: { type: "bar" },
    plotOptions: { bar: { borderRadius: 3, columnWidth: "62%" } },
    xaxis: { categories: scenarioLabels, labels: { rotate: -35 } },
    yaxis: { title: { text: "TotalGWP" } },
    colors: SCENARIO_COLORS.slice(0, active.length),
  });
  const gwpSeries = [
    {
      name: "TotalGWP",
      data: active.map((s) => (s.totalGwp != null && Number.isFinite(s.totalGwp) ? s.totalGwp : 0)),
    },
  ];

  const intensityData = active.map((s) => {
    const v = s.kpi?.gwpPerGWh;
    return v != null && Number.isFinite(v) ? v : 0;
  });
  const intensityOptions = chartOpts({
    chart: { type: "bar" },
    plotOptions: { bar: { borderRadius: 3, columnWidth: "62%" } },
    xaxis: { categories: scenarioLabels, labels: { rotate: -35 } },
    yaxis: { title: { text: "GWP / GWh" } },
    colors: SCENARIO_COLORS.slice(0, active.length),
  });
  const intensitySeries = [{ name: "GWP yoğunluğu", data: intensityData }];

  const endCats = topKeysByAggregate(active, "endUsesAnnual", 10);
  const endOptions = chartOpts({
    chart: { type: "bar" },
    plotOptions: { bar: { borderRadius: 2, columnWidth: "72%" } },
    xaxis: { categories: endCats, labels: { rotate: -45, hideOverlappingLabels: false } },
    yaxis: { title: { text: "GWh" } },
    colors: SCENARIO_COLORS,
  });
  const endSeries =
    endCats.length > 0
      ? active.map((s, si) => ({
          name: s.label || s.folderName,
          data: endCats.map((c) => s.endUsesAnnual?.[c] || 0),
          color: SCENARIO_COLORS[si % SCENARIO_COLORS.length],
        }))
      : [];

  const prodCats = topKeysByAggregate(active, "totalOutput", 12);
  const prodOptions = chartOpts({
    chart: { type: "bar" },
    plotOptions: { bar: { borderRadius: 2, columnWidth: "72%" } },
    xaxis: { categories: prodCats, labels: { rotate: -45, hideOverlappingLabels: false } },
    yaxis: { title: { text: "GWh" } },
    colors: SCENARIO_COLORS,
  });
  const prodSeries =
    prodCats.length > 0
      ? active.map((s, si) => ({
          name: s.label || s.folderName,
          data: prodCats.map((c) => s.totalOutput?.[c] || 0),
          color: SCENARIO_COLORS[si % SCENARIO_COLORS.length],
        }))
      : [];

  const useSankey = fuelShareUsesSankey(active);
  const fuelsOrdered = orderedFuelShareForTable(active, fuelResources);
  const fuelBuilt =
    fuelsOrdered.length > 0
      ? buildFuelShareStackedPercent(active, fuelResources, fuelsOrdered, 9, {
          useSankey,
          resourceKeysForTotal: fuelResources,
        })
      : null;

  const fuelOptions = chartOpts({
    chart: { type: "bar", stacked: true, stackType: "100%" },
    plotOptions: { bar: { horizontal: true, borderRadius: 2 } },
    xaxis: { max: 100, tickAmount: 5, title: { text: "%" }, categories: scenarioLabels },
    colors: fuelBuilt?.colors,
    legend: { position: "bottom", horizontalAlign: "center" },
  });
  const fuelSeries = fuelBuilt?.seriesPct ?? [];

  const techOpts = techOptionsForScenarios(active);
  const techChartOptions = chartOpts({
    chart: { type: "bar" },
    plotOptions: { bar: { borderRadius: 3, columnWidth: "62%" } },
    xaxis: { categories: scenarioLabels, labels: { rotate: -35 } },
    yaxis: { title: { text: "GWh" } },
    colors: SCENARIO_COLORS.slice(0, active.length),
  });
  const techSeries = [
    {
      name: selectedTech,
      data: active.map((s) => s.totalOutput?.[selectedTech] || 0),
    },
  ];

  return (
    <div className="space-y-10">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Enerji: talep ve üretim</h3>
        <div className="grid gap-6 lg:grid-cols-1">
          {!endCats.length ? (
            <p className="text-sm text-slate-500">End_Uses.txt verisi yok veya tüm değerler sıfır.</p>
          ) : (
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-3">
              <p className="mb-2 text-xs text-slate-400">Taşıyıcı talebi (GWh)</p>
              <ApexChart type="bar" options={endOptions} series={endSeries} height={380} />
            </div>
          )}
          {!prodCats.length ? (
            <p className="text-sm text-slate-500">total_output verisi yok.</p>
          ) : (
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-3">
              <p className="mb-2 text-xs text-slate-400">Teknoloji yıllık çıktı (total_output, GWh)</p>
              <ApexChart type="bar" options={prodOptions} series={prodSeries} height={400} />
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">
          {useSankey
            ? "Elektrik kaynağı payları — Sankey → Elec (yığılmış %; tablo ile aynı veri)"
            : "Yakıt üretimi payları (RESOURCES; yığılmış %)"}
        </h3>
        {!fuelResources.length ? (
          <p className="text-sm text-slate-500">
            <code className="rounded bg-slate-800 px-1">sets.txt</code> yok veya RESOURCES okunamadı.
          </p>
        ) : !fuelsOrdered.length ? (
          <p className="text-sm text-slate-500">Seçili senaryolarda pozitif yakıt çıktısı yok.</p>
        ) : (
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-3">
            <ApexChart type="bar" options={fuelOptions} series={fuelSeries} height={Math.max(280, 80 + active.length * 56)} />
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Maliyet ve GWP</h3>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-3">
            <p className="mb-1 text-xs text-slate-400">Toplam maliyet</p>
            <ApexChart type="bar" options={costOptions} series={costSeries} height={300} />
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-3">
            <p className="mb-1 text-xs text-slate-400">Toplam GWP</p>
            <ApexChart type="bar" options={gwpOptions} series={gwpSeries} height={300} />
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-3">
            <p className="mb-1 text-xs text-slate-400">GWP yoğunluğu (GWP / elektrik GWh)</p>
            <ApexChart type="bar" options={intensityOptions} series={intensitySeries} height={300} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Teknoloji detayı</h3>
        <label className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          Teknoloji:
          <select
            className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            value={selectedTech}
            onChange={(e) => onTechChange(e.target.value)}
          >
            {techOpts.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {!techOpts.length ? (
          <p className="text-sm text-slate-500">Veri yok.</p>
        ) : (
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-3">
            <ApexChart type="bar" options={techChartOptions} series={techSeries} height={320} />
          </div>
        )}
      </section>
    </div>
  );
}
