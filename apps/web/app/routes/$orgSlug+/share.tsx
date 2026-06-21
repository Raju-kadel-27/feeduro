import {
  AlertCircle,
  Check,
  ChevronDown,
  Code2,
  Copy,
  ExternalLink,
  LifeBuoy,
  Link2,
  Mail,
  MessageSquare,
  Send,
  Users,
} from "lucide-react";
import { useState } from "react";
import { data } from "react-router";

// Brand icons not available in lucide-react — minimal inline SVGs
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.754l7.58-8.637L2.25 2.25h6.907l4.277 5.658 4.81-5.658zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}
function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function RedditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

import { SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { cn } from "@lib/utils";
import { getEnv } from "@utils/get-env";
import type { Route } from "./+types/share";

export function meta({ data: d }: Route.MetaArgs) {
  if (!d) return [{ title: "Share — Feeduro" }];
  return [{ title: `Share ${d.org.name} — Feeduro` }];
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, org } = await requireOrgBySlug(request, params.orgSlug);
  const env = getEnv();

  const isDev = env.ENVIRONMENT === "development";
  const publicBoardUrl = isDev ? `${env.BASE_URL}/${org.slug}` : `https://${org.slug}.feeduro.com`;

  return data({
    org: { name: org.name ?? "", slug: org.slug ?? "" },
    userName: session.user.name ?? "",
    publicBoardUrl,
    links: {
      feedback: publicBoardUrl,
      roadmap: `${publicBoardUrl}/roadmap`,
      changelog: `${publicBoardUrl}/changelog`,
    },
  });
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({
  text,
  label = "Copy",
  className,
  variant = "ghost",
}: {
  text: string;
  label?: string;
  className?: string;
  variant?: "ghost" | "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md text-sm border transition-colors shrink-0",
        variant === "ghost"
          ? "px-2.5 h-7 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          : variant === "secondary"
            ? "px-3 h-8 border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
            : "px-3 h-8 border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

// ─── Social share button ──────────────────────────────────────────────────────

function SocialBtn({
  href,
  icon: Icon,
  label,
  description,
  color,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Share on ${label}`}
      className="flex items-center gap-3 rounded-lg border border-border p-3.5 hover:bg-muted/50 transition-colors group"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold"
        style={{ background: color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
    </a>
  );
}

// ─── Expandable message card ──────────────────────────────────────────────────

function MessageCard({
  icon: Icon,
  title,
  description,
  message,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  message: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `msg-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-none">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div id={panelId} className="border-t border-border bg-muted/20">
          <pre className="px-4 py-3 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap font-sans">
            {message}
          </pre>
          <div className="flex justify-end px-4 pb-3">
            <CopyBtn text={message} label="Copy message" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SharePage({ loaderData }: Route.ComponentProps) {
  const { org, userName, publicBoardUrl, links } = loaderData;

  // ── Social share URLs ──────────────────────────────────────────────────────
  // Twitter: text + url as separate params so Twitter counts the URL as 23 chars
  // LinkedIn: only url is supported by their sharer — OG tags generate the preview
  // Facebook: only u is supported — OG tags generate the preview
  // Reddit: url + title pre-fills a ready-to-submit link post
  const shareUrl = encodeURIComponent(publicBoardUrl);
  const tweetText = encodeURIComponent(
    `We just set up a public feedback board for ${org.name} — share your ideas and vote on what we should build next! 🚀`,
  );
  const redditTitle = encodeURIComponent(
    `We just launched a public feedback board for ${org.name} — tell us what to build next!`,
  );
  const linkedInText = encodeURIComponent(
    `We just launched a public feedback board for ${org.name}.\n\nGot feature requests, bug reports, or ideas? Head over, drop them in, and vote on what matters most:\n\n${publicBoardUrl}\n\nWe review everything — your input shapes what we build next.`,
  );

  const socials = [
    {
      label: "Twitter / X",
      description: "Post to your followers.",
      icon: XIcon,
      color: "#000000",
      href: `https://x.com/intent/post?text=${tweetText}&url=${shareUrl}`,
    },
    {
      label: "LinkedIn",
      description: "Share with your network.",
      icon: LinkedinIcon,
      color: "#0a66c2",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&summary=${linkedInText}&title=${encodeURIComponent(`Feedback board for ${org.name}`)}`,
    },
    {
      label: "Facebook",
      description: "Post to a page or group.",
      icon: FacebookIcon,
      color: "#1877f2",
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    },
    {
      label: "Reddit",
      description: "Share in a subreddit.",
      icon: RedditIcon,
      color: "#ff4500",
      href: `https://www.reddit.com/submit?url=${shareUrl}&title=${redditTitle}`,
    },
  ];

  // ── App links ──────────────────────────────────────────────────────────────
  const allLinks = `Feedback: ${links.feedback}\nRoadmap: ${links.roadmap}\nChangelog: ${links.changelog}`;

  // ── Email signature ────────────────────────────────────────────────────────
  const emailSig = `${userName || "[Your name]"} from ${org.name}\n\nGot feedback about ${org.name}?\nShare your thoughts here → ${publicBoardUrl}`;

  // ── Ready-to-paste messages ────────────────────────────────────────────────
  const messages = [
    {
      icon: MessageSquare,
      title: "Slack / Discord",
      description: "Drop this in a team or community channel.",
      message: `Hey team 👋 We've set up a feedback board for ${org.name}. Got ideas, bugs, or requests? Drop them here and upvote what matters most:\n\n${publicBoardUrl}\n\nWe review everything — your input directly shapes what we build next.`,
    },
    {
      icon: Mail,
      title: "Email to users",
      description: "Send this to customers you want to hear from.",
      message: `Subject: We want to hear from you\n\nHi [name],\n\nWe're always working to make ${org.name} better — and your feedback is the most valuable thing we have.\n\nGot a feature request? Spotted a bug? Have ideas about where we should go next? Head to our feedback board:\n\n${publicBoardUrl}\n\nIt takes 2 minutes and directly shapes what we build. We read everything.\n\nThanks for being part of this,\n${userName || "[Your name]"}`,
    },
    {
      icon: Users,
      title: "Community post",
      description: "For forums, groups, or anywhere your users gather.",
      message: `We've launched a public feedback board for ${org.name}!\n\nTell us what you'd like to see, vote on ideas from other users, and follow along as we build in the open.\n\n👉 ${publicBoardUrl}\n\nEvery vote and comment helps us prioritize. Would love to see you there.`,
    },
    {
      icon: LifeBuoy,
      title: "Support reply",
      description: "Paste this into a ticket reply or canned response.",
      message: `Thanks for reaching out!\n\nYou can also share feature requests and vote on ideas from other users on our feedback board — we check it regularly and it helps us prioritize:\n\n${publicBoardUrl}\n\nWe'd love to see your idea there too.`,
    },
    {
      icon: Send,
      title: "Customer email",
      description: "Send this to your user list to kick things off.",
      message: `Subject: Your feedback shapes ${org.name}\n\nHi [name],\n\nQuick note: we've made it easy to share feedback, vote on features, and see what's coming next for ${org.name}.\n\nDrop your ideas here:\n${publicBoardUrl}\n\nTakes 60 seconds. We read everything and the most-voted ideas get built first.\n\nThanks,\n${userName || "[Your name]"}`,
    },
    {
      icon: Code2,
      title: "Send to your developer",
      description: "Forward this to whoever handles your codebase.",
      message: `Hey!\n\nCan you add a link to our feedback board in the app? Just link to:\n\n${publicBoardUrl}\n\nGood places to add it:\n- Help or support menu\n- Settings page footer\n- App footer or sidebar\n- Onboarding flow\n\nThanks!`,
    },
  ];

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="p-6 max-w-3xl mx-auto w-full space-y-8 pb-16">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-semibold">Collect Feedback</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Get {org.name} in front of your users.
          </p>
        </div>

        {/* ── Board is live ─────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-semibold">Your {org.name} board is live</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Share it with your users, drop it in your docs, or link it from your website.
          </p>

          {/* URL row */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm text-foreground/80 truncate font-mono min-w-0">
              {publicBoardUrl}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <CopyBtn text={publicBoardUrl} label="Copy link" variant="secondary" />
              <a
                href={publicBoardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Visit
              </a>
            </div>
          </div>

          {/* Social share — collapsed by default */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
              Share on social
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {socials.map((s) => (
                <SocialBtn key={s.label} {...s} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Email signature ───────────────────────────────────────────── */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Email signature</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add this to your sign-off. Every email you send becomes an invite.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              {userName || "[Your name]"} from {org.name}
            </p>
            <p className="text-sm text-muted-foreground">
              Got feedback about {org.name}?{" "}
              <span className="text-primary underline-offset-2 underline">
                Share your thoughts here →
              </span>
            </p>
          </div>

          <div className="flex justify-end">
            <CopyBtn text={emailSig} label="Copy snippet" />
          </div>
        </section>

        {/* ── Add to your app ───────────────────────────────────────────── */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Add to your app or website</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Drop these links into your help menu, footer, or docs. Set once, collect forever.
            </p>
          </div>

          <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
            {[
              { label: "Feedback", url: links.feedback },
              { label: "Roadmap", url: links.roadmap },
              { label: "Changelog", url: links.changelog },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-muted/20"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">{item.url}</p>
                </div>
                <CopyBtn text={item.url} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              © {org.name} · Feedback · Roadmap · Changelog
            </p>
            <CopyBtn text={allLinks} label="Copy all links" />
          </div>
        </section>

        {/* ── Ready-to-paste messages ───────────────────────────────────── */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Ready-to-paste messages</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pick a channel, copy the message, paste it. Each one is written for {org.name}.
            </p>
          </div>

          {!userName && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Messages contain <strong className="mx-0.5">[Your name]</strong> — add your name in
              account settings before copying.
            </div>
          )}

          <div className="space-y-2">
            {messages.map((m) => (
              <MessageCard key={m.title} {...m} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
