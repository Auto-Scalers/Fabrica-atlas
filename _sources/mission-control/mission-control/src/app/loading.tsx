import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { DashboardSkeleton } from "@/components/skeletons";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[]} />
      <DashboardSkeleton />
    </div>
  );
}
