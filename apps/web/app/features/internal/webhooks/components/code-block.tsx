import { cn } from "@lib/utils";
import { CopyButton } from "./shared";

// Token types for simple JS highlighting
type TokenType = "comment" | "keyword" | "string" | "number" | "method" | "plain";
type Token = { type: TokenType; text: string };

const KEYWORDS = new Set([
  "const", "let", "var", "await", "async", "return", "function",
  "false", "true", "null", "new", "of", "for", "if",
]);

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];

  // Comment
  const commentIdx = line.indexOf("//");
  if (commentIdx !== -1) {
    // tokenize the part before the comment, then the comment itself
    const before = line.slice(0, commentIdx);
    tokens.push(...tokenizeLine(before));
    tokens.push({ type: "comment", text: line.slice(commentIdx) });
    return tokens;
  }

  return tokenizeLine(line);
}

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Template literal
    if (line[i] === "`") {
      const end = line.indexOf("`", i + 1);
      const text = end === -1 ? line.slice(i) : line.slice(i, end + 1);
      tokens.push({ type: "string", text });
      i += text.length;
      continue;
    }
    // Single-quoted string
    if (line[i] === "'") {
      const end = line.indexOf("'", i + 1);
      const text = end === -1 ? line.slice(i) : line.slice(i, end + 1);
      tokens.push({ type: "string", text });
      i += text.length;
      continue;
    }
    // Word (keyword or identifier)
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[\w$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      // Check if it's followed by ( to highlight as method
      const isMethod = line[j] === "(";
      if (KEYWORDS.has(word)) {
        tokens.push({ type: "keyword", text: word });
      } else if (isMethod) {
        tokens.push({ type: "method", text: word });
      } else {
        tokens.push({ type: "plain", text: word });
      }
      i = j;
      continue;
    }
    // Number
    if (/\d/.test(line[i])) {
      let j = i;
      while (j < line.length && /[\d_]/.test(line[j])) j++;
      tokens.push({ type: "number", text: line.slice(i, j) });
      i = j;
      continue;
    }
    // Other chars
    tokens.push({ type: "plain", text: line[i] });
    i++;
  }

  return tokens;
}

const TOKEN_CLASSES: Record<TokenType, string> = {
  comment: "text-muted-foreground italic",
  keyword: "text-violet-400",
  string: "text-emerald-400",
  number: "text-amber-400",
  method: "text-sky-400",
  plain: "text-slate-300",
};

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const lines = code.split("\n");

  return (
    <div className="relative group rounded-lg border border-border bg-[#0f1117] overflow-hidden">
      {language && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/5">
          <span className="text-xs text-muted-foreground font-mono">{language}</span>
          <CopyButton value={code} />
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-xs font-mono leading-relaxed">
        {lines.map((line, li) => (
          <div key={li}>
            {tokenize(line).map((token, ti) => (
              <span key={ti} className={cn(TOKEN_CLASSES[token.type])}>
                {token.text}
              </span>
            ))}
          </div>
        ))}
      </pre>
    </div>
  );
}
