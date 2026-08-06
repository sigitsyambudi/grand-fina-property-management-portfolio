import { Dashboard } from "@/components/dashboard/dashboard";
import {
  deriveDashboard,
  getCurrentDateInTimeZone,
  resolveReportingPeriod,
} from "@/lib/data/derived";
import { getWorkspaceData } from "@/lib/data/workspace-read";

export default async function DashboardPage({
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
    <Dashboard
      data={deriveDashboard(
        data,
        selectedPeriod,
        getCurrentDateInTimeZone(data.property.timezone),
      )}
      availablePeriods={availablePeriods}
    />
  );
}
