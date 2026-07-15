export function PlanBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 px-5 py-4 dark:border-orange-900/50 dark:bg-orange-900/20">
      <p className="text-base text-orange-800 dark:text-orange-300">{children}</p>
    </div>
  );
}
