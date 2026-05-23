import type { PublicChangelog } from "@features/feedback/schemas/public";
import { getInitials } from "@features/feedback/utils";
import { MessageSquare } from "lucide-react";
import { ChangelogContent } from "./changelog-content";
import { ChangelogTag } from "./changelog-tag";
import { ChangelogVoteButton } from "./changelog-vote-button";

const MINT = '#7EB8A6';
const MINT_SOFT = 'rgba(126,184,166,0.14)';
const MONO = '"Geist Mono", "JetBrains Mono", ui-monospace, monospace';

type Props = Pick<
  PublicChangelog,
  'title' | 'body' | 'authorName' | 'version' | 'tags' | 'voteCount' | 'voted' | 'commentCount'
>;

export function ChangelogEntryCard({
  title,
  body,
  authorName,
  version,
  tags,
  voteCount,
  voted,
  commentCount,
}: Props) {
  const hasTagRow = version || (tags && tags.length > 0);

  return (
    <div
      style={{
        flex: 1,
        padding: 24,
        borderRadius: 14,
        background: 'var(--cl-surface)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {hasTagRow && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {version && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  fontWeight: 700,
                  color: MINT,
                  background: MINT_SOFT,
                  padding: '3px 8px',
                  borderRadius: 6,
                  letterSpacing: 0.3,
                }}
              >
                {version}
              </span>
            )}
            {tags?.map((tag) => <ChangelogTag key={tag} label={tag} />)}
          </div>
        )}

        <h3
          style={{
            fontSize: 20,
            lineHeight: 1.3,
            letterSpacing: -0.3,
            fontWeight: 700,
            color: 'var(--cl-text)',
            margin: 0,
          }}
        >
          {title}
        </h3>

        <ChangelogContent body={body} />

        <div
          style={{
            paddingTop: 14,
            borderTop: '1px solid var(--cl-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: MINT,
                color: '#0E1116',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                fontFamily: MONO,
                flexShrink: 0,
              }}
            >
              {getInitials(authorName)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text)' }}>{authorName}</span>
          </div>
          <span style={{ flex: 1 }} />
          {commentCount != null && (
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--cl-text-muted)',
                padding: '6px 10px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MessageSquare size={14} />
              {commentCount}
            </button>
          )}
        </div>
      </div>

      {voteCount != null && (
        <ChangelogVoteButton count={voteCount} initialVoted={voted ?? false} />
      )}
    </div>
  );
}
