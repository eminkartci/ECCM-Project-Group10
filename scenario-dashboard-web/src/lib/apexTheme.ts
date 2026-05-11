import type { ApexOptions } from "apexcharts";

export const apexDarkBase: ApexOptions = {
  theme: { mode: "dark" },
  chart: {
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    foreColor: "#94a3b8",
    background: "transparent",
    toolbar: { show: true },
    animations: { enabled: true, speed: 400 },
  },
  grid: { borderColor: "#334155", strokeDashArray: 3 },
  legend: {
    labels: { colors: "#cbd5e1" },
    position: "top",
    horizontalAlign: "left",
  },
  dataLabels: { style: { colors: ["#f1f5f9"] } },
  tooltip: { theme: "dark" },
};
