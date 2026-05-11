import type { SankeyLink } from "./types";

/** Same Plotly Sankey trace shape as `output_turkey_reference_case/dashboard.html`. */
export function buildPlotlySankeyTrace(links: SankeyLink[]) {
  const names = [...new Set(links.flatMap((l) => [l.source, l.target]))];
  const idx = new Map(names.map((n, i) => [n, i]));
  const labelColor = Object.fromEntries(links.map((l) => [l.source, l.color]));
  const nodeColors = names.map((n) => labelColor[n] || "rgba(59,130,246,0.7)");
  return {
    type: "sankey" as const,
    arrangement: "snap" as const,
    node: {
      label: names,
      color: nodeColors,
      pad: 14,
      thickness: 14,
      line: { color: "#94a3b8", width: 0.5 },
    },
    link: {
      source: links.map((l) => idx.get(l.source)!),
      target: links.map((l) => idx.get(l.target)!),
      value: links.map((l) => l.value),
      color: links.map((l) => `${l.color || "#3b82f6"}88`),
    },
  };
}
