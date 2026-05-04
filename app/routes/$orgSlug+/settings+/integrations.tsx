import { AppSidebar } from "@components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@lib/session.server";
import { cn } from "@lib/utils";
import { and, eq } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { githubIntegrations, member } from "@/db/schema";
import type { Route } from "./+types/integrations";

export function meta() {
  return [{ title: "Integrations — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [memberRecord, githubIntegration] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    }),
    db.query.githubIntegrations.findFirst({
      where: eq(githubIntegrations.organizationId, organizationId),
      columns: { repoOwner: true, repoName: true },
    }),
  ]);

  return {
    isAdmin: memberRecord?.role === "admin",
    discord: {
      enabled: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
    },
    slack: {
      enabled: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
    },
    github: {
      configured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      connected: !!githubIntegration,
      repo: githubIntegration
        ? `${githubIntegration.repoOwner}/${githubIntegration.repoName}`
        : null,
    },
  };
}

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  docsUrl?: string;
  setupSteps?: string[];
}

function IntegrationCard({
  name,
  description,
  icon,
  enabled,
  docsUrl,
  setupSteps,
}: IntegrationCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{name}</span>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                enabled ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground",
              )}
            >
              {enabled ? "Connected" : "Not configured"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      {!enabled && setupSteps && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-2">
          <p className="text-[11px] font-medium text-foreground">Setup required</p>
          <ol className="space-y-1.5 list-decimal list-inside">
            {setupSteps.map((step, i) => (
              <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-[11px] text-primary hover:underline"
            >
              View documentation →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function SlackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#E01E5A"
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"
      />
      <path
        fill="#E01E5A"
        d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
      />
      <path
        fill="#2EB67D"
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z"
      />
      <path
        fill="#2EB67D"
        d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
      />
      <path
        fill="#ECB22E"
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z"
      />
      <path
        fill="#ECB22E"
        d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden>
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#5865F2]" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function IntegrationsSettings({ loaderData }: Route.ComponentProps) {
  const { discord, slack, github } = loaderData;
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Integrations</span>
        </header>

        <main className="p-6 max-w-[640px] mx-auto w-full space-y-6">
          <div>
            <h2 className="text-[13px] font-semibold text-foreground">Integrations</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Connect Feediyo with your favorite tools and services.
            </p>
          </div>

          {/* Developer tools */}
          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold text-foreground">Developer Tools</h3>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                  <GitHubIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">GitHub Issues</span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        github.connected
                          ? "bg-green-500/10 text-green-600"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {github.connected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {github.connected && github.repo
                      ? `Linked to ${github.repo}. Create or link GitHub issues directly from roadmap cards.`
                      : "Link your roadmap to a GitHub repository. Create issues from feedback or sync existing ones."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!github.configured) {
                      toast.error(
                        "GitHub OAuth app not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your environment, then restart the server.",
                        { duration: 6000 },
                      );
                      return;
                    }
                    navigate(`/${orgSlug}/settings/github-integration`);
                  }}
                  className="shrink-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  {github.connected ? "Configure" : "Set up"}
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </section>

          {/* Social login */}
          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold text-foreground">Social Login</h3>

            <IntegrationCard
              name="Discord"
              description="Allow users to sign in to Feediyo using their Discord account via OAuth 2.0."
              icon={<DiscordIcon />}
              enabled={discord.enabled}
              docsUrl="https://discord.com/developers/applications"
              setupSteps={[
                "Go to the Discord Developer Portal and create a new application.",
                "Under OAuth2 → Redirects, add: {BASE_URL}/api/auth/callback/discord",
                "Copy the Client ID and Client Secret from the OAuth2 tab.",
                "Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in your environment.",
                "Restart the server — Discord login will appear automatically.",
              ]}
            />

            <IntegrationCard
              name="Slack"
              description="Allow users to sign in to Feediyo using their Slack account via OAuth 2.0."
              icon={<SlackIcon />}
              enabled={slack.enabled}
              docsUrl="https://api.slack.com/apps"
              setupSteps={[
                "Go to Your Apps on Slack API and create a new app from scratch.",
                "Under OAuth & Permissions → Redirect URLs, add: {BASE_URL}/api/auth/callback/slack",
                "Copy the Client ID and Client Secret from Basic Information.",
                "Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in your environment.",
                "Restart the server — Slack login will appear automatically.",
              ]}
            />
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
