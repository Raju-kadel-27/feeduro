export function RouteErrorMessage({ resource }: { resource: string }) {
  return (
    <div className="p-6">
      <p className="text-sm text-destructive">Failed to load {resource}. Please refresh.</p>
    </div>
  );
}
