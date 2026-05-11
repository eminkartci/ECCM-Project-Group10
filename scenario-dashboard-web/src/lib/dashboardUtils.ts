import { FUEL_SHARE_COLORS } from "./constants";
import type { CostBreakdownRow, Scenario } from "./types";

export function sumObjectValues(obj: Record<string, number> | undefined): number {
  if (!obj) return 0;
  return Object.values(obj).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 3 });
}

export function formatPercent(p: number): string {
  if (!Number.isFinite(p)) return "—";
  return `${p.toLocaleString("tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 0 })}%`;
}

export function topKeysByAggregate(
  scenarios: Scenario[],
  keyObj: "endUsesAnnual" | "totalOutput",
  topN: number
): string[] {
  const totals = new Map<string, number>();
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

export function scenarioFuelTotalFromList(s: Scenario, fuelList: string[]): number {
  let sum = 0;
  for (const f of fuelList) {
    const v = s.totalOutput?.[f];
    if (Number.isFinite(v) && v > 0) sum += v;
  }
  return sum;
}

export function techOptionsForScenarios(active: Scenario[]): string[] {
  const techSet = new Set<string>();
  active.forEach((s) => Object.keys(s.totalOutput || {}).forEach((k) => techSet.add(k)));
  const techs = Array.from(techSet).sort((a, b) => {
    const sumA = active.reduce((acc, s) => acc + (s.totalOutput?.[a] || 0), 0);
    const sumB = active.reduce((acc, s) => acc + (s.totalOutput?.[b] || 0), 0);
    return sumB - sumA;
  });
  return techs.slice(0, 12);
}

export function costPivotTopTechs(active: Scenario[], limit: number): string[] {
  const techTotals = new Map<string, number>();
  active.forEach((scenario) => {
    for (const [tech, values] of Object.entries(scenario.costBreakdown || {})) {
      const prev = techTotals.get(tech) || 0;
      techTotals.set(tech, prev + (values.cOp || 0));
    }
  });
  return Array.from(techTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tech]) => tech);
}

export function getCostRow(tech: string, s: Scenario): CostBreakdownRow | undefined {
  return s.costBreakdown?.[tech];
}

export function orderedFuelsForShare(active: Scenario[], fuels: string[]): string[] {
  const agg = new Map<string, number>();
  active.forEach((s) => {
    fuels.forEach((f) => {
      const v = Number(s.totalOutput?.[f]) || 0;
      if (v > 0) agg.set(f, (agg.get(f) || 0) + v);
    });
  });
  return fuels.filter((f) => (agg.get(f) || 0) > 0).sort((a, b) => (agg.get(b) || 0) - (agg.get(a) || 0));
}

export function buildFuelShareStackedPercent(
  active: Scenario[],
  allFuels: string[],
  fuelsOrdered: string[],
  maxSeg = 9
): { names: string[]; seriesPct: { name: string; data: number[] }[]; colors: string[] } {
  const head = fuelsOrdered.slice(0, maxSeg);
  const tail = fuelsOrdered.slice(maxSeg);
  const names = [...head];
  if (tail.length) names.push("Diğer");

  const seriesPct = names.map((segName) => ({
    name: segName,
    data: active.map((s) => {
      const tot = scenarioFuelTotalFromList(s, allFuels);
      if (tot <= 0) return 0;
      if (segName === "Diğer") {
        let other = 0;
        tail.forEach((f) => {
          other += Number(s.totalOutput?.[f]) || 0;
        });
        return (100 * other) / tot;
      }
      const v = Number(s.totalOutput?.[segName]) || 0;
      return (100 * v) / tot;
    }),
  }));

  const colors = names.map((_, i) => FUEL_SHARE_COLORS[i % FUEL_SHARE_COLORS.length]);
  return { names, seriesPct, colors };
}
