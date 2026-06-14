import { T } from "../roadmap-tokens";

export type SortType = 'most-voted' | 'trending' | 'newest';

const OPTIONS: { value: SortType; label: string }[] = [
  { value: 'most-voted', label: 'Most voted' },
  { value: 'trending',   label: 'Trending' },
  { value: 'newest',     label: 'Newest' },
];

export function SortControl({
  value,
  onChange,
}: {
  value: SortType;
  onChange: (v: SortType) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        borderRadius: 10,
        background: T.surfaceAlt,
        border: `1px solid ${T.border}`,
      }}
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 0,
              fontFamily: T.font,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all .15s',
              background: active ? T.surface : 'transparent',
              color: active ? T.ink : T.inkSoft,
              boxShadow: active
                ? '0 1px 2px rgba(0,0,0,.05), 0 0 0 1px rgba(0,0,0,.04)'
                : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
