"use client";

type Props = {
  statusMessage: string;
  statusIsError: boolean;
  generatedAt?: string;
  scenarioCount: number;
  onExportAllTables: () => void;
};

export default function DashboardHeader({
  statusMessage,
  statusIsError,
  generatedAt,
  scenarioCount,
  onExportAllTables,
}: Props) {
  return (
    <header className="border-b border-slate-700/80 bg-slate-900/40 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Senaryo karşılaştırma paneli</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Önceden üretilmiş <code className="rounded bg-slate-800 px-1 text-emerald-200/90">output_*</code>{" "}
          klasörlerinden derlenen metrikler. Veriyi güncellemek için repo kökünde{" "}
          <code className="rounded bg-slate-800 px-1 text-xs">python3 build_scenario_dashboard_data.py</code> ve{" "}
          <code className="rounded bg-slate-800 px-1 text-xs">npm run sync-dashboard-data</code>.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExportAllTables}
            className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-900/50"
          >
            Tüm tabloları XLSX
          </button>
          {generatedAt ? (
            <span className="text-xs text-slate-500">Veri: {generatedAt}</span>
          ) : null}
          <span className="text-xs text-slate-500">{scenarioCount} senaryo pakette</span>
        </div>
        <p
          className={`mt-3 text-sm ${statusIsError ? "text-red-300" : "text-emerald-200/90"}`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      </div>
    </header>
  );
}
