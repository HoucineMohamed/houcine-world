import type { Booking } from "@/services/bookings";

export type Bucket = "daily" | "weekly" | "monthly";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const bucketKey = (iso: string, bucket: Bucket) => {
  const d = new Date(iso);
  if (bucket === "monthly") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (bucket === "weekly") {
    const s = startOfDay(d);
    s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // ISO week start (Mon)
    return s.toISOString().slice(0, 10);
  }
  return startOfDay(d).toISOString().slice(0, 10);
};

export const bucketLabel = (key: string, bucket: Bucket) => {
  if (bucket === "monthly") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  const d = new Date(key);
  const base = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return bucket === "weekly" ? `w/c ${base}` : base;
};

/** Continuous series so gaps render as zeros instead of collapsing the chart. */
export const timeSeries = (bookings: Booking[], bucket: Bucket, periods: number) => {
  const now = new Date();
  const keys: string[] = [];
  for (let i = periods - 1; i >= 0; i--) {
    const d = new Date(now);
    if (bucket === "monthly") d.setMonth(d.getMonth() - i);
    else if (bucket === "weekly") d.setDate(d.getDate() - i * 7);
    else d.setDate(d.getDate() - i);
    const k = bucketKey(d.toISOString(), bucket);
    if (!keys.includes(k)) keys.push(k);
  }
  const counts: Record<string, number> = {};
  bookings.forEach((b) => {
    const k = bucketKey(b.created_at, bucket);
    counts[k] = (counts[k] || 0) + 1;
  });
  return keys.map((k) => ({ key: k, label: bucketLabel(k, bucket), bookings: counts[k] || 0 }));
};

export const countBy = <T,>(rows: T[], pick: (row: T) => string) => {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const k = pick(r) || "unknown";
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
};

export const summarize = (bookings: Booking[]) => {
  const now = Date.now();
  const week = now - 7 * 864e5;
  const month = now - 30 * 864e5;
  const since = (t: number) => bookings.filter((b) => new Date(b.created_at).getTime() >= t).length;
  const byStatus = (s: string) => bookings.filter((b) => b.status === s).length;
  const clients = new Set(
    bookings.map((b) => (b.client_email || b.client_name || "").trim().toLowerCase()).filter(Boolean),
  );
  const activeClients = new Set(
    bookings
      .filter((b) => new Date(b.created_at).getTime() >= month)
      .map((b) => (b.client_email || b.client_name || "").trim().toLowerCase())
      .filter(Boolean),
  );
  return {
    total: bookings.length,
    thisWeek: since(week),
    thisMonth: since(month),
    clients: clients.size,
    activeClients: activeClients.size,
    pending: byStatus("pending"),
    confirmed: byStatus("confirmed"),
    completed: byStatus("completed"),
    cancelled: byStatus("cancelled"),
  };
};
