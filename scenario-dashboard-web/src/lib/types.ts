export type SankeyLink = {
  source: string;
  target: string;
  value: number;
  color?: string;
  unit?: string;
};

export type CostBreakdownRow = {
  cInv: number;
  cMaint: number;
  cOp: number;
  sum: number;
};

export type ScenarioKpi = {
  electricityOutputGWh: number | null;
  electricitySupplyGWh: number | null;
  costPerGWh: number | null;
  gwpPerGWh: number | null;
  endUseDemandGWh: number | null;
};

export type Scenario = {
  folderName: string;
  label: string;
  totalCost: number | null;
  totalGwp: number | null;
  totalOutput: Record<string, number>;
  costBreakdown: Record<string, CostBreakdownRow>;
  endUsesAnnual: Record<string, number>;
  sankeyLinks: SankeyLink[];
  /** Sankey → Elec (GWh); yoksa sankeyLinks’ten türetilir */
  electricitySankeySupplyGwh?: Record<string, number>;
  solved: boolean;
  statusReason: string;
  runError: string | null;
  expected: boolean;
  kpi: ScenarioKpi;
};

export type ExpectedScenarioRow = {
  folderName: string;
  label: string;
  solved: boolean;
  statusReason: string;
  runError: string | null;
};

export type DashboardPayload = {
  generatedAt: string;
  scenarios: Scenario[];
  expectedScenarios: ExpectedScenarioRow[];
  unsolvedExpectedCount: number;
  solvedExpectedCount: number;
  fuelResourcesForShare: string[];
  /** Sankey Elec kaynak sırası (opsiyonel; boşsa istemci sankey’den üretir) */
  electricitySankeySupplyRowOrder?: string[];
};
