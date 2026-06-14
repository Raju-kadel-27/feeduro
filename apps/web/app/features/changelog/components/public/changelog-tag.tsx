const MONO = '"Geist Mono", "JetBrains Mono", ui-monospace, monospace';

const TAG_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  feature: { color: 'var(--cl-tag-feature)', bg: 'rgba(126,184,166,0.10)', border: 'rgba(126,184,166,0.30)' },
  improvement: { color: 'var(--cl-tag-improvement)', bg: 'rgba(212,160,90,0.10)', border: 'rgba(212,160,90,0.30)' },
  api: { color: 'var(--cl-tag-api)', bg: 'rgba(122,138,176,0.12)', border: 'rgba(122,138,176,0.30)' },
  performance: { color: 'var(--cl-tag-performance)', bg: 'rgba(212,160,90,0.10)', border: 'rgba(212,160,90,0.30)' },
  fix: { color: 'var(--cl-tag-fix)', bg: 'rgba(224,133,133,0.10)', border: 'rgba(224,133,133,0.30)' },
};

const DEFAULT_STYLE = { color: 'var(--cl-text-muted)', bg: 'var(--cl-surface-alt)', border: 'var(--cl-border)' };

export function ChangelogTag({ label }: { label: string }) {
  const s = TAG_STYLES[label.toLowerCase()] ?? DEFAULT_STYLE;
  return (
    <span
      style={{
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: MONO,
        letterSpacing: 0.2,
        display: 'inline-flex',
        alignItems: 'center',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}
