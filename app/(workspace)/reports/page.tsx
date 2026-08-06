import type { Metadata } from "next";
import { ReportsAnalytics } from "@/components/reports/reports-analytics";
import { deriveReports, resolveReportingPeriod } from "@/lib/data/derived";
import { getWorkspaceData } from "@/lib/data/workspace-read";

export const metadata: Metadata = {
  title: "Reports & Analytics",
  description:
    "Fictional operational and financial reporting for Emerald Haven Residence.",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const data = await getWorkspaceData();

  if (!data) {
    return null;
  }

  const requestedPeriod =
    typeof parameters.period === "string" ? parameters.period : undefined;
  const { selectedPeriod, availablePeriods } = resolveReportingPeriod(
    data,
    requestedPeriod,
  );

  return (
    <ReportsAnalytics
      data={deriveReports(data, selectedPeriod)}
      availablePeriods={availablePeriods}
    />
  );
}
