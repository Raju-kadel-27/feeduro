import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@components/ui/sidebar";
import { NewViewForm } from "@features/dashboard/components/save-as-view-popover";
import type { View } from "@features/dashboard/types";
import { SidebarUserFooter } from "@features/layout/components/sidebar-user-footer";
import { WorkspaceSwitcher } from "@features/workspace/components/workspace-switcher";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart2,
  Bot,
  Code,
  CreditCard,
  Database,
  ExternalLink,
  FileText,
  Fingerprint,
  Globe,
  KeyRound,
  LayoutPanelLeft,
  Lock,
  Map,
  MessageSquare,
  Palette,
  Plus,
  Puzzle,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Users,
  Users2,
  Webhook,
  X,
} from "lucide-react";
import { type ElementType, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";

interface BoardSummary {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
}
const BOARD_COLORS = [
  "#6366f1",
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#eab308",
];

const makeSettingsSections = (base: string) => [
  {
    label: "General",
    items: [
      { title: "Workspace", url: `${base}/settings/workspace`, icon: Settings },
      { title: "Branding", url: `${base}/settings/branding`, icon: Palette },
      { title: "Domain", url: `${base}/settings/domain`, icon: Globe },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Team", url: `${base}/settings/team`, icon: Users },
      { title: "Roles & Permissions", url: `${base}/settings/roles`, icon: ShieldCheck },
    ],
  },
  {
    label: "Product",
    items: [
      { title: "Feedback", url: `${base}/settings/feedback`, icon: MessageSquare },
      { title: "Changelog", url: `${base}/settings/changelog`, icon: FileText },
      { title: "Segments", url: `${base}/settings/segments`, icon: Users2 },
      { title: "Widget", url: `${base}/settings/widget`, icon: LayoutPanelLeft },
    ],
  },
  {
    label: "Security",
    items: [
      { title: "Privacy & Access", url: `${base}/settings/privacy`, icon: Shield },
      { title: "Login & SSO", url: `${base}/settings/sso`, icon: KeyRound },
      { title: "Two-Factor Auth", url: `${base}/settings/two-factor`, icon: ShieldCheck },
      { title: "Passkeys", url: `${base}/settings/passkeys`, icon: Fingerprint },
      { title: "Password", url: `${base}/settings/password`, icon: Lock },
    ],
  },
  {
    label: "Developer",
    items: [
      { title: "Integrations", url: `${base}/settings/integrations`, icon: Puzzle },
      { title: "Webhooks", url: `${base}/settings/webhooks`, icon: Webhook },
      { title: "API Tokens", url: `${base}/settings/api-tokens`, icon: Code },
    ],
  },
  {
    label: "Billing",
    items: [
      { title: "Billing & Plans", url: `${base}/settings/billing`, icon: CreditCard },
      { title: "Data & Import", url: `${base}/settings/data`, icon: Database },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { orgSlug = "" } = useParams();
  const [sp] = useSearchParams();
  const qc = useQueryClient();
  const [showNewViewForm, setShowNewViewForm] = useState(false);
  const [confirmDeleteViewId, setConfirmDeleteViewId] = useState<string | null>(null);

  const base = `/${orgSlug}`;
  const isSettingsRoute = location.pathname.includes("/settings");
  const isDashboard = location.pathname === `${base}/dashboard`;
  const activeViewId = sp.get("view");

  const { data: viewsData } = useQuery({
    queryKey: ["views", orgSlug],
    queryFn: async () => {
      const r = await fetch("/api/views");
      return r.json() as Promise<{ views: View[] }>;
    },
    enabled: !!orgSlug && !isSettingsRoute,
    staleTime: 30_000,
  });

  const { data: boardsData } = useQuery({
    queryKey: ["boards", orgSlug],
    queryFn: async () => {
      const r = await fetch("/api/boards");
      return r.json() as Promise<{ boards: BoardSummary[] }>;
    },
    enabled: !!orgSlug && !isSettingsRoute,
    staleTime: 30_000,
  });

  const { data: autopilotCountData } = useQuery({
    queryKey: ["autopilot-count", orgSlug],
    queryFn: async () => {
      const r = await fetch("/api/autopilot/count");
      return r.json() as Promise<{ count: number }>;
    },
    enabled: !!orgSlug && !isSettingsRoute,
    staleTime: 60_000,
  });

  const views: View[] = viewsData?.views ?? [];
  const boards: BoardSummary[] = boardsData?.boards ?? [];
  const pendingAutopilotCount = autopilotCountData?.count ?? 0;

  type NavItem = { title: string; url: string; icon: ElementType; badge?: number };
  const workspaceNav: NavItem[] = [
    { title: "Analytics", url: `${base}/analytics`, icon: BarChart2 },
    { title: "Roadmap", url: `${base}/roadmap`, icon: Map },
    { title: "Changelog", url: `${base}/changelog`, icon: FileText },
    { title: "Autopilot", url: `${base}/autopilot`, icon: Bot, badge: pendingAutopilotCount },
    { title: "Share", url: `${base}/share`, icon: Share2 },
    { title: "Settings", url: `${base}/settings`, icon: Settings },
  ];

  const { mutate: createView } = useMutation({
    mutationFn: async ({ name, emoji }: { name: string; emoji: string }) => {
      const r = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create", name, emoji, filters: {}, sort: "newest" }),
      });
      return r.json() as Promise<{ view: View }>;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["views", orgSlug] });
      setShowNewViewForm(false);
      navigate(`${base}/dashboard?view=${d.view.id}`);
    },
  });

  const { mutate: deleteView } = useMutation({
    mutationFn: async (viewId: string) => {
      const r = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "delete", viewId }),
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["views", orgSlug] });
      setConfirmDeleteViewId(null);
      navigate(`${base}/dashboard?view=${views[0]?.id ?? ""}`);
    },
  });

  const publicBoardUrl = import.meta.env.DEV ? `/${orgSlug}` : `https://${orgSlug}.feediyo.com`;
  const sections = makeSettingsSections(base);

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
          {sections.map(({ label, items }) => (
            <div key={label}>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>{label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
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
            </div>
          ))}
        </SidebarContent>
      ) : (
        <SidebarContent>
          {/* Public board link */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
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

          {/* VIEWS */}
          <SidebarGroup className="px-0">
            <div className="flex items-center justify-between px-3 py-1">
              <SidebarGroupLabel className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a1a1aa] p-0">
                Views
              </SidebarGroupLabel>
              <Popover open={showNewViewForm} onOpenChange={setShowNewViewForm}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center h-5 w-5 rounded text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors"
                    aria-label="New view"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="w-80 p-0">
                  <NewViewForm
                    onSave={(name, emoji) => {
                      createView({ name, emoji });
                      setShowNewViewForm(false);
                    }}
                    onCancel={() => setShowNewViewForm(false)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <SidebarGroupContent>
              {views.map((view) => {
                const isActive =
                  isDashboard &&
                  (activeViewId === view.id || (!activeViewId && views[0]?.id === view.id));
                return (
                  <div key={view.id} className="group relative">
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#f97316] rounded-r" />
                    )}
                    <Link
                      to={`${base}/dashboard?view=${view.id}`}
                      className={cn(
                        "flex items-center gap-2 pl-4 pr-2 py-1.5 text-[13px] rounded-md mx-1 transition-colors",
                        isActive
                          ? "bg-[#18181b0d] font-semibold text-[#18181b]"
                          : "font-medium text-[#3f3f46] hover:bg-[#f4f4f5]",
                      )}
                    >
                      <span className="text-lg leading-none shrink-0">{view.emoji}</span>
                      <span className="flex-1 truncate">{view.name}</span>
                      {(view.count ?? 0) > 0 && (
                        <span className="text-[10px] tabular-nums text-[#71717a] shrink-0">
                          {view.count}
                        </span>
                      )}
                    </Link>
                    {!view.isSystem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setConfirmDeleteViewId(view.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#a1a1aa] hover:text-[#ef4444] hover:bg-red-50 transition-all"
                        aria-label={`Delete view ${view.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />

          {/* BOARDS */}
          {boards.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a1a1aa]">
                Boards
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {boards.map((board, i) => {
                    const boardUrl = `${base}/dashboard?${activeViewId ? `view=${activeViewId}&` : ""}board=${board.id}`;
                    return (
                      <SidebarMenuItem key={board.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isDashboard && sp.getAll("board").includes(board.id)}
                        >
                          <Link to={boardUrl}>
                            <span
                              className="h-2.5 w-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: BOARD_COLORS[i % BOARD_COLORS.length] }}
                            />
                            <span>{board.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          <SidebarSeparator />

          {/* Workspace links */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {workspaceNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                        {(item.badge ?? 0) > 0 && (
                          <span className="ml-auto text-[10px] font-semibold tabular-nums bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full leading-none">
                            {item.badge}
                          </span>
                        )}
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
      <SidebarUserFooter />

      {/* Delete view confirmation */}
      {confirmDeleteViewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl border shadow-xl p-5 w-72 space-y-3">
            <h3 className="text-sm font-semibold">Delete this view?</h3>
            <p className="text-xs text-[#71717a]">This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => deleteView(confirmDeleteViewId)}
                className="flex-1 px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteViewId(null)}
                className="flex-1 px-3 py-1.5 rounded-md border text-sm hover:bg-[#f4f4f5] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}
