import type { PublicChangelog } from "@features/feedback/schemas/public";
import { ChangelogEntryCard } from "./changelog-entry-card";

const MINT = '#7EB8A6';
const MONO = '"Geist Mono", "JetBrains Mono", ui-monospace, monospace';

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRelative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

interface Props {
  entry: PublicChangelog;
  isLast: boolean;
}

export function UpdateEntry({ entry, isLast }: Props) {
  const { title, publishedAt, body, authorName, version, tags, voteCount, voted, commentCount } =
    entry;

  return (
    <div style={{ display: 'flex', position: 'relative', marginBottom: isLast ? 0 : 32 }}>
      {/* Date column */}
      <div style={{ width: 120, flexShrink: 0, paddingTop: 4 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--cl-text-muted)',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {formatDateShort(publishedAt)}
        </div>
        <div
          style={{ fontFamily: MONO, fontSize: 12, color: 'var(--cl-text-muted)', opacity: 0.7, marginTop: 2 }}
        >
          {formatRelative(publishedAt)}
        </div>
      </div>

      {/* Timeline connector */}
      <div style={{ width: 40, flexShrink: 0, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: isLast ? 'auto' : -32,
            height: isLast ? 16 : undefined,
            width: 1,
            background: 'var(--cl-border)',
            transform: 'translateX(-50%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 4,
            width: 11,
            height: 11,
            borderRadius: '50%',
            background: 'var(--background)',
            border: `2px solid ${MINT}`,
            boxShadow: '0 0 0 4px var(--background)',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      <ChangelogEntryCard
        title={title}
        body={body}
        authorName={authorName}
        version={version}
        tags={tags}
        voteCount={voteCount}
        voted={voted}
        commentCount={commentCount}
      />
    </div>
  );
}
