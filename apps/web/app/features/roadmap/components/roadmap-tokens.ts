export const T = {
  bg:          '#F7F4EE',
  surface:     '#FFFEFA',
  surfaceAlt:  '#F0ECE3',
  border:      '#E6DFD0',
  borderStrong:'#D6CCB6',
  ink:         '#23211D',
  inkSoft:     '#5A554B',
  inkMuted:    '#8A8377',
  inkFaint:    '#B5AD9D',
  accent:      '#3F6A52',
  accentSoft:  '#E4ECE5',
  accentInk:   '#26412F',
  radius:       12,
  font:        "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
} as const;

export const STATUS_COLORS: Record<string, { dot: string; bg: string; ink: string }> = {
  inprogress: { dot: '#4A6FA5', bg: '#E2EAF4', ink: '#2E4A75' },
  planned:    { dot: '#B68A52', bg: '#F2E8D6', ink: '#7A5A2E' },
  pending:    { dot: '#B68A52', bg: '#F2E8D6', ink: '#7A5A2E' },
  reviewing:  { dot: '#B68A52', bg: '#F2E8D6', ink: '#7A5A2E' },
  completed:  { dot: '#5C8A6E', bg: '#E2ECE3', ink: '#2F5740' },
  closed:     { dot: '#8A8377', bg: '#F0ECE3', ink: '#5A554B' },
};
