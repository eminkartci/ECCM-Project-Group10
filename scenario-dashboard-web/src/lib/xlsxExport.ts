import * as XLSX from "xlsx";

function safeSheetName(name: string): string {
  return String(name)
    .replace(/[:\\/?*[\]]/g, "_")
    .replace(/'/g, "_")
    .slice(0, 31);
}

export function exportTableFromElement(table: HTMLTableElement | null, filenameBase: string): boolean {
  if (!table) return false;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  const sheet = safeSheetName(filenameBase || "Veri");
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const base = (filenameBase || "export").replace(/[^\w\-]+/g, "_");
  XLSX.writeFile(wb, `${base}_${ts}.xlsx`);
  return true;
}

export function exportAllDashboardTables(getTable: (id: string) => HTMLTableElement | null): number {
  const specs = [
    { id: "energy-summary-table", sheet: "Enerji_ozeti" },
    { id: "fuel-share-table", sheet: "Yakit_paylari" },
    { id: "solution-status", sheet: "Cozum_durumu" },
    { id: "cost-pivot", sheet: "Maliyet_kirilim" },
    { id: "metrics-table", sheet: "Ozet_metrikler" },
  ];
  const wb = XLSX.utils.book_new();
  let count = 0;
  for (const { id, sheet } of specs) {
    const table = getTable(id);
    if (!table) continue;
    const ws = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheet));
    count++;
  }
  if (!count) return 0;
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `senaryo_dashboard_tablolar_${ts}.xlsx`);
  return count;
}
