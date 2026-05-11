"use client";

import type { Scenario } from "@/lib/types";

type Props = {
  scenarios: Scenario[];
  selected: Set<string>;
  onToggle: (folderName: string, checked: boolean) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
};

export default function ScenarioSidebar({ scenarios, selected, onToggle, onSelectAll, onSelectNone }: Props) {
  return (
    <aside className="flex max-h-[40vh] min-h-0 w-full shrink-0 flex-col border-b border-slate-700/80 bg-slate-950/80 md:max-h-none md:h-auto md:w-[min(100%,320px)] md:border-b-0 md:border-r">
      <div className="border-b border-slate-700/80 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Senaryo seçimi</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          İşaretli senaryolar grafiklerde ve tablolarda kullanılır. Veri:{" "}
          <code className="rounded bg-slate-800 px-1 text-[10px] text-emerald-200/90">public/dashboard-data.json</code>
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-lg border border-slate-600 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            Tümünü seç
          </button>
          <button
            type="button"
            onClick={onSelectNone}
            className="rounded-lg border border-slate-600 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            Tümünü kaldır
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-1">
          {scenarios.map((s) => (
            <li key={s.folderName}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-slate-500 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40"
                  checked={selected.has(s.folderName)}
                  onChange={(e) => onToggle(s.folderName, e.target.checked)}
                />
                <span className="min-w-0 break-words leading-snug">{s.label || s.folderName}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
