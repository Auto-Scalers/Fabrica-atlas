import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { KanbanSkeleton } from "@/components/skeletons";

export default function StatusBoardLoading() {
  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: "Status Board" }]} />
      <KanbanSkeleton />
    </div>
  );
}
