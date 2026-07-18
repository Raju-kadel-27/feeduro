import { Skeleton } from "@components/ui/skeleton";

export function PostListSkeleton() {
	return (
		<div className="divide-y">
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={i} className="flex items-center gap-3 px-4 py-2">
					<Skeleton className="h-8 w-8 rounded-lg shrink-0" />
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
				</div>
			))}
		</div>
	);
}

export function DashboardSkeleton() {
	return (
		<div>
			<div className="sticky top-0 z-10 bg-background flex items-center gap-2 px-4 py-2.5 border-b overflow-x-auto">
				<Skeleton className="h-7 w-7 rounded-md shrink-0" />
				<div className="flex items-center gap-1.5">
					{[72, 56, 88, 64, 76].map((w, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
						<Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
					))}
				</div>
				<div className="ml-auto flex items-center gap-2 shrink-0">
					<Skeleton className="h-7 w-20 rounded-md" />
					<Skeleton className="h-7 w-28 rounded-md" />
				</div>
			</div>
			<PostListSkeleton />
		</div>
	);
}
