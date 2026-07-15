import { CheckIcon, Star } from "lucide-react";
import { Link } from "react-router";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { FEATURE_ICONS, FEATURE_META, type GatedFeature, PLAN_LABEL, PLAN_PRICE } from "./upgrade-wall";

interface UpgradePromptProps {
	feature: GatedFeature;
	orgSlug: string;
}

export function UpgradePrompt({ feature, orgSlug }: UpgradePromptProps) {
	const meta = FEATURE_META[feature];
	const label = PLAN_LABEL[meta.requiredPlan];
	const price = PLAN_PRICE[meta.requiredPlan];
	const Icon = FEATURE_ICONS[feature];

	return (
		<>
			<header className="flex h-14 shrink-0 items-center px-4">
				<SidebarTrigger className="-ml-1" />
			</header>
			<main className="flex flex-1 items-center justify-center p-6 pt-16">
				<div className="animate-in fade-in-0 zoom-in-95 duration-200 w-full max-w-md rounded-2xl border bg-card p-6 pb-8 shadow-lg">
					<div className="mb-4">
						<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
							<Icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
						</div>
					</div>

					<div className="mb-2">
						<span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
							{label}
						</span>
					</div>

					<h2 className="mb-1.5 text-2xl font-bold tracking-tight">{meta.label}</h2>
					<p className="mb-4 text-sm leading-relaxed text-muted-foreground">{meta.description}</p>

					<div className="mb-4 h-px bg-border" />

					<ul className="mb-5 flex flex-col gap-2.5">
						{meta.highlights.map((h) => (
							<li key={h} className="flex items-center gap-2.5">
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
									<CheckIcon className="h-3 w-3 text-orange-500" />
								</span>
								<span className="text-sm text-foreground">{h}</span>
							</li>
						))}
					</ul>

					<Link
						to={`/${orgSlug}/settings/billing`}
						className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
					>
						Upgrade to {label}
						<Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
					</Link>
					<p className="mt-1.5 mb-2 text-center text-xs text-muted-foreground">{price}/mo · cancel anytime</p>
					<Link
						to="/pricing"
						target="_blank"
						rel="noopener noreferrer"
						className="flex w-full items-center justify-center py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
					>
						Compare all plans
						<span className="sr-only"> (opens in new tab)</span>
					</Link>
				</div>
			</main>
		</>
	);
}
