import type { AdminStatus } from "@features/feedback/schemas/admin";

export function StatusCircleIcon({ status, size = 16 }: { status: AdminStatus; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  if (status === "completed") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={r} fill="#22c55e" />
        <polyline
          points={`${size * 0.3},${cy} ${size * 0.46},${size * 0.65} ${size * 0.72},${size * 0.37}`}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "closed") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#f87171" strokeWidth="1.5" />
        <line x1={size * 0.35} y1={size * 0.35} x2={size * 0.65} y2={size * 0.65} stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={size * 0.65} y1={size * 0.35} x2={size * 0.35} y2={size * 0.65} stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "in-progress") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#8b5cf6" strokeWidth="1.5" />
        <path d={`M${cx},${cy - r} A${r},${r} 0 0,1 ${cx},${cy + r} Z`} fill="#8b5cf6" />
      </svg>
    );
  }
  if (status === "reviewing") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#f97316" strokeWidth="1.5" />
        <path d={`M${cx},${cy - r} A${r},${r} 0 0,1 ${cx},${cy + r} Z`} fill="#f97316" />
      </svg>
    );
  }
  if (status === "planned") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#eab308" strokeWidth="1.5" strokeDasharray="3.5 2" />
        <circle cx={cx} cy={cy} r={size * 0.14} fill="#eab308" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={cy} r={r} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3.5 2" />
    </svg>
  );
}
