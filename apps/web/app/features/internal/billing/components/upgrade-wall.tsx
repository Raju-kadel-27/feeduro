import {
	AppWindow,
	BarChart2,
	CheckIcon,
	Code,
	Globe,
	KeyRound,
	LayoutDashboard,
	LayoutPanelLeft,
	Lock,
	MessageSquare,
	Palette,
	Puzzle,
	ScrollText,
	Users,
	Users2,
	UserCog,
	Webhook,
} from "lucide-react";
import type { ElementType } from "react";
import { Link } from "react-router";
import { FEATURE_PREVIEWS, GenericPreview } from "./upgrade-wall-previews";

type GatedFeature =
	| "analytics"
	| "customDomain"
	| "sso"
	| "hidePoweredBy"
	| "segments"
	| "auditLog"
	| "integrations"
	| "webhooks"
	| "apiTokens"
	| "oauthClients"
	| "customRoles"
	| "savedViews"
	| "privateBoards"
	| "guestPosting"
	| "boards"
	| "team";

type Plan = "starter" | "professional";

type FeatureMeta = {
	label: string;
	description: string;
	requiredPlan: Plan;
	highlights: string[];
};

const FEATURE_META: Record<GatedFeature, FeatureMeta> = {
	team: {
		label: "Team",
		description: "Invite teammates and collaborate on feedback together.",
		requiredPlan: "starter",
		highlights: [
			"Invite members by email with role-based access",
			"Admin, member, and viewer roles built in",
			"Manage pending invitations and remove members",
		],
	},
	analytics: {
		label: "Analytics",
		description: "Understand what your customers really want with detailed engagement data.",
		requiredPlan: "starter",
		highlights: [
			"Board health & engagement scores",
			"Vote and activity trends over time",
			"Visitor tracking across boards and roadmap",
			"Response rates and resolution time metrics",
		],
	},
	integrations: {
		label: "Integrations",
		description: "Connect your feedback workflow to the tools your team already uses.",
		requiredPlan: "starter",
		highlights: [
			"Linear, Jira, GitHub, Asana and more",
			"Sync feedback posts to issues automatically",
			"Slack and Discord notifications",
		],
	},
	webhooks: {
		label: "Webhooks",
		description: "Push feedback events to any endpoint in real time.",
		requiredPlan: "starter",
		highlights: [
			"New post, vote, and status change events",
			"Secure HMAC-signed payloads",
			"Retry logic with delivery logs",
		],
	},
	apiTokens: {
		label: "API Access",
		description: "Build custom integrations on top of Feeduro's REST API.",
		requiredPlan: "starter",
		highlights: [
			"Full read/write access to posts, boards, and changelog",
			"Per-token scopes and expiry",
			"Ideal for internal tools and automations",
		],
	},
	savedViews: {
		label: "Saved Views",
		description: "Save filtered views of your feedback boards for quick access.",
		requiredPlan: "starter",
		highlights: [
			"Filter by board, status, tag, or assignee",
			"Share views with your team",
			"Switch between views instantly",
		],
	},
	privateBoards: {
		label: "Private Boards",
		description: "Restrict board visibility to team members only.",
		requiredPlan: "starter",
		highlights: [
			"Hide boards from public visitors",
			"Useful for internal or beta feedback",
			"Per-board visibility control",
		],
	},
	guestPosting: {
		label: "Guest Posting",
		description: "Let anyone submit feedback without creating an account.",
		requiredPlan: "starter",
		highlights: [
			"Lower friction for end users",
			"Optional email capture",
			"Spam protection built in",
		],
	},
	boards: {
		label: "More Boards",
		description: "Create unlimited feedback boards for different products or teams.",
		requiredPlan: "starter",
		highlights: [
			"Up to 5 boards on Starter",
			"Unlimited boards on Professional",
			"Each board has independent settings",
		],
	},
	customDomain: {
		label: "Custom Domain",
		description: "Host your feedback portal under your own domain.",
		requiredPlan: "professional",
		highlights: [
			"feedback.yourcompany.com instead of feeduro.com",
			"Automatic SSL certificate",
			"Easy DNS setup with CNAME",
		],
	},
	hidePoweredBy: {
		label: "White-label Branding",
		description: "Remove Feeduro branding and make the portal completely yours.",
		requiredPlan: "professional",
		highlights: [
			'Remove "Powered by Feeduro" from your portal',
			"Custom color theme and logo",
			"Fully white-labeled experience for your users",
		],
	},
	sso: {
		label: "Single Sign-On (SSO)",
		description: "Let your team sign in with your existing identity provider.",
		requiredPlan: "professional",
		highlights: [
			"OIDC and SAML support",
			"Auto-provision members on first sign-in",
			"Domain-based routing from the login page",
		],
	},
	segments: {
		label: "Voter Segments",
		description: "Understand who is asking for what, segmented by customer data.",
		requiredPlan: "professional",
		highlights: [
			"Filter feedback by company, plan, or MRR",
			"See which customer segments drive each request",
			"Import user data via CSV or API",
		],
	},
	auditLog: {
		label: "Audit Log",
		description: "A full compliance trail of every admin action in your workspace.",
		requiredPlan: "professional",
		highlights: [
			"Log of member additions, removals, and role changes",
			"Track settings changes and API key usage",
			"Filter by action type, actor, and date",
		],
	},
	customRoles: {
		label: "Custom Roles",
		description: "Define fine-grained permission sets beyond the defaults.",
		requiredPlan: "professional",
		highlights: [
			"Create roles with custom permission sets",
			"Assign per-resource read/write access",
			"Unlimited roles for large teams",
		],
	},
	oauthClients: {
		label: "OAuth Clients",
		description: "Issue OAuth credentials for your own integrations.",
		requiredPlan: "professional",
		highlights: [
			"Authorization code flow with PKCE",
			"Scoped access tokens",
			"Ideal for marketplace integrations",
		],
	},
};

const FEATURE_ICONS: Record<GatedFeature, ElementType> = {
	analytics: BarChart2,
	customDomain: Globe,
	sso: KeyRound,
	hidePoweredBy: Palette,
	segments: Users2,
	auditLog: ScrollText,
	integrations: Puzzle,
	webhooks: Webhook,
	apiTokens: Code,
	oauthClients: AppWindow,
	customRoles: UserCog,
	savedViews: LayoutDashboard,
	privateBoards: Lock,
	guestPosting: MessageSquare,
	boards: LayoutPanelLeft,
	team: Users,
};

const PLAN_LABEL: Record<Plan, string> = { starter: "Starter", professional: "Professional" };
const PLAN_PRICE: Record<Plan, string> = { starter: "$8", professional: "$14" };

interface UpgradeWallProps {
	feature: GatedFeature;
	orgSlug: string;
	/** Pass the real rendered page to show it blurred behind the card. Falls back to the SVG preview. */
	children?: React.ReactNode;
}

export function UpgradeWall({ feature, orgSlug, children }: UpgradeWallProps) {
	const meta = FEATURE_META[feature];
	const label = PLAN_LABEL[meta.requiredPlan];
	const price = PLAN_PRICE[meta.requiredPlan];
	const Preview = FEATURE_PREVIEWS[feature] ?? GenericPreview;
	const Icon = FEATURE_ICONS[feature];

	return (
		<div
			className="relative flex flex-1 overflow-hidden"
			role="dialog"
			aria-modal="true"
			aria-labelledby="upgrade-wall-title"
		>
			{/* Blurred background — real page content or SVG preview */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
				<div
					className="absolute top-8 bottom-0 left-8 right-8 rounded-2xl overflow-hidden opacity-50"
					style={{ filter: "blur(3px)", transform: "scale(1.03)", transformOrigin: "top center" }}
				>
					{children ?? <Preview />}
				</div>
				<div className="absolute inset-0 bg-background/55" />
			</div>

			{/* Upgrade card */}
			<div className="relative z-10 flex flex-1 items-center justify-center p-6 pt-16 md:pt-32">
				<div className="animate-in fade-in-0 zoom-in-95 duration-200 w-full max-w-sm rounded-2xl bg-background p-6 pb-8 shadow-2xl ring-1 ring-black/[0.07] dark:ring-white/[0.07]">

					{/* Icon */}
					<div className="mb-4">
						<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
							<Icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
						</div>
					</div>

					{/* Plan badge */}
					<div className="mb-2">
						<span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
							{label}
						</span>
					</div>

					<h2 id="upgrade-wall-title" className="mb-1.5 text-2xl font-bold tracking-tight">
						{meta.label}
					</h2>
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
						className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
					>
						Upgrade to {label}
						<span className="font-normal opacity-75">— {price}/mo</span>
					</Link>
					<Link
						to="/pricing"
						target="_blank"
						rel="noopener noreferrer"
						className="flex w-full items-center justify-center py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
					>
						Compare all plans
					</Link>
				</div>
			</div>
		</div>
	);
}
