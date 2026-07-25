import { Skeleton } from "@components/ui/skeleton";

export function PostDetailPageSkeleton() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center h-12 px-4 border-b shrink-0 gap-2">
        <Skeleton className="h-4 w-12" />
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-14" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left content */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Post metadata */}
          <div className="px-5 pt-4 pb-4 space-y-3 max-w-2xl mx-auto w-full">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-4/6" />
            </div>
          </div>

          {/* Tab bar */}
          <div className="border-b px-5">
            <div className="flex items-center gap-4 max-w-2xl mx-auto pl-4">
              <Skeleton className="h-4 w-20 my-2.5" />
              <Skeleton className="h-4 w-16 my-2.5" />
            </div>
          </div>

          {/* Compose box */}
          <div className="px-5 pt-4 max-w-2xl mx-auto w-full">
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>

          {/* Comment rows */}
          <div className="px-5 pt-5 space-y-5 max-w-2xl mx-auto w-full">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-[480px] shrink-0 border-l overflow-y-auto px-5 pt-5 space-y-6">
          {/* Integration row */}
          <div className="space-y-2 pb-5 border-b">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>

          {/* Segment breakdown */}
          <div className="space-y-4">
            <Skeleton className="h-3 w-32" />
            <div className="flex justify-center">
              <Skeleton className="h-[200px] w-[200px] rounded-full" />
            </div>
            <div className="space-y-2.5 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-sm" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-6" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
