import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { EisenhowerSkeleton } from "@/components/skeletons";

export default function PriorityMatrixLoading() {
  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: "Priority Matrix" }]} />
      <EisenhowerSkeleton />
    </div>
  );
}
