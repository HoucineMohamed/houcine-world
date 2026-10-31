import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ZoomIn, ZoomOut, Maximize2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BRAND_LABELS, TYPE_LABELS } from "@/lib/knowledge/note";
import { useStudio } from "./StudioContext";
import { BRAND_COLORS, BrandDot, noteStatus, Pill } from "./ui";

// The knowledge graph, in the spirit of Obsidian's graph view: one node per note, one line per real [[link]] between
// notes (nothing invented), coloured by brand, people drawn as squares. Zoom with the wheel or the buttons, drag the
// background to pan, click a node to highlight its neighbours, double-click (or "Open") to edit it. The layout is a
// small force simulation run a few steps per frame, so a large brain never freezes the page; filters keep it legible.

interface Node {
  id: string;
  path: string;
  title: string;
  brand: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const W = 1000;
const H = 700;

const Graph = () => {
  const { state } = useStudio();
  const navigate = useNavigate();
  const [brand, setBrand] = useState("");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [, setTick] = useState(0);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const notes = useMemo(
    () => (state?.notes ?? []).filter((n) => !n.archived && n.id && n.type !== "index" && n.type !== "source").filter((n) => !brand || n.brand === brand).filter((n) => !type || n.type === type),
    [state?.notes, brand, type],
  );
  const ids = useMemo(() => new Set(notes.map((n) => n.id!)), [notes]);
  const edges = useMemo(() => notes.flatMap((n) => n.links.filter((l) => ids.has(l)).map((l) => [n.id!, l] as const)), [notes, ids]);

  // Positions persist across filter changes: a node keeps its place when it reappears.
  const positions = useRef(new Map<string, Node>());
  const nodes = useMemo(() => {
    const brands = Object.keys(BRAND_LABELS);
    return notes.map((n, i) => {
      const prev = positions.current.get(n.id!);
      if (prev) return Object.assign(prev, { title: n.title ?? n.path, brand: n.brand ?? "", type: n.type ?? "", path: n.path });
      const b = Math.max(0, brands.indexOf(n.brand ?? ""));
      const angle = (2 * Math.PI * b) / brands.length + (i % 7) * 0.12;
      const r = 180 + (i % 5) * 18;
      const node: Node = { id: n.id!, path: n.path, title: n.title ?? n.path, brand: n.brand ?? "", type: n.type ?? "", x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r, vx: 0, vy: 0 };
      positions.current.set(n.id!, node);
      return node;
    });
  }, [notes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // The simulation: repulsion between nodes, springs on links, a gentle pull of each brand towards its own area.
  useEffect(() => {
    let frame = 0;
    let steps = 0;
    const brands = Object.keys(BRAND_LABELS);
    const centre = (b: string) => {
      const i = Math.max(0, brands.indexOf(b));
      const a = (2 * Math.PI * i) / brands.length;
      return { x: W / 2 + Math.cos(a) * 230, y: H / 2 + Math.sin(a) * 170 };
    };
    const run = () => {
      const alpha = Math.max(0.02, 1 - steps / 260);
      for (let s = 0; s < 6; s++) {
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i]!;
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j]!;
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
            if (d2 > 90000) continue;
            const f = (420 / d2) * alpha;
            a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
          }
        }
        for (const [from, to] of edges) {
          const a = byId.get(from);
          const b = byId.get(to);
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = ((d - 70) / d) * 0.03 * alpha;
          a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
        }
        for (const n of nodes) {
          const c = centre(n.brand);
          // Each brand gathers in its own area, and everything is kept near the middle.
          n.vx += (c.x - n.x) * 0.012 * alpha + (W / 2 - n.x) * 0.002 * alpha;
          n.vy += (c.y - n.y) * 0.012 * alpha + (H / 2 - n.y) * 0.002 * alpha;
          n.x += (n.vx *= 0.6);
          n.y += (n.vy *= 0.6);
        }
        steps++;
      }
      setTick((t) => t + 1);
      if (steps < 300) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [nodes, edges, byId]);

  const neighbours = useMemo(() => {
    if (!selected) return null;
    const set = new Set([selected]);
    for (const [a, b] of edges) {
      if (a === selected) set.add(b);
      if (b === selected) set.add(a);
    }
    return set;
  }, [selected, edges]);
  const lower = query.trim().toLowerCase();
  const matches = useMemo(() => (lower ? new Set(nodes.filter((n) => n.title.toLowerCase().includes(lower)).map((n) => n.id)) : null), [nodes, lower]);

  const zoom = (factor: number) => setView((v) => ({ ...v, k: Math.min(4, Math.max(0.3, v.k * factor)) }));
  // Wheel zoom without scrolling the page (a passive React listener cannot prevent it).
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => ({ ...v, k: Math.min(4, Math.max(0.3, v.k * (e.deltaY < 0 ? 1.1 : 0.9))) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const open = (path: string) => navigate(`/workspace/knowledge/notes?path=${encodeURIComponent(path)}`);
  const selectedNote = selected ? (state?.notes ?? []).find((n) => n.id === selected) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="relative overflow-hidden rounded-lg border border-border bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04),transparent_70%)]">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a note…" aria-label="Find a note in the graph" className="h-8 w-44 bg-background/80 pl-7 text-xs" />
          </div>
          <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand" className="h-8 rounded-md border border-input bg-background/80 px-2 text-xs">
            <option value="">All brands</option>
            {Object.entries(BRAND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by category" className="h-8 rounded-md border border-input bg-background/80 px-2 text-xs">
            <option value="">All categories</option>
            {Object.entries(TYPE_LABELS).filter(([v]) => !["index", "source"].includes(v)).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="absolute right-3 top-3 z-10 flex gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8 bg-background/80" onClick={() => zoom(1.25)} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8 bg-background/80" onClick={() => zoom(0.8)} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8 bg-background/80" onClick={() => setView({ x: 0, y: 0, k: 1 })} aria-label="Reset the view"><Maximize2 className="h-4 w-4" /></Button>
        </div>
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="h-[66vh] min-h-[420px] w-full cursor-grab touch-none select-none active:cursor-grabbing"
          role="img"
          aria-label={`Knowledge graph: ${nodes.length} notes, ${edges.length} links`}
          onPointerDown={(e) => {
            if ((e.target as Element).tagName === "svg" || (e.target as Element).getAttribute("data-bg")) {
              drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
              (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
            }
          }}
          onPointerMove={(e) => {
            if (!drag.current || !svg.current) return;
            const scale = W / svg.current.getBoundingClientRect().width;
            setView((v) => ({ ...v, x: drag.current!.vx + (e.clientX - drag.current!.x) * scale, y: drag.current!.vy + (e.clientY - drag.current!.y) * scale }));
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <rect data-bg="1" x={0} y={0} width={W} height={H} fill="transparent" onClick={() => setSelected(null)} />
          <g transform={`translate(${view.x + (W / 2) * (1 - view.k)} ${view.y + (H / 2) * (1 - view.k)}) scale(${view.k})`}>
            {edges.map(([a, b]) => {
              const s = byId.get(a);
              const t = byId.get(b);
              if (!s || !t) return null;
              const lit = neighbours ? neighbours.has(a) && neighbours.has(b) && (a === selected || b === selected) : false;
              return <line key={`${a}>${b}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y} className={lit ? "stroke-accent" : undefined} stroke={lit ? undefined : "rgba(255,255,255,0.12)"} strokeWidth={lit ? 1.6 : 0.8} />;
            })}
            {nodes.map((n) => {
              const dim = (neighbours && !neighbours.has(n.id)) || (matches && !matches.has(n.id));
              const r = n.type === "overview" ? 7 : 5;
              const colour = BRAND_COLORS[n.brand] ?? "#a1a1aa";
              const showLabel = view.k > 1.3 || n.id === selected || (neighbours?.has(n.id) ?? false) || (matches?.has(n.id) ?? false) || n.type === "overview";
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x} ${n.y})`}
                  opacity={dim ? 0.18 : 1}
                  tabIndex={0}
                  role="button"
                  aria-label={`${n.title} (${BRAND_LABELS[n.brand] ?? n.brand})`}
                  className="cursor-pointer focus:outline-none [&:focus>*:first-child]:stroke-white"
                  onClick={(e) => { e.stopPropagation(); setSelected(n.id === selected ? null : n.id); }}
                  onDoubleClick={() => open(n.path)}
                  onKeyDown={(e) => { if (e.key === "Enter") open(n.path); if (e.key === " ") { e.preventDefault(); setSelected(n.id); } }}
                >
                  {n.type === "person" ? (
                    <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={1.5} fill={colour} stroke="rgba(0,0,0,0.6)" strokeWidth={1} />
                  ) : n.type === "agent" ? (
                    <rect x={-r} y={-r} width={r * 2} height={r * 2} transform="rotate(45)" fill="none" stroke={colour} strokeWidth={1.5} />
                  ) : (
                    <circle r={r} fill={colour} stroke={n.id === selected ? "#fff" : "rgba(0,0,0,0.6)"} strokeWidth={n.id === selected ? 2 : 1} />
                  )}
                  {showLabel && <text x={r + 4} y={4} fontSize={11 / Math.max(1, view.k * 0.8)} fill="rgba(255,255,255,0.85)" className="pointer-events-none">{n.title}</text>}
                </g>
              );
            })}
          </g>
        </svg>
        <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-[0.7rem] text-muted-foreground">
          {Object.entries(BRAND_LABELS).map(([b, l]) => <span key={b} className="flex items-center gap-1"><BrandDot brand={b} /> {l}</span>)}
          <span>■ person · ◇ AI access · larger dot: overview</span>
        </div>
      </div>

      <aside className="space-y-3 text-sm">
        <div className="rounded-lg border border-border bg-card/30 p-3">
          <p className="text-xs text-muted-foreground">{nodes.length} notes · {edges.length} links (real [[links]] only)</p>
        </div>
        {selectedNote ? (
          <div className="space-y-2 rounded-lg border border-border bg-card/30 p-3">
            <p className="flex items-center gap-2 font-semibold"><BrandDot brand={selectedNote.brand} /> {selectedNote.title}</p>
            <div className="flex flex-wrap gap-1.5"><Pill tone={noteStatus(selectedNote).tone}>{noteStatus(selectedNote).label}</Pill><Pill tone="neutral">{TYPE_LABELS[selectedNote.type ?? ""] ?? selectedNote.type}</Pill></div>
            <p className="text-xs text-muted-foreground">{neighbours ? neighbours.size - 1 : 0} connected note(s)</p>
            <ul className="space-y-0.5">
              {[...(neighbours ?? [])].filter((id) => id !== selected).map((id) => {
                const n = byId.get(id);
                return n ? <li key={id}><button type="button" onClick={() => setSelected(id)} className="text-xs text-accent hover:underline">{n.title}</button></li> : null;
              })}
            </ul>
            <Button size="sm" className="w-full gap-1.5" onClick={() => open(selectedNote.path)}><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open the note</Button>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Click a node to see its connections; double-click to open it. Keyboard: Tab to a node, Space to select, Enter to open.</p>
        )}
      </aside>
    </div>
  );
};

export default Graph;
