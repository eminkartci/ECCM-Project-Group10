import { FUEL_SHARE_COLORS } from "./constants";
import type { CostBreakdownRow, SankeyLink, Scenario } from "./types";

const SANKEY_ELEC_SOURCE_ORDER = [
  "Nuclear",
  "NG CCS",
  "NG",
  "Coal CCS",
  "Coal",
  "Hydro Dams",
  "Hydro River",
  "Wind",
  "Solar",
  "Geothermal",
  "Electricity",
] as const;

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

/** total_output yakıt satırları GWh; MWh gösterimi */
export function formatMwhFromGwh(gwh: number): string {
  if (!Number.isFinite(gwh)) return "—";
  const mwh = gwh * 1000;
  return `${mwh.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} MWh`;
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

/** Sankey realValue TWh → GWh (dashboard birimi) */
export function aggregateSankeySupplyToElecGwh(links: SankeyLink[] | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!links?.length) return out;
  for (const L of links) {
    if (String(L.target || "").trim().toLowerCase() !== "elec") continue;
    const src = String(L.source || "").trim();
    if (!src) continue;
    const twh = Number(L.value);
    if (!Number.isFinite(twh) || twh <= 0) continue;
    out[src] = (out[src] || 0) + twh * 1000;
  }
  return out;
}

export function scenarioSankeyElecSupplyTotalGwh(m: Record<string, number> | undefined): number {
  if (!m) return 0;
  let t = 0;
  for (const v of Object.values(m)) {
    if (Number.isFinite(v) && v > 0) t += v;
  }
  return t;
}

function mergeSankeyElecRowOrder(keySet: Set<string>): string[] {
  const keys = [...keySet].filter(Boolean);
  if (!keys.length) return [];
  const preferred = SANKEY_ELEC_SOURCE_ORDER as readonly string[];
  const rest = keys.filter((k) => !preferred.includes(k)).sort((a, b) => a.localeCompare(b));
  return [...SANKEY_ELEC_SOURCE_ORDER.filter((k) => keySet.has(k)), ...rest];
}

export function fuelShareUsesSankey(active: Scenario[]): boolean {
  return active.some((s) => scenarioSankeyElecSupplyTotalGwh(s.electricitySankeySupplyGwh) > 0);
}

/** Tablo + yığılmış % grafik: Sankey → Elec varsa onu, yoksa RESOURCES/total_output */
export function orderedFuelShareForTable(active: Scenario[], fuelResources: string[]): string[] {
  if (fuelShareUsesSankey(active)) {
    const union = new Set<string>();
    active.forEach((s) => {
      const m = s.electricitySankeySupplyGwh || {};
      Object.entries(m).forEach(([k, v]) => {
        if (Number(v) > 0) union.add(k);
      });
    });
    const all = mergeSankeyElecRowOrder(union);
    const agg = new Map<string, number>();
    active.forEach((s) => {
      const m = s.electricitySankeySupplyGwh || {};
      all.forEach((f) => {
        const v = Number(m[f]) || 0;
        if (v > 0) agg.set(f, (agg.get(f) || 0) + v);
      });
    });
    return all.filter((f) => (agg.get(f) || 0) > 0).sort((a, b) => (agg.get(b) || 0) - (agg.get(a) || 0));
  }
  return orderedFuelsForShare(active, fuelResources);
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

export type FuelShareStackMode = {
  useSankey: boolean;
  /** useSankey false iken toplam payda */
  resourceKeysForTotal: string[];
};

export function buildFuelShareStackedPercent(
  active: Scenario[],
  allFuels: string[],
  fuelsOrdered: string[],
  maxSeg = 9,
  mode?: FuelShareStackMode
): { names: string[]; seriesPct: { name: string; data: number[] }[]; colors: string[] } {
  const useSankey = mode?.useSankey ?? false;
  const resourceKeys = mode?.resourceKeysForTotal ?? allFuels;

  const head = fuelsOrdered.slice(0, maxSeg);
  const tail = fuelsOrdered.slice(maxSeg);
  const names = [...head];
  if (tail.length) names.push("Diğer");

  const seriesPct = names.map((segName) => ({
    name: segName,
    data: active.map((s) => {
      const tot = useSankey
        ? scenarioSankeyElecSupplyTotalGwh(s.electricitySankeySupplyGwh)
        : scenarioFuelTotalFromList(s, resourceKeys);
      if (tot <= 0) return 0;
      if (segName === "Diğer") {
        let other = 0;
        tail.forEach((f) => {
          other += useSankey
            ? Number(s.electricitySankeySupplyGwh?.[f]) || 0
            : Number(s.totalOutput?.[f]) || 0;
        });
        return (100 * other) / tot;
      }
      const v = useSankey
        ? Number(s.electricitySankeySupplyGwh?.[segName]) || 0
        : Number(s.totalOutput?.[segName]) || 0;
      return (100 * v) / tot;
    }),
  }));

  const colors = names.map((_, i) => FUEL_SHARE_COLORS[i % FUEL_SHARE_COLORS.length]);
  return { names, seriesPct, colors };
}
