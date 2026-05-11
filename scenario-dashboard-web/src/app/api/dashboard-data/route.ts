import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";

/**
 * Serves dashboard JSON with no caching.
 * 1) Repo root `scenario_dashboard_data.json` (parent of this app) — güncel değerler için `build_scenario_dashboard_data.py` sonrası yeniden yükle yeterli.
 * 2) `public/dashboard-data.json` — dağıtım veya kopya yoksa yedek.
 */
export async function GET() {
  const candidates = [
    {
      path: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "scenario_dashboard_data.json"),
      label: "repo_root" as const,
    },
    { path: path.join(process.cwd(), "public", "dashboard-data.json"), label: "public" as const },
  ];

  for (const { path: filePath, label } of candidates) {
    try {
      const raw = await readFile(filePath, "utf-8");
      JSON.parse(raw);
      return new NextResponse(raw, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "X-Dashboard-Data-Source": label,
        },
      });
    } catch {
      /* try next */
    }
  }

  return NextResponse.json(
    {
      error:
        "Senaryo verisi bulunamadı. Repo kökünde scenario_dashboard_data.json oluşturun veya npm run sync-dashboard-data çalıştırın.",
    },
    { status: 404 }
  );
}
