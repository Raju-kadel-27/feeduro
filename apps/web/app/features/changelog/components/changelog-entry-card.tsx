import type { PublicChangelog } from "@features/feedback/schemas/public";
import { Check, Link, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { ChangelogContent } from "./changelog-content";
import { ChangelogTag } from "./changelog-tag";

const MINT = '#7EB8A6';
const MINT_SOFT = 'rgba(126,184,166,0.14)';
const MONO = '"Geist Mono", "JetBrains Mono", ui-monospace, monospace';

type Props = Pick<PublicChangelog, 'id' | 'title' | 'body' | 'version' | 'tags' | 'voteCount' | 'voted' | 'slug'> & {
  orgSlug: string;
  onAuthRequired: () => void;
  userEmail: string | null;
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const iconBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid var(--cl-border)',
  background: 'var(--background)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--cl-text-muted)',
  flexShrink: 0,
  transition: 'background 0.15s, color 0.15s',
};

export function ChangelogEntryCard({ id, title, body, version, tags, voteCount, voted, slug, orgSlug, onAuthRequired, userEmail }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [liked, setLiked] = useState(voted ?? false);
  const [likes, setLikes] = useState(voteCount ?? 0);
  const [copied, setCopied] = useState(false);
  const hasTagRow = version || (tags && tags.length > 0);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${orgSlug}/changelog/${slug}`
    : `/${orgSlug}/changelog/${slug}`;

  async function handleLike() {
    if (!userEmail) { onAuthRequired(); return; }
    const next = !liked;
    setLiked(next);
    setLikes((n) => next ? n + 1 : n - 1);
    try {
      await fetch('/api/changelog-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changelogId: id, orgSlug }),
      });
    } catch {
      setLiked(!next);
      setLikes((n) => next ? n - 1 : n + 1);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare(platform: 'facebook' | 'twitter') {
    const url = platform === 'facebook'
      ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
      : `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  return (
    <div
      style={{
        flex: 1,
        padding: 20,
        borderRadius: 14,
        background: 'var(--background)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {hasTagRow && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {version && (
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: MINT, background: MINT_SOFT, padding: '3px 8px', borderRadius: 6, letterSpacing: 0.3 }}>
                {version}
              </span>
            )}
            {tags?.map((tag) => <ChangelogTag key={tag} label={tag} />)}
          </div>
        )}

        <h3 style={{ fontSize: 18, lineHeight: 1.3, letterSpacing: -0.3, fontWeight: 700, color: 'var(--cl-text)', margin: 0 }}>
          {title}
        </h3>

        {expanded && <ChangelogContent body={body} />}

        {/* Like + share row — only visible when expanded */}
        {expanded && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handleLike}
              aria-label={liked ? 'Unlike' : 'Like'}
              style={{
                ...iconBtn,
                border: liked ? '1px solid var(--primary)' : '1px solid var(--cl-border)',
                background: liked ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--background)',
                color: liked ? 'var(--primary)' : 'var(--cl-text-muted)',
              }}
            >
              <HeartIcon filled={liked} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-muted)' }}>
              {likes}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" onClick={handleCopy} style={{ ...iconBtn, color: copied ? MINT : 'var(--cl-text-muted)' }} aria-label="Copy link">
              {copied ? <Check size={13} /> : <Link size={13} />}
            </button>
            <button type="button" onClick={() => handleShare('facebook')} style={iconBtn} aria-label="Share on Facebook">
              <FacebookIcon />
            </button>
            <button type="button" onClick={() => handleShare('twitter')} style={iconBtn} aria-label="Share on X">
              <XIcon />
            </button>
          </div>
        </div>}
      </div>

      {/* Expand / collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? 'Collapse' : 'Expand'}
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1px solid var(--cl-border)',
          background: 'var(--background)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--cl-text-muted)',
        }}
      >
        {expanded ? <Minus size={12} /> : <Plus size={12} />}
      </button>
    </div>
  );
}
