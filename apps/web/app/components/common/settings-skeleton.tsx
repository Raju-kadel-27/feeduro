import { Skeleton } from "@components/ui/skeleton";
import { SidebarTrigger } from "@/app/components/ui/sidebar";

export function SettingsSkeleton() {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-7 w-44" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[112px] w-full rounded-lg" />
          <Skeleton className="h-[112px] w-full rounded-lg" />
        </div>
      </main>
    </>
  );
}

export function SettingsContentSkeleton() {
  return (
    <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-44" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-[112px] w-full rounded-lg" />
        <Skeleton className="h-[112px] w-full rounded-lg" />
      </div>
    </main>
  );
}
