import React from "react";

// A small, safe Markdown renderer for Knowledge Studio's preview: it builds React elements (never HTML strings), so a
// note can never inject markup or script. Supports what the knowledge brain uses: headings, paragraphs, bold, italic,
// inline code, code blocks, lists, block quotes, status callouts (> [!incomplete] ...), web links (http/https only,
// opened in a new tab) and Obsidian-style [[wiki links]] (resolved to notes by the caller).

export interface WikiLinkResolver {
  /** The note a [[target]] points to, or null when no note has that title or alias. */
  resolve: (target: string) => { path: string; title: string } | null;
  open: (path: string) => void;
}

const CALLOUT = /^>\s*\[!(verified|policy|incomplete|pending|outdated)\]\s*(.*)$/;

const STATUS_STYLE: Record<string, string> = {
  verified: "border-emerald-500/40 bg-emerald-500/5",
  policy: "border-sky-500/40 bg-sky-500/5",
  incomplete: "border-amber-500/50 bg-amber-500/5",
  pending: "border-violet-500/50 bg-violet-500/5",
  outdated: "border-zinc-500/50 bg-zinc-500/10",
};

const inline = (text: string, links: WikiLinkResolver | null, key = "i"): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  // Order matters: code first (its content is literal), then wiki links, web links, bold, italic.
  const pattern = /(`[^`]+`)|(\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\])|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*\s][^*]*)\*|_([^_\s][^_]*)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[1]) out.push(<code key={k} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{m[1].slice(1, -1)}</code>);
    else if (m[2]) {
      const target = m[3]!.trim();
      const shown = (m[4] ?? m[3]!).trim();
      const hit = links?.resolve(target) ?? null;
      out.push(
        hit ? (
          <button key={k} type="button" onClick={() => links!.open(hit.path)} className="text-violet-300 underline decoration-violet-400/50 underline-offset-2 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
            {shown}
          </button>
        ) : (
          <span key={k} className="text-destructive underline decoration-dotted" title="No note has this title or alias">{shown}</span>
        ),
      );
    } else if (m[5]) {
      const href = m[7]!;
      out.push(
        /^https?:\/\//i.test(href) ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline underline-offset-2">{m[6]}</a>
        ) : (
          <span key={k} className="underline decoration-dotted">{m[6]}</span>
        ),
      );
    } else if (m[8]) out.push(<strong key={k}>{inline(m[9]!, links, k)}</strong>);
    else if (m[10]) out.push(<em key={k}>{inline((m[11] ?? m[12])!, links, k)}</em>);
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  // Bare web addresses become links too.
  return out.flatMap((part, i): React.ReactNode[] =>
    typeof part !== "string"
      ? [part]
      : part.split(/(https?:\/\/[^\s)]+)/g).map((piece, j) =>
          /^https?:\/\//.test(piece) ? (
            <a key={`${key}-u${i}-${j}`} href={piece} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline underline-offset-2 break-all">{piece}</a>
          ) : (
            piece
          ),
        ),
  );
};

/** Renders a note body (without its header) as React elements. */
export const MarkdownView = ({ source, links }: { source: string; links: WikiLinkResolver | null }) => {
  const lines = source.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const key = `b${k++}`;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) code.push(lines[i++]!);
      i++;
      blocks.push(<pre key={key} className="my-3 overflow-x-auto rounded-md border border-border bg-black/40 p-3 font-mono text-xs"><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1]!.length;
      const cls = level === 1 ? "text-2xl font-semibold mt-2 mb-3" : level === 2 ? "text-lg font-semibold mt-6 mb-2 border-b border-border/60 pb-1" : "text-base font-semibold mt-4 mb-1";
      const Tag = `h${Math.min(level + 1, 6)}` as "h2";
      blocks.push(<Tag key={key} className={cls}>{inline(heading[2]!, links, key)}</Tag>);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key} className="my-4 border-border" />);
      i++;
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) quote.push(lines[i++]!);
      const callout = quote[0]!.match(CALLOUT);
      if (callout) {
        const rest = [callout[2]!, ...quote.slice(1).map((q) => q.replace(/^>\s?/, ""))].join(" ").trim();
        blocks.push(
          <div key={key} className={`my-3 rounded-md border-l-2 px-3 py-2 text-sm ${STATUS_STYLE[callout[1]!]}`}>
            <span className="mr-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">{callout[1]}</span>
            {inline(rest, links, key)}
          </div>,
        );
      } else {
        blocks.push(<blockquote key={key} className="my-3 border-l-2 border-border pl-3 text-muted-foreground">{inline(quote.map((q) => q.replace(/^>\s?/, "")).join(" "), links, key)}</blockquote>);
      }
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={key} className={`my-2 space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((it, j) => <li key={j}>{inline(it, links, `${key}-${j}`)}</li>)}
        </ListTag>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,6}\s|>|```|\s*([-*]|\d+\.)\s+)/.test(lines[i]!)) para.push(lines[i++]!);
    blocks.push(<p key={key} className="my-2 leading-relaxed">{inline(para.join(" "), links, key)}</p>);
  }
  return <div className="text-sm text-foreground/90">{blocks}</div>;
};
