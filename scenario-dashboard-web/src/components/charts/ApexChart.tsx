"use client";

import dynamic from "next/dynamic";
import type { ApexAxisChartSeries, ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Props = {
  options: ApexOptions;
  series: ApexAxisChartSeries;
  type: "bar" | "line" | "area" | "pie" | "donut" | "radar" | "scatter" | "heatmap";
  height?: number | string;
};

export default function ApexChart({ options, series, type, height = 320 }: Props) {
  return <ReactApexChart options={options} series={series} type={type} height={height} />;
}
