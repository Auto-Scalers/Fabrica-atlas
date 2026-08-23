import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { MessageRowSkeleton } from "@/components/skeletons";

export default function InboxLoading() {
  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: "Inbox" }]} />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <MessageRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
