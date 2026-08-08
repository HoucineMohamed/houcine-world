import React, { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  value?: (row: T) => string | number | null;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  rowKey: (row: T) => string;
}

/** Reusable workspace data table (sortable). Presentation only. */
export function DataTable<T>({ columns, rows, empty = "Nothing here yet.", rowKey }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return rows;
    return [...rows].sort((a, b) => {
      const av = col.value!(a) ?? "";
      const bv = col.value!(b) ?? "";
      return av === bv ? 0 : (av > bv ? 1 : -1) * sort.dir;
    });
  }, [rows, sort, columns]);

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                {c.sortable ? (
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() =>
                      setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))
                    }
                  >
                    {c.header} <ArrowUpDown className="w-3 h-3" />
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)} className="border-t border-border hover:bg-muted/20">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 align-middle text-foreground">
                  {c.render ? c.render(row) : String(c.value?.(row) ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
