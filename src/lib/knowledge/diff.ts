// Line-by-line comparison of two versions of a note (Knowledge Studio's "Compare"), using the longest common
// subsequence. Notes are small (a few hundred lines at most), so the quadratic table is fine; above a size limit the
// comparison falls back to "everything removed, everything added" rather than freezing the page.

export type DiffLine = { kind: "same" | "added" | "removed"; text: string };

const LIMIT = 4_000_000; // cells of the table

export const diffLines = (before: string, after: string): DiffLine[] => {
  const a = before.replace(/\r\n/g, "\n").split("\n");
  const b = after.replace(/\r\n/g, "\n").split("\n");
  if (a.length * b.length > LIMIT) return [...a.map((text) => ({ kind: "removed" as const, text })), ...b.map((text) => ({ kind: "added" as const, text }))];
  const table: Uint32Array[] = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i]! });
      i++;
      j++;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) out.push({ kind: "removed", text: a[i++]! });
    else out.push({ kind: "added", text: b[j++]! });
  }
  while (i < a.length) out.push({ kind: "removed", text: a[i++]! });
  while (j < b.length) out.push({ kind: "added", text: b[j++]! });
  return out;
};

export const diffStats = (lines: DiffLine[]) => ({
  added: lines.filter((l) => l.kind === "added").length,
  removed: lines.filter((l) => l.kind === "removed").length,
});
