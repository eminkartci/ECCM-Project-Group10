"use client";

import CollapsibleCard from "@/components/dashboard/CollapsibleCard";
import { escapeHtml } from "@/lib/escapeHtml";
import {
  costPivotTopTechs,
  formatMwhFromGwh,
  formatNumber,
  formatPercent,
  fuelShareUsesSankey,
  getCostRow,
  orderedFuelShareForTable,
  scenarioFuelTotalFromList,
  scenarioSankeyElecSupplyTotalGwh,
  sumObjectValues,
} from "@/lib/dashboardUtils";
import type { ExpectedScenarioRow, Scenario } from "@/lib/types";

function BtnExport({ targetId, filename }: { targetId: string; filename: string }) {
  return (
    <button
      type="button"
      className="rounded-md border border-slate-600 bg-slate-800/90 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
      onClick={() => {
        const root = document.getElementById(targetId);
        const table = root?.querySelector("table") as HTMLTableElement | null;
        if (table) {
          void import("@/lib/xlsxExport").then(({ exportTableFromElement }) => {
            exportTableFromElement(table, filename);
          });
        }
      }}
    >
      XLSX
    </button>
  );
}

type Props = {
  active: Scenario[];
  expectedScenarios: ExpectedScenarioRow[];
  fuelResources: string[];
};

export default function DashboardTables({ active, expectedScenarios, fuelResources }: Props) {
  const topCostTechs = costPivotTopTechs(active, 15);
  const useSankey = fuelShareUsesSankey(active);
  const fuelsOrdered = orderedFuelShareForTable(active, fuelResources);

  return (
    <div className="space-y-6">
      <CollapsibleCard cardId="solution" title="Beklenen senaryolar ve çözüm durumu" tools={<BtnExport targetId="solution-status" filename="cozum_durumu" />}>
        <div id="solution-status" className="overflow-x-auto rounded-lg border border-slate-700/60">
          {!expectedScenarios.length ? (
            <p className="p-4 text-sm text-slate-500">Beklenen senaryo listesi yok.</p>
          ) : (
            <table className="min-w-full border-collapse text-left text-xs text-slate-200">
              <thead className="sticky top-0 bg-slate-900/95 text-slate-400">
                <tr>
                  <th className="border-b border-slate-700 px-3 py-2 font-medium">Beklenen senaryo</th>
                  <th className="border-b border-slate-700 px-3 py-2 font-medium">Durum</th>
                  <th className="border-b border-slate-700 px-3 py-2 font-medium">Özet</th>
                  <th className="border-b border-slate-700 px-3 py-2 font-medium">Hata günlüğü</th>
                </tr>
              </thead>
              <tbody>
                {expectedScenarios.map((s) => (
                  <tr key={s.folderName} className={s.solved ? "" : "bg-red-950/25"}>
                    <td className="border-b border-slate-800 px-3 py-2">{escapeHtml(s.label || s.folderName)}</td>
                    <td className="border-b border-slate-800 px-3 py-2">{s.solved ? "Çözüldü" : "Çözüm yok"}</td>
                    <td className="border-b border-slate-800 px-3 py-2 text-slate-300">
                      {s.solved ? "ok" : escapeHtml(s.statusReason || "bilinmiyor")}
                    </td>
                    <td className="border-b border-slate-800 px-3 py-2">
                      {!s.solved && s.runError ? (
                        <details className="cursor-pointer text-slate-300">
                          <summary className="text-emerald-400/90">Hata günlüğünü göster</summary>
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-2 text-[11px] text-slate-400">
                            {s.runError}
                          </pre>
                        </details>
                      ) : !s.solved ? (
                        <span className="text-slate-500">— (scenario_run_error.txt yok)</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        cardId="energy"
        title="Enerji özeti tablosu"
        tools={
          <>
            <BtnExport targetId="energy-summary-table" filename="enerji_ozeti" />
            <BtnExport targetId="fuel-share-table" filename="yakit_paylari" />
          </>
        }
      >
        <div id="energy-summary-table" className="overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="min-w-full border-collapse text-left text-xs text-slate-200">
            <thead className="bg-slate-900/95 text-slate-400">
              <tr>
                <th className="border-b border-slate-700 px-3 py-2 font-medium">Senaryo</th>
                <th className="border-b border-slate-700 px-3 py-2 font-medium">Durum</th>
                <th className="border-b border-slate-700 px-3 py-2 font-medium">Talep özeti (GWh)</th>
                <th className="border-b border-slate-700 px-3 py-2 font-medium">Elektrik üretimi (GWh)</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => {
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
                if (supply != null && Number.isFinite(supply) && supply > 0) elecCell = formatNumber(supply);
                else if (rowE != null && Number.isFinite(rowE) && rowE > 0) elecCell = formatNumber(rowE);
                else if (supply === 0) elecCell = "0";
                return (
                  <tr key={s.folderName} className="border-b border-slate-800">
                    <td className="px-3 py-2">{escapeHtml(s.label || s.folderName)}</td>
                    <td className="px-3 py-2">{s.solved === false ? "Çözüm yok" : "Çözüldü"}</td>
                    <td className="px-3 py-2">{demandCell}</td>
                    <td className="px-3 py-2">{elecCell}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Talep: End_Uses.txt. Elektrik: TECHNOLOGIES_OF_END_USES_TYPE[ELECTRICITY] toplamı.
        </p>

        <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {useSankey
            ? "Elektrik kaynakları (MWh) — Sankey → Elec (input2sankey.csv)"
            : "Yakıt üretimi (MWh) — RESOURCES / total_output"}
        </h4>
        <div id="fuel-share-table" className="overflow-x-auto rounded-lg border border-slate-700/60">
          {!useSankey && !fuelResources.length ? (
            <p className="p-4 text-sm text-slate-500">sets.txt / RESOURCES yok.</p>
          ) : !fuelsOrdered.length ? (
            <p className="p-4 text-sm text-slate-500">
              {useSankey ? "Sankey dosyasında Elec hedefine akış yok." : "Pozitif yakıt çıktısı yok."}
            </p>
          ) : (
            <table className="min-w-full border-collapse text-left text-xs text-slate-200">
              <thead className="bg-slate-900/95 text-slate-400">
                <tr>
                  <th className="border-b border-slate-700 px-3 py-2 font-medium">
                    {useSankey ? (
                      <>
                        Kaynak <span className="mt-0.5 block text-[10px] font-normal text-slate-500">Sankey → Elec</span>
                      </>
                    ) : (
                      "Yakıt (RESOURCES)"
                    )}
                  </th>
                  {active.map((s) => (
                    <th key={s.folderName} className="border-b border-slate-700 px-3 py-2 font-medium">
                      <span className="block">{escapeHtml(s.label || s.folderName)}</span>
                      <span className="mt-0.5 block text-[10px] font-normal text-slate-500">MWh · toplam içinde %</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fuelsOrdered.map((f) => (
                  <tr key={f} className="border-b border-slate-800">
                    <td className="px-3 py-2 font-mono text-[11px]">{escapeHtml(f)}</td>
                    {active.map((s) => {
                      const tot = useSankey
                        ? scenarioSankeyElecSupplyTotalGwh(s.electricitySankeySupplyGwh)
                        : scenarioFuelTotalFromList(s, fuelResources);
                      const v = useSankey
                        ? Number(s.electricitySankeySupplyGwh?.[f]) || 0
                        : Number(s.totalOutput?.[f]) || 0;
                      const pct = tot > 0 ? (100 * v) / tot : 0;
                      return (
                        <td
                          key={s.folderName}
                          className="whitespace-nowrap px-3 py-2 align-top"
                          title={`${formatNumber(v)} GWh`}
                        >
                          {tot > 0 ? (
                            <>
                              <span className="block tabular-nums">{formatMwhFromGwh(v)}</span>
                              <span className="mt-0.5 block text-[11px] text-slate-500">{formatPercent(pct)}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900/40 text-slate-300">
                <tr>
                  <td className="border-t border-slate-700 px-3 py-2 font-medium">
                    Toplam{" "}
                    <span className="text-[10px] font-normal text-slate-500">
                      {useSankey ? "(Sankey → Elec)" : "(liste içi RESOURCES)"}
                    </span>
                  </td>
                  {active.map((s) => {
                    const tot = useSankey
                      ? scenarioSankeyElecSupplyTotalGwh(s.electricitySankeySupplyGwh)
                      : scenarioFuelTotalFromList(s, fuelResources);
                    return (
                      <td key={s.folderName} className="border-t border-slate-700 px-3 py-2 align-top">
                        {tot > 0 ? (
                          <>
                            <span className="block tabular-nums font-semibold">{formatMwhFromGwh(tot)}</span>
                            <span className="mt-0.5 block text-[11px] text-slate-500">%100</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard cardId="cost-pivot" title="Maliyet kırılımı (C_op toplamına göre üst 15)" tools={<BtnExport targetId="cost-pivot" filename="maliyet_kirilimi" />}>
        <div id="cost-pivot" className="overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="min-w-full border-collapse text-left text-xs text-slate-200">
            <thead className="bg-slate-900/95 text-slate-400">
              <tr>
                <th className="border-b border-slate-700 px-3 py-2 font-medium">Teknoloji</th>
                {active.map((s) => (
                  <th key={s.folderName} className="border-b border-slate-700 px-3 py-2 font-medium">
                    {escapeHtml(s.label || s.folderName)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCostTechs.map((tech) => (
                <tr key={tech} className="border-b border-slate-800">
                  <td className="px-3 py-2 font-mono text-[11px]">{escapeHtml(tech)}</td>
                  {active.map((s) => (
                    <td key={s.folderName} className="px-3 py-2">
                      {formatNumber(getCostRow(tech, s)?.sum ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>

      <CollapsibleCard cardId="metrics" title="Özet tablo" tools={<BtnExport targetId="metrics-table" filename="ozet_metrikler" />}>
        <div id="metrics-table" className="overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="min-w-full border-collapse text-left text-xs text-slate-200">
            <thead className="bg-slate-900/95 text-slate-400">
              <tr>
                <th className="border-b border-slate-700 px-3 py-2 font-medium">Senaryo</th>
                <th className="border-b border-slate-700 px-3 py-2 font-medium">Durum</th>
                <th className="border-b border-slate-700 px-3 py-2 font-medium">TotalCost</th>
                <th className="border-b border-slate-700 px-3 py-2 font-medium">TotalGWP</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => (
                <tr key={s.folderName} className="border-b border-slate-800">
                  <td className="px-3 py-2">{escapeHtml(s.label || s.folderName)}</td>
                  <td className="px-3 py-2">{s.solved === false ? "Çözüm yok" : "Çözüldü"}</td>
                  <td className="px-3 py-2">{formatNumber(s.totalCost)}</td>
                  <td className="px-3 py-2">{formatNumber(s.totalGwp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>
    </div>
  );
}
