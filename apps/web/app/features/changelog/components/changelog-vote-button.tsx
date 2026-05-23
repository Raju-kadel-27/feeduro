import { useState } from "react";

const MINT = '#7EB8A6';
const MINT_SOFT = 'rgba(126,184,166,0.14)';

interface Props {
  count: number;
  initialVoted: boolean;
}

export function ChangelogVoteButton({ count, initialVoted }: Props) {
  const [voted, setVoted] = useState(initialVoted);
  const [votes, setVotes] = useState(count);

  function toggle() {
    const next = !voted;
    setVoted(next);
    setVotes((v) => (next ? v + 1 : v - 1));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '10px 14px',
        minWidth: 64,
        borderRadius: 10,
        cursor: 'pointer',
        border: voted ? `1px solid ${MINT}` : '1px solid var(--cl-border)',
        background: voted ? MINT_SOFT : 'var(--cl-surface)',
        color: voted ? MINT : 'var(--cl-text)',
        transition: 'all .15s',
        flexShrink: 0,
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      <span style={{ fontSize: 14, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
        {votes}
      </span>
    </button>
  );
}
