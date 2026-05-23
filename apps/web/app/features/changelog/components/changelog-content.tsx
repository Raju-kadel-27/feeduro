import type React from 'react';

type Styles = { bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; code?: boolean };
type InlineItem = { type: 'text' | 'link'; text?: string; href?: string; styles?: Styles; content?: InlineItem[] };
type Block = { type: string; props?: Record<string, unknown>; content?: InlineItem[] };

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
  return m?.[1] ?? null;
}

function renderInline(items: InlineItem[] | undefined): React.ReactNode {
  return items?.map((item, i) => {
    if (item.type === 'link') {
      return <a key={i} href={item.href ?? '#'} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{renderInline(item.content)}</a>;
    }
    const s = item.styles ?? {};
    let el: React.ReactNode = item.text ?? '';
    if (s.code) el = <code style={{ padding: '1px 5px', background: 'var(--cl-border)', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.88em' }}>{el}</code>;
    if (s.bold) el = <strong>{el}</strong>;
    if (s.italic) el = <em>{el}</em>;
    if (s.underline) el = <u>{el}</u>;
    if (s.strikethrough) el = <s>{el}</s>;
    return <span key={i}>{el}</span>;
  });
}

const TEXT_STYLE: React.CSSProperties = { margin: '4px 0', fontSize: 15, lineHeight: 1.7, color: 'var(--cl-text-muted)' };

const HEADING: Record<number, React.CSSProperties> = {
  1: { fontSize: 18, fontWeight: 700, margin: '18px 0 5px', lineHeight: 1.25, color: 'var(--cl-text)' },
  2: { fontSize: 16, fontWeight: 600, margin: '14px 0 4px', lineHeight: 1.3, color: 'var(--cl-text)' },
  3: { fontSize: 14, fontWeight: 600, margin: '12px 0 3px', lineHeight: 1.35, color: 'var(--cl-text)' },
};

function renderBlock(block: Block, key: number, listNum: number): React.ReactNode {
  const p = block.props ?? {};
  switch (block.type) {
    case 'paragraph':
      return <p key={key} style={TEXT_STYLE}>{renderInline(block.content)}</p>;
    case 'heading': {
      const level = (p.level as number) ?? 2;
      return <div key={key} style={HEADING[level] ?? HEADING[3]}>{renderInline(block.content)}</div>;
    }
    case 'bulletListItem':
      return (
        <div key={key} style={{ display: 'flex', gap: 8, ...TEXT_STYLE }}>
          <span style={{ marginTop: 9, width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
          <span>{renderInline(block.content)}</span>
        </div>
      );
    case 'numberedListItem':
      return (
        <div key={key} style={{ display: 'flex', gap: 8, ...TEXT_STYLE }}>
          <span style={{ flexShrink: 0 }}>{listNum}.</span>
          <span>{renderInline(block.content)}</span>
        </div>
      );
    case 'checkListItem':
      return (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, ...TEXT_STYLE }}>
          <input type="checkbox" readOnly checked={!!p.checked} style={{ flexShrink: 0 }} />
          <span style={{ textDecoration: p.checked ? 'line-through' : 'none', opacity: p.checked ? 0.55 : 1 }}>
            {renderInline(block.content)}
          </span>
        </div>
      );
    case 'image':
      return p.url
        ? <img key={key} src={p.url as string} alt={(p.alt as string) || ''} style={{ maxWidth: '100%', height: 'auto', borderRadius: 10, margin: '12px 0', display: 'block' }} />
        : null;
    case 'video':
      return p.url
        // biome-ignore lint/a11y/useMediaCaption: user-pasted URL, captions unavailable
        ? <video key={key} src={p.url as string} controls style={{ width: '100%', borderRadius: 10, margin: '12px 0', maxHeight: 400 }} />
        : null;
    case 'youtube': {
      const vid = extractYouTubeId((p.url as string) ?? '');
      return vid
        ? (
          <div key={key} style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 10, overflow: 'hidden', margin: '12px 0' }}>
            <iframe
              src={`https://www.youtube.com/embed/${vid}`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
            />
          </div>
        )
        : null;
    }
    case 'codeBlock': {
      const text = block.content?.map((c) => c.text ?? '').join('') ?? '';
      return (
        <pre key={key} style={{ margin: '10px 0', padding: '10px 14px', background: 'var(--cl-border)', borderRadius: 8, fontSize: 11.5, fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.55 }}>
          <code>{text}</code>
        </pre>
      );
    }
    default:
      return null;
  }
}

export function ChangelogContent({ body }: { body: string }) {
  let blocks: Block[];
  try {
    const parsed = JSON.parse(body);
    blocks = Array.isArray(parsed) ? parsed : [];
  } catch {
    return null;
  }

  const rendered: React.ReactNode[] = [];
  let numCounter = 0;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    numCounter = b.type === 'numberedListItem' ? numCounter + 1 : 0;
    rendered.push(renderBlock(b, i, numCounter));
  }

  return <div style={{ marginTop: 12 }}>{rendered}</div>;
}
