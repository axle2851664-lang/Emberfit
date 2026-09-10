import { LoadingCard, Skeleton } from "@/components/ui/States";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-2/3 max-w-sm" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <LoadingCard lines={4} />
          <LoadingCard lines={3} />
        </div>
        <LoadingCard lines={5} />
      </div>
    </div>
  );
}
