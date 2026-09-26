import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/ui/page";

export default function DashboardSkeleton() {
  return (
    <PageContainer width="wide" role="status" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[62px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[112px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-xl xl:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <span className="sr-only">Loading…</span>
    </PageContainer>
  );
}
