"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import CollapsibleCard from "@/components/dashboard/CollapsibleCard";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardTables from "@/components/dashboard/DashboardTables";
import FailureBanner from "@/components/dashboard/FailureBanner";
import ScenarioSidebar from "@/components/dashboard/ScenarioSidebar";
import { aggregateSankeySupplyToElecGwh, techOptionsForScenarios } from "@/lib/dashboardUtils";
import { exportAllDashboardTables } from "@/lib/xlsxExport";
import type { DashboardPayload, Scenario } from "@/lib/types";

const SankeyStack = dynamic(() => import("@/components/dashboard/SankeyStack"), { ssr: false });

export default function DashboardApp() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sankeyVisible, setSankeyVisible] = useState(true);
  const [selectedTech, setSelectedTech] = useState("");
  const [exportToast, setExportToast] = useState<{ text: string; error: boolean } | null>(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (dataRefreshKey > 0) setIsReloading(true);
      try {
        const url = `/api/dashboard-data?ts=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const hint = typeof errBody?.error === "string" ? errBody.error : `${res.status} ${res.statusText}`;
          throw new Error(hint);
        }
        const data = (await res.json()) as DashboardPayload;
        if (cancelled) return;
        if (!data.scenarios?.length) {
          setLoadError("Senaryo listesi boş.");
          setPayload(null);
          return;
        }
        setPayload(data);
        setSelected((prev) => {
          const valid = new Set(data.scenarios.map((s) => s.folderName));
          const next = new Set<string>();
          prev.forEach((f) => {
            if (valid.has(f)) next.add(f);
          });
          return next.size > 0 ? next : valid;
        });
        setLoadError(null);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (dataRefreshKey === 0) {
          setLoadError(msg);
          setPayload(null);
        } else {
          setExportToast({ text: `Yenileme başarısız: ${msg}`, error: true });
        }
      } finally {
        if (!cancelled) setIsReloading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataRefreshKey]);

  const onReloadData = useCallback(() => {
    setDataRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!exportToast) return;
    const id = window.setTimeout(() => setExportToast(null), 6000);
    return () => window.clearTimeout(id);
  }, [exportToast]);

  const scenarios = useMemo(() => {
    const raw = payload?.scenarios ?? [];
    return raw.map((s) => {
      const fromPayload = s.electricitySankeySupplyGwh;
      const has =
        fromPayload &&
        typeof fromPayload === "object" &&
        Object.keys(fromPayload).some((k) => Number(fromPayload[k]) > 0);
      return {
        ...s,
        electricitySankeySupplyGwh: has ? fromPayload : aggregateSankeySupplyToElecGwh(s.sankeyLinks),
      };
    });
  }, [payload]);
  const expectedScenarios = useMemo(() => payload?.expectedScenarios ?? [], [payload]);
  const fuelResources = useMemo(() => payload?.fuelResourcesForShare ?? [], [payload]);

  const active = useMemo(
    () => scenarios.filter((s: Scenario) => selected.has(s.folderName)),
    [scenarios, selected]
  );

  const techOpts = useMemo(() => techOptionsForScenarios(active), [active]);
  const chartTech = techOpts.includes(selectedTech) ? selectedTech : techOpts[0] ?? "";

  const headerStatus = useMemo(() => {
    if (exportToast) return exportToast;
    if (!payload) return { text: "Veri yükleniyor…", error: false };
    if (!active.length) return { text: "Hiç senaryo seçilmedi; grafikler ve tablolar boş.", error: true };
    const unsolved = (payload.unsolvedExpectedCount ?? 0) > 0;
    const suffix = unsolved ? ` Uyarı: ${payload.unsolvedExpectedCount} beklenen senaryoda çözüm yok.` : "";
    return {
      text: `${active.length} senaryo seçili — grafikler güncellendi.${suffix}`,
      error: unsolved,
    };
  }, [exportToast, payload, active.length]);

  const onToggle = useCallback((folderName: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(folderName);
      else next.delete(folderName);
      return next;
    });
  }, []);

  const onSelectAll = useCallback(() => {
    setSelected(new Set(scenarios.map((s) => s.folderName)));
  }, [scenarios]);

  const onSelectNone = useCallback(() => {
    setSelected(new Set());
  }, []);

  const onExportAllTables = useCallback(() => {
    const count = exportAllDashboardTables((id) => {
      const el = document.getElementById(id);
      return el?.querySelector("table") as HTMLTableElement | null;
    });
    if (!count) {
      setExportToast({ text: "Dışa aktarılacak tablo bulunamadı.", error: true });
    } else {
      setExportToast({ text: `Tek XLSX içinde ${count} çalışma sayfası indirildi.`, error: false });
    }
  }, []);

  if (loadError && !payload) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <p className="text-lg text-red-300">Veri yüklenemedi</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Repo kökünde <code className="rounded bg-slate-900 px-1">scenario_dashboard_data.json</code> oluşturun (
          <code className="rounded bg-slate-900 px-1">python3 build_scenario_dashboard_data.py</code>) veya{" "}
          <code className="rounded bg-slate-900 px-1">npm run sync-dashboard-data</code> ile{" "}
          <code className="rounded bg-slate-900 px-1">public/dashboard-data.json</code> kopyalayın.
        </p>
        <p className="mt-4 font-mono text-xs text-slate-600">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <DashboardHeader
        statusMessage={headerStatus.text}
        statusIsError={headerStatus.error}
        generatedAt={payload?.generatedAt}
        scenarioCount={scenarios.length}
        onExportAllTables={onExportAllTables}
        onReloadData={onReloadData}
        isReloading={isReloading}
      />
      <FailureBanner expectedScenarios={expectedScenarios} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ScenarioSidebar
          scenarios={scenarios}
          selected={selected}
          onToggle={onToggle}
          onSelectAll={onSelectAll}
          onSelectNone={onSelectNone}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px] space-y-6">
            <CollapsibleCard cardId="scenario" title="Grafikler: enerji, maliyet, teknoloji">
              <DashboardCharts
                active={active}
                fuelResources={fuelResources}
                selectedTech={chartTech}
                onTechChange={setSelectedTech}
              />
            </CollapsibleCard>

            <DashboardTables active={active} expectedScenarios={expectedScenarios} fuelResources={fuelResources} />

            <CollapsibleCard
              cardId="sankey"
              title="Sankey diyagramları (enerji akışı)"
              tools={
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-slate-500 bg-slate-900 text-emerald-500"
                    checked={sankeyVisible}
                    onChange={(e) => setSankeyVisible(e.target.checked)}
                  />
                  Sankey göster
                </label>
              }
            >
              {sankeyVisible ? <SankeyStack active={active} /> : <p className="text-sm text-slate-500">Sankey kapalı.</p>}
            </CollapsibleCard>
          </div>
        </main>
      </div>
    </div>
  );
}
