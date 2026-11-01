// A small text-only PDF writer for Command Center reports (no dependency): A4 pages, Helvetica, one line per row.
// Characters are written in WinAnsi encoding (the euro sign included); anything outside it becomes "?".
// Pure: lines in, bytes out.

const WIN_ANSI_EXTRA: Record<string, number> = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "™": 0x99 };

const encode = (text: string): string => {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    const b = WIN_ANSI_EXTRA[ch] ?? (code >= 0x20 && code <= 0x7e ? code : code >= 0xa0 && code <= 0xff ? code : 0x3f);
    const c = String.fromCharCode(b);
    out += c === "(" || c === ")" || c === "\\" ? `\\${c}` : b > 0x7e ? `\\${b.toString(8).padStart(3, "0")}` : c;
  }
  return out;
};

export interface PdfLine { text: string; size?: number; bold?: boolean; gap?: number }

/** A PDF document of these lines, paginated on A4 portrait. Long lines are cut to fit (the CSV keeps everything). */
export const renderPdf = (lines: PdfLine[]): Uint8Array<ArrayBuffer> => {
  const W = 595, H = 842, M = 48;
  const pages: string[][] = [[]];
  let y = H - M;
  for (const l of lines) {
    const size = l.size ?? 9;
    const step = size * 1.45 + (l.gap ?? 0);
    if (y - step < M) { pages.push([]); y = H - M; }
    y -= step;
    const max = Math.floor((W - 2 * M) / (size * 0.5));
    const text = l.text.length > max ? `${l.text.slice(0, max - 1)}…` : l.text;
    pages[pages.length - 1]!.push(`BT /${l.bold ? "F2" : "F1"} ${size} Tf ${M} ${y.toFixed(1)} Td (${encode(text)}) Tj ET`);
  }
  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const catalog = add("");
  const pagesId = add("");
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids: number[] = [];
  pages.forEach((content, i) => {
    const stream = `${content.join("\n")}\nBT /F1 8 Tf ${W - M - 40} 24 Td (${i + 1} / ${pages.length}) Tj ET`;
    const s = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${s} 0 R >>`));
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // Every character above is one byte (Latin-1 range), so offsets are byte offsets.
  return Uint8Array.from(out, (c) => c.charCodeAt(0));
};

/** CSV with quoting, ready for spreadsheets (UTF-8 with a byte-order mark so accents open correctly). */
export const toCsv = (columns: string[], rows: string[][]): string => {
  const q = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return `\uFEFF${[columns, ...rows].map((r) => r.map((v) => q(v ?? "")).join(",")).join("\r\n")}\r\n`;
};
