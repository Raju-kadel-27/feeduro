import { AccountModal } from "@components/layout/account-modal";
import { LanguageSwitcher } from "@components/layout/language-switcher";
import { ThemeToggle } from "@components/layout/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@components/ui/sidebar";
import { WorkspaceSwitcher } from "@components/workspace/workspace-switcher";
import { authClient } from "@lib/auth/client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Code,
  CreditCard,
  Database,
  ExternalLink,
  FileText,
  Globe,
  KeyRound,
  LayoutPanelLeft,
  LogOut,
  Map,
  MessageSquare,
  Palette,
  Plus,
  Puzzle,
  Settings,
  Share2,
  Shield,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";

interface BoardSummary {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
}

interface BoardsResponse {
  boards: BoardSummary[];
  statusCounts: Record<string, number>;
  limit: number;
}

const STATUS_ITEMS = [
  { label: "Pending", status: "open" },
  { label: "Reviewing", status: "reviewing" },
  { label: "Planned", status: "planned" },
  { label: "In Progress", status: "in-progress" },
  { label: "Completed", status: "completed" },
] as const;

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { orgSlug = "" } = useParams();
  const { data: session } = authClient.useSession();
  const [accountOpen, setAccountOpen] = useState<boolean>(false);
  const [accountTab, setAccountTab] = useState<"profile" | "appearance" | "settings">("profile");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverOpen]);

  function openAccount(tab: "profile" | "appearance" | "settings") {
    setAccountTab(tab);
    setAccountOpen(true);
    setPopoverOpen(false);
  }

  const base = `/${orgSlug}`;
  const isSettingsRoute = location.pathname.includes("/settings");

  const { data: boardsData } = useQuery({
    queryKey: ["boards", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/boards");
      return res.json() as Promise<BoardsResponse>;
    },
    enabled: !!orgSlug && !isSettingsRoute,
  });

  const statusCounts = boardsData?.statusCounts ?? {};
  const defaultBoardUrl = `${base}/dashboard`;

  const publicBoardUrl = import.meta.env.DEV
    ? `/public/${orgSlug}`
    : `https://${orgSlug}.feediyo.com`;

  const workspaceItems = [
    { title: "Roadmap", url: `${base}/roadmap`, icon: Map },
    { title: "Changelog", url: `${base}/changelog`, icon: FileText },
    { title: "Members", url: `${base}/members`, icon: Users },
    { title: "Share", url: `${base}/share`, icon: Share2 },
    { title: "Settings", url: `${base}/settings`, icon: Settings },
  ];

  const settingsWorkspaceItems = [
    { title: "Branding", url: `${base}/settings/branding`, icon: Palette },
    { title: "Team", url: `${base}/settings/team`, icon: Users },
    { title: "Domain", url: `${base}/settings/domain`, icon: Globe },
    { title: "Privacy & Access", url: `${base}/settings/privacy`, icon: Shield },
  ];

  const settingsFeedbackItems = [
    { title: "Feedback", url: `${base}/settings/feedback`, icon: MessageSquare },
    { title: "Changelog", url: `${base}/settings/changelog`, icon: FileText },
  ];

  const settingsIntegrationsItems = [
    { title: "Widget", url: `${base}/settings/widget`, icon: LayoutPanelLeft },
    { title: "Integrations", url: `${base}/settings/integrations`, icon: Puzzle },
    { title: "Login & SSO", url: `${base}/settings/sso`, icon: KeyRound },
    { title: "API Tokens", url: `${base}/settings/api-tokens`, icon: Code },
  ];

  const settingsBillingItems = [
    { title: "Billing", url: `${base}/settings/billing`, icon: CreditCard },
    { title: "Data & Import", url: `${base}/settings/data`, icon: Database },
  ];

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/sign-in");
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarSeparator />

      {isSettingsRoute ? (
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={`${base}/dashboard`}>
                      <ArrowLeft />
                      <span>Back to dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsWorkspaceItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Feedback</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsFeedbackItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Integrations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsIntegrationsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Billing & Data</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsBillingItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      ) : (
        <SidebarContent>
          {/* Collect */}
          <SidebarGroup>
            <SidebarGroupLabel>Collect</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === defaultBoardUrl}>
                    <Link to={defaultBoardUrl}>
                      <Plus className="h-4 w-4" />
                      <span>New Request</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href={publicBoardUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      <span>Public Board</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Manage */}
          <SidebarGroup>
            <SidebarGroupLabel>Manage</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {STATUS_ITEMS.map(({ label, status }) => {
                  const count = statusCounts[status] ?? 0;
                  const url = `${base}/dashboard?status=${status}`;
                  const isActive =
                    location.pathname === `${base}/dashboard` &&
                    new URLSearchParams(location.search).get("status") === status;
                  return (
                    <SidebarMenuItem key={status}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link to={url} className="flex items-center justify-between w-full">
                          <span>{label}</span>
                          {count > 0 && (
                            <span className="ml-auto text-[10px] font-medium tabular-nums text-muted-foreground">
                              {count}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Workspace */}
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {workspaceItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      )}

      <SidebarSeparator />

      <SidebarFooter>
        <div ref={popoverRef} className="relative px-2 py-1">
          {/* Popover */}
          {popoverOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-popover shadow-xl z-50">
              {/* User header */}
              <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
                {session?.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? ""}
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {session?.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">
                    {session?.user.name ?? ""}
                  </p>
                  <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                    {session?.user.email ?? ""}
                  </p>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => openAccount("profile")}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  Profile settings
                </button>
                <button
                  type="button"
                  onClick={() => openAccount("appearance")}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
                >
                  <Palette className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  Appearance
                </button>
                <div className="px-1 py-0.5">
                  <LanguageSwitcher variant="full" className="w-full [&>button]:w-full" />
                </div>
              </div>

              <div className="border-t border-border p-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          )}

          {/* Footer bar */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPopoverOpen((p) => !p)}
              className="flex items-center gap-2 min-w-0 flex-1 rounded-md px-1 py-1 hover:bg-sidebar-accent transition-colors text-left group"
            >
              {session?.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold group-hover:bg-primary/20 transition-colors">
                  {session?.user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <span className="text-xs text-[hsl(var(--sidebar-foreground))] truncate">
                {session?.user.name ?? session?.user.email ?? ""}
              </span>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </SidebarFooter>

      {accountOpen && session?.user && (
        <AccountModal
          user={{
            name: session.user.name ?? "",
            email: session.user.email ?? "",
            image: session.user.image ?? null,
          }}
          initialTab={accountTab}
          onClose={() => setAccountOpen(false)}
        />
      )}
    </Sidebar>
  );
}
