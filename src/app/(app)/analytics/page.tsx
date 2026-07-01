import { StudyAnalytics } from "@/components/analytics/StudyAnalytics";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getStudyAnalytics } from "@/lib/actions/analytics";

export default async function AnalyticsPage() {
  const data = await getStudyAnalytics();

  return (
    <DashboardShell>
      <PageHeader title="Analytics" />
      <StudyAnalytics {...data} />
    </DashboardShell>
  );
}
