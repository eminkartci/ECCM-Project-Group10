"use client";

import { useMemo } from "react";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { buildPlotlySankeyTrace } from "@/lib/plotlySankey";
import type { Scenario } from "@/lib/types";

const Plot = createPlotlyComponent(Plotly);

type Props = {
  active: Scenario[];
};

export default function SankeyStack({ active }: Props) {
  const withData = useMemo(
    () => active.filter((s) => Array.isArray(s.sankeyLinks) && s.sankeyLinks.length > 0),
    [active]
  );

  if (!withData.length) {
    return (
      <p className="text-sm text-slate-500">
        Seçili senaryolarda <code className="rounded bg-slate-800 px-1">sankey/input2sankey.csv</code> yok veya yalnızca
        başlık satırı var.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {withData.map((s) => (
        <div
          key={s.folderName}
          className="rounded-lg border border-slate-700/80 bg-slate-950/40 p-3 shadow-inner shadow-black/20"
        >
          <h3 className="text-sm font-semibold text-slate-200">Sankey (sankey/input2sankey.csv)</h3>
          <p className="text-xs font-medium text-emerald-200/80">{s.label || s.folderName}</p>
          <p className="mb-2 text-xs text-slate-500">
            {s.folderName}/sankey/input2sankey.csv — {s.sankeyLinks.length} akış (TWh)
          </p>
          <Plot
            data={[buildPlotlySankeyTrace(s.sankeyLinks)]}
            layout={{
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              font: { color: "#e2e8f0", size: 11 },
              margin: { l: 8, r: 8, t: 8, b: 8 },
              autosize: true,
            }}
            config={{ displaylogo: false, responsive: true }}
            style={{ width: "100%", minHeight: 420 }}
            useResizeHandler
          />
        </div>
      ))}
    </div>
  );
}
