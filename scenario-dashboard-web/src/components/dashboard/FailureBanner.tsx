"use client";

import { escapeHtml } from "@/lib/escapeHtml";
import type { ExpectedScenarioRow } from "@/lib/types";

type Props = {
  expectedScenarios: ExpectedScenarioRow[];
};

export default function FailureBanner({ expectedScenarios }: Props) {
  const bad = expectedScenarios.filter((s) => !s.solved);
  if (!bad.length) return null;

  return (
    <div
      className="mx-4 mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-100 sm:mx-6 lg:mx-8"
      role="alert"
    >
      <strong>Beklenen senaryolardan {bad.length} tanesi çözülmedi veya metrik dosyası eksik</strong>
      <ul className="mt-2 list-inside list-disc space-y-1 text-red-200/90">
        {bad.map((s) => (
          <li key={s.folderName}>
            <strong>{escapeHtml(s.label || s.folderName)}</strong> — {escapeHtml(s.statusReason || "bilinmiyor")}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-red-300/90">
        Çözücü günlüğü: aşağıdaki tabloda «Hata günlüğü» sütunundan açın; veya{" "}
        <code className="rounded bg-red-950 px-1">output_* /scenario_run_error.txt</code> dosyasına bakın.
      </p>
    </div>
  );
}
