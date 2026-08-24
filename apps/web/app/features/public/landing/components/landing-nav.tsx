import {
  Bell,
  BookOpen,
  ChevronDown,
  Code2,
  GitMerge,
  Map,
  MessageSquare,
  Plug,
  ThumbsUp,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

function getScrollParent(el: Element | null): Element | null {
  if (!el) return null;
  const { overflowY } = getComputedStyle(el);
  if (overflowY === "auto" || overflowY === "scroll") return el;
  return getScrollParent(el.parentElement);
}

const PRODUCT_ITEMS = [
  {
    icon: <ThumbsUp className="w-5 h-5 text-blue-500" />,
    label: "Feature Voting",
    description: "Let users vote on what to build next — signal over noise.",
    href: "/#features",
  },
  {
    icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
    label: "Revenue Intelligence",
    description: "See the MRR behind every request. Prioritize by impact, not volume.",
    href: "/#showcase",
  },
  {
    icon: <Map className="w-5 h-5 text-violet-500" />,
    label: "Public Roadmap",
    description: "Show users what's coming next. Build trust, reduce support tickets.",
    href: "/#features",
  },
  {
    icon: <Bell className="w-5 h-5 text-amber-500" />,
    label: "Smart Changelog",
    description: "Auto-notify voters the moment you ship. Zero manual work.",
    href: "/docs?topic=changelog-overview",
  },
  {
    icon: <GitMerge className="w-5 h-5 text-indigo-500" />,
    label: "Two-way Sync",
    description: "Push to Jira, Linear, or Asana. Status flows back automatically.",
    href: "/integrations",
  },
  {
    icon: <Zap className="w-5 h-5 text-teal-500" />,
    label: "Feedback Widget",
    description: "Embed in your app in minutes. Capture feedback in context.",
    href: "/docs?topic=widget-install",
  },
];

const DEVELOPER_ITEMS = [
  {
    icon: <BookOpen className="w-5 h-5 text-blue-500" />,
    label: "Documentation",
    description: "Setup guides and technical reference for every feature.",
    href: "/docs?topic=overview",
  },
  {
    icon: <Code2 className="w-5 h-5 text-violet-500" />,
    label: "REST API",
    description: "Interactive API reference with full endpoint docs.",
    href: "https://api.feeduro.com/docs",
  },
  {
    icon: <Zap className="w-5 h-5 text-amber-500" />,
    label: "Widget SDK",
    description: "Drop one script tag. Works in any stack.",
    href: "/docs?topic=widget-install",
  },
  {
    icon: <Plug className="w-5 h-5 text-teal-500" />,
    label: "Integrations",
    description: "Connect GitHub, Linear, Jira, Asana, Slack, and more.",
    href: "/integrations",
  },
];

type DropdownItem = {
  icon: React.ReactNode;
  label: string;
  description: string;
  href?: string;
};

function NavDropdown({
  label,
  items,
  heading,
  cta,
}: {
  label: string;
  items: DropdownItem[];
  heading: string;
  cta?: { label: string; href: string };
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-black hover:text-black/70 transition-colors"
      >
        {label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {/* Arrow */}
          <div className="flex justify-center mb-0">
            <div className="w-3 h-3 bg-white border-l border-t border-border rotate-45 -mb-1.5 shadow-sm" />
          </div>

          <div
            className="bg-white rounded-2xl shadow-xl border border-border p-5 w-[560px]"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 px-1">
              {heading}
            </p>

            <div className="grid grid-cols-2 gap-1">
              {items.map((item) => {
                const inner = (
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer group">
                    <div className="mt-0.5 shrink-0">{item.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
                return item.href ? (
                  <Link key={item.label} to={item.href}>
                    {inner}
                  </Link>
                ) : (
                  <div key={item.label}>{inner}</div>
                );
              })}
            </div>

            {cta && (
              <div className="mt-4 pt-4 border-t border-border">
                <Link
                  to={cta.href}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {cta.label}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const PLAIN_LINKS = [
  { label: "Integrations", href: "/integrations" },
  { label: "Pricing", href: "/pricing" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = getScrollParent(headerRef.current?.parentElement ?? null) ?? window;
    const getTop = () =>
      container instanceof Window ? container.scrollY : (container as Element).scrollTop;
    const check = () => setScrolled(getTop() > 10);
    check();
    container.addEventListener("scroll", check, { passive: true });
    return () => container.removeEventListener("scroll", check);
  }, []);

  return (
    <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-6xl mx-auto px-6 pt-3">
        <div
          className="pointer-events-auto flex items-center justify-between gap-6 h-14 px-5 rounded-2xl transition-all duration-200"
          style={{
            backgroundColor: scrolled ? "rgba(255,255,255,0.75)" : "transparent",
            backdropFilter: scrolled ? "blur(16px)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
            border: scrolled ? "1px solid rgba(0,0,0,0.08)" : "1px solid transparent",
            boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.10)" : "none",
          }}
        >
          <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span>Feeduro</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <NavDropdown
              label="Why Feeduro?"
              heading="Everything you need to close the feedback loop"
              items={PRODUCT_ITEMS}
              cta={{ label: "See all features →", href: "#features" }}
            />

            {PLAIN_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm text-black hover:text-black/70 transition-colors"
              >
                {link.label}
              </Link>
            ))}

            <NavDropdown
              label="Developers"
              heading="Developer resources"
              items={DEVELOPER_ITEMS}
              cta={{ label: "Read the docs →", href: "/docs" }}
            />
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/sign-in"
              className="hidden sm:block text-sm text-black transition-colors px-3 py-1.5 rounded-lg hover:bg-black/5"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
