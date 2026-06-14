import { Check, Copy } from "lucide-react";
import { useState } from "react";

type Props = { label: string; code: string; wrap?: boolean };

export function CodeBlock({ label, code, wrap = false }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-[11px] font-medium text-zinc-400 tracking-wide">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 h-6 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        className={`p-4 text-[13px] font-mono leading-relaxed overflow-x-auto text-zinc-300 bg-zinc-950 ${wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}
      >
        {code}
      </pre>
    </div>
  );
}
