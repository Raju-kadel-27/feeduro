import {
	AsanaIcon,
	ClickUpIcon,
	DiscordIcon,
	GitHubIcon,
	HubSpotIcon,
	JiraIcon,
	LinearIcon,
	MondayIcon,
	N8nIcon,
	NotionIcon,
	SalesforceIcon,
	ShortcutIcon,
	SlackIcon,
	TrelloIcon,
	ZapierIcon,
	ZendeskIcon,
} from "@components/icons";
import { PlanBanner } from "@features/internal/billing/components/plan-banner";
import { useNavigate, useParams } from "react-router";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { IntegrationSection } from "./integration-section";
import { IntegrationTile } from "./integration-tile";
import { IntegrationsPageHeader } from "./page-header";

const PROJECT_MGMT = [
	{ name: "Linear", icon: <LinearIcon className="h-10 w-10 text-foreground" /> },
	{ name: "GitHub Issues", icon: <GitHubIcon className="h-10 w-10 fill-foreground" /> },
	{ name: "Jira", icon: <JiraIcon size={40} /> },
	{ name: "Asana", icon: <AsanaIcon size={40} /> },
	{ name: "Notion", icon: <NotionIcon size={40} /> },
	{ name: "Monday.com", icon: <MondayIcon size={40} /> },
	{ name: "Trello", icon: <TrelloIcon size={40} /> },
	{ name: "Shortcut", icon: <ShortcutIcon size={40} /> },
	{ name: "ClickUp", icon: <ClickUpIcon size={40} /> },
];

const CRM = [
	{ name: "Salesforce", icon: <SalesforceIcon size={40} /> },
	{ name: "HubSpot", icon: <HubSpotIcon size={40} /> },
];

const NOTIFICATIONS = [
	{
		key: "discord",
		name: "Discord",
		description: "Receive notifications in a Discord channel when feedback events occur.",
		icon: <DiscordIcon className="h-7 w-7 fill-[#5865F2]" />,
	},
	{
		key: "slack",
		name: "Slack",
		description: "Receive notifications in a Slack channel when feedback events occur.",
		icon: <SlackIcon className="h-7 w-7" />,
	},
];

export function LockedIntegrationsPage() {
	const { orgSlug } = useParams<{ orgSlug: string }>();
	const navigate = useNavigate();
	const billingPath = `/${orgSlug}/settings/billing`;
	const goToBilling = () => navigate(billingPath);

	return (
		<>
			<header className="flex h-14 shrink-0 items-center px-4">
				<SidebarTrigger className="-ml-1" />
			</header>
			<main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
				<IntegrationsPageHeader />

				<PlanBanner>
					Integrations are available on the <span className="font-semibold">Starter</span> plan and above.
				</PlanBanner>

				<IntegrationSection title="Project Management">
					{PROJECT_MGMT.map((i) => (
						<IntegrationTile
							key={i.name}
							name={i.name}
							icon={i.icon}
							connected={false}
							locked
							onClick={goToBilling}
						/>
					))}
				</IntegrationSection>

				<IntegrationSection title="CRM">
					{CRM.map((i) => (
						<IntegrationTile
							key={i.name}
							name={i.name}
							icon={i.icon}
							connected={false}
							locked
							onClick={goToBilling}
						/>
					))}
				</IntegrationSection>

				<IntegrationSection title="Customer Support">
					<IntegrationTile
						name="Zendesk"
						icon={<ZendeskIcon size={40} />}
						connected={false}
						locked
						onClick={goToBilling}
					/>
				</IntegrationSection>

				<IntegrationSection title="Automation">
					{[
						{ name: "Zapier", icon: <ZapierIcon size={40} /> },
						{ name: "n8n", icon: <N8nIcon size={40} /> },
					].map((i) => (
						<IntegrationTile
							key={i.name}
							name={i.name}
							icon={i.icon}
							connected={false}
							locked
							onClick={goToBilling}
						/>
					))}
				</IntegrationSection>

				<section className="space-y-2">
					<h3 className="text-base font-medium text-gray-600">Notifications</h3>
					<div className="space-y-3">
						{NOTIFICATIONS.map((i) => (
							<div
								key={i.key}
								className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
							>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
									{i.icon}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-semibold text-foreground">{i.name}</p>
									<p className="text-sm text-muted-foreground leading-relaxed">{i.description}</p>
								</div>
							</div>
						))}
					</div>
				</section>
			</main>
		</>
	);
}
