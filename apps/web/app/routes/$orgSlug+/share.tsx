import {
  AlertCircle,
  Check,
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

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "announce" | "footer" | "links" | "outreach";

export default function SharePage({ loaderData }: Route.ComponentProps) {
  const { org, userName, publicBoardUrl, links } = loaderData;
  const [tab, setTab] = useState<Tab>("announce");
  const [selectedMsg, setSelectedMsg] = useState(0);

  const shareUrl = encodeURIComponent(publicBoardUrl);
  const tweetText = encodeURIComponent(
    `We opened up our feedback board for ${org.name} — drop your ideas, vote on what matters, and help shape what we build next.`,
  );
  const redditTitle = encodeURIComponent(
    `${org.name} now has a public feedback board — vote on what gets built next`,
  );
  const linkedInText = encodeURIComponent(
    `We've opened a public feedback board for ${org.name}.\n\nHave a feature request, spotted a bug, or just have thoughts on where we should go? This is the place:\n\n${publicBoardUrl}\n\nWe go through every submission. Highest-voted ideas get prioritized first.`,
  );

  const socials = [
    {
      label: "Twitter / X",
      description: "Reach your followers in one post",
      icon: XIcon,
      color: "#000000",
      href: `https://x.com/intent/post?text=${tweetText}&url=${shareUrl}`,
    },
    {
      label: "LinkedIn",
      description: "Announce it to your professional network",
      icon: LinkedinIcon,
      color: "#0a66c2",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&summary=${linkedInText}&title=${encodeURIComponent(`Feedback board for ${org.name}`)}`,
    },
    {
      label: "Facebook",
      description: "Share it on a page or in a group",
      icon: FacebookIcon,
      color: "#1877f2",
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    },
    {
      label: "Reddit",
      description: "Post it where your community hangs out",
      icon: RedditIcon,
      color: "#ff4500",
      href: `https://www.reddit.com/submit?url=${shareUrl}&title=${redditTitle}`,
    },
  ];

  const footerSnippet = `${userName || "[Your name]"} from ${org.name}\n\nHave thoughts on ${org.name}? We'd love to hear them.\n${publicBoardUrl}`;

  const channels = [
    {
      icon: MessageSquare,
      label: "Team chat",
      description: "Paste into Slack, Discord, or Teams",
      message: `Hey team 👋\n\nWe set up a place to collect product ideas — drop anything in:\n\n${publicBoardUrl}\n\nFeature requests, bugs, things that annoy you, things you love — it all helps. Upvote what matters most and we'll build from the top.`,
    },
    {
      icon: Mail,
      label: "User outreach",
      description: "A direct note to customers you want input from",
      message: `Subject: Got 60 seconds? Tell us what to build next.\n\nHi [name],\n\nYou've been using ${org.name} for a while now, and I'd love to know what's on your mind.\n\nWhat's missing? What should work differently? What would make your day easier?\n\n→ ${publicBoardUrl}\n\nIt's quick, your vote actually counts, and we read everything.\n\nThanks,\n${userName || "[Your name]"}`,
    },
    {
      icon: Users,
      label: "Community",
      description: "Works for Reddit, Discord servers, or forums",
      message: `We just launched a public feedback board for ${org.name} 🎉\n\nTell us what you want to see, vote on ideas from other users, and watch us build in the open.\n\n${publicBoardUrl}\n\nEvery vote shapes what we prioritize. Come make your mark.`,
    },
    {
      icon: LifeBuoy,
      label: "Support response",
      description: "Add to your helpdesk as a canned reply",
      message: `Thanks for writing in!\n\nOne more thing — if you have a feature request or idea, our feedback board is the fastest way to get it in front of us:\n\n${publicBoardUrl}\n\nYour idea might already have votes, or you can add a new one. We check it regularly and it directly influences what we build.`,
    },
    {
      icon: Send,
      label: "Broadcast email",
      description: "A short note for your next newsletter or mailing list",
      message: `Subject: You help decide what ${org.name} builds next.\n\nHi [name],\n\nWe just made it easy to tell us exactly what you want from ${org.name}.\n\nVote on existing ideas, add your own, or just browse what others are saying:\n\n${publicBoardUrl}\n\nTakes a minute. We build from the top of the board, so your vote matters.\n\n— ${userName || "[Your name]"}`,
    },
    {
      icon: Code2,
      label: "Dev request",
      description: "Forward to whoever manages your codebase",
      message: `Hey,\n\nSmall ask: can you add a link to our feedback board somewhere in the product?\n\n${publicBoardUrl}\n\nGreat spots for it:\n- Help menu or "?" icon\n- App footer\n- Settings page\n- Onboarding flow\n\nA simple text link works great. Thanks!`,
    },
  ];

  const allLinks = `Feedback: ${links.feedback}\nRoadmap: ${links.roadmap}\nChangelog: ${links.changelog}`;
  const ActiveMsgIcon = channels[selectedMsg].icon;

  const tabs: { id: Tab; label: string }[] = [
    { id: "announce", label: "Social" },
    { id: "footer", label: "Email" },
    { id: "links", label: "Your links" },
    { id: "outreach", label: "Copy & paste" },
  ];

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Hero */}
        <div className="px-6 pt-1 pb-3">
          <h1 className="text-lg font-semibold">Share your board</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Put {org.name} in front of the people who matter most.
          </p>

          <div className="mt-3 rounded-xl border border-border bg-gradient-to-br from-muted/40 to-muted/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="text-sm font-medium">{org.name} is accepting feedback</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex items-center gap-2 flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 cursor-text"
                onClick={(e) => {
                  const range = document.createRange();
                  range.selectNodeContents(e.currentTarget);
                  window.getSelection()?.removeAllRanges();
                  window.getSelection()?.addRange(range);
                }}
              >
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono text-foreground/80 truncate">{publicBoardUrl}</span>
              </div>
              <CopyBtn text={publicBoardUrl} label="Copy link" variant="primary" />
              <a
                href={publicBoardUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open your public board"
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
                Visit
              </a>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="border-b border-border shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex flex-nowrap gap-0 -mb-px px-6 min-w-fit">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  tab === t.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 max-w-5xl w-full">
          {/* ── Announce (Social) ────────────────────────────────────── */}
          {tab === "announce" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Share on ${s.label}`}
                  className="flex flex-col items-center gap-3 rounded-xl border border-border p-5 hover:bg-muted/50 hover:border-border/80 transition-all group text-center"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{ background: s.color }}
                  >
                    <s.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-none">{s.label}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{s.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1 mt-auto">
                    Share <ExternalLink className="h-3 w-3" />
                  </span>
                </a>
              ))}
            </div>
          )}

          {/* ── Email footer ─────────────────────────────────────────── */}
          {tab === "footer" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add this to the bottom of your emails — every outbound message carries a quiet invite.
              </p>
              <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-1.5">
                <p className="text-sm font-medium">
                  {userName || "[Your name]"} from {org.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Have thoughts on {org.name}? We'd love to hear them.{" "}
                  <span className="text-primary underline underline-offset-2">{publicBoardUrl}</span>
                </p>
              </div>
              <div className="flex justify-end">
                <CopyBtn text={footerSnippet} label="Copy footer" variant="secondary" />
              </div>
            </div>
          )}

          {/* ── Embed links ──────────────────────────────────────────── */}
          {tab === "links" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Wire these into your product — help menus, footers, docs. Paste once and they work forever.
              </p>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {[
                  { label: "Feedback", url: links.feedback },
                  { label: "Roadmap", url: links.roadmap },
                  { label: "Changelog", url: links.changelog },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/10"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{item.url}</p>
                    </div>
                    <CopyBtn text={item.url} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <CopyBtn text={allLinks} label="Copy all" variant="secondary" />
              </div>
            </div>
          )}

          {/* ── Outreach kit ─────────────────────────────────────────── */}
          {tab === "outreach" && (
            <div className="space-y-4">
              {!userName && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Some messages include <strong className="mx-0.5">[Your name]</strong> — fill that in via
                  account settings first.
                </div>
              )}

              <div className="flex gap-6 items-start">
                {/* Left: vertical channel list */}
                <div className="flex flex-col gap-1 w-44 shrink-0">
                  {channels.map((c, i) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setSelectedMsg(i)}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors",
                        selectedMsg === i
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <c.icon className="h-3.5 w-3.5 shrink-0" />
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Right: message panel */}
                <div className="flex-1 min-w-0 rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground truncate">{channels[selectedMsg].description}</span>
                    <CopyBtn text={channels[selectedMsg].message} label="Copy message" variant="secondary" />
                  </div>
                  <pre className="px-4 py-4 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap font-sans">
                    {channels[selectedMsg].message}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
