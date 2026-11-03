// Loads the records the Command Center engine needs, with a Supabase client that acts AS THE SIGNED-IN USER: the
// database's row-level security decides what comes back (a brand id the user may not read returns nothing). Shared by
// the Workspace (browser) and the command-analyst function, so both read exactly the same records.
import type { Dataset } from "./metrics.ts";

/** At most this many rows are read per table and scope; the result names the tables that were cut. */
export const ROW_LIMIT = 5000;
const NO_BRAND = "00000000-0000-0000-0000-000000000000";

export const COLUMNS = {
  leads: "id, brand_id, contact_id, stage, expected_value, currency, source, created_at, won_at, lost_at, converted_project_id, deleted_at",
  lead_events: "lead_id, brand_id, from_stage, to_stage, created_at",
  contact_brands: "contact_id, brand_id, status, source, became_client_at, created_at",
  projects: "id, brand_id, client_contact_id, name, status, priority, start_date, deadline, currency, budget, estimated_cost, contract_value, contract_signed_on, completed_at, created_at, deleted_at",
  tasks: "id, project_id, brand_id, milestone_id, kind, status, due_date, completed_at, created_at",
  milestones: "id, project_id, brand_id, due_date, completed_at",
  invoices: "id, brand_id, contact_id, project_id, issue_date, due_date, amount, currency, status",
  payments: "id, brand_id, invoice_id, contact_id, project_id, amount, currency, received_on",
  expenses: "id, brand_id, project_id, amount, currency, incurred_on, category, status",
} as const;

export interface LoadScope {
  /** null = every brand the user may see. */
  brandIds: string[] | null;
  /** Read finance only when the user may (super admin, or brand_admin of every brand in scope); otherwise null. */
  financeVisible: boolean;
}

// The few query-builder methods used, so any Supabase client (browser or Deno) fits.
interface Query extends PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> {
  limit(n: number): Query;
  in(column: string, values: string[]): Query;
}
export interface ReadClient { from(table: string): { select(columns: string): Query } }

export const loadDataset = async (client: ReadClient, scope: LoadScope): Promise<{ dataset: Dataset; truncated: string[] }> => {
  const truncated: string[] = [];
  const read = async <T>(table: keyof typeof COLUMNS): Promise<T[]> => {
    let q = client.from(table).select(COLUMNS[table]).limit(ROW_LIMIT);
    if (scope.brandIds) q = q.in("brand_id", scope.brandIds.length ? scope.brandIds : [NO_BRAND]);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if ((data?.length ?? 0) >= ROW_LIMIT) truncated.push(table);
    return (data ?? []) as T[];
  };
  const [leads, leadEvents, contactBrands, projects, tasks, milestones] = await Promise.all([
    read<Dataset["leads"][number]>("leads"), read<Dataset["leadEvents"][number]>("lead_events"),
    read<Dataset["contactBrands"][number]>("contact_brands"), read<Dataset["projects"][number]>("projects"),
    read<Dataset["tasks"][number]>("tasks"), read<Dataset["milestones"][number]>("milestones"),
  ]);
  const [invoices, payments, expenses] = scope.financeVisible
    ? await Promise.all([read<NonNullable<Dataset["invoices"]>[number]>("invoices"), read<NonNullable<Dataset["payments"]>[number]>("payments"), read<NonNullable<Dataset["expenses"]>[number]>("expenses")])
    : [null, null, null];
  return { dataset: { leads, leadEvents, contactBrands, projects, tasks, milestones, invoices, payments, expenses }, truncated };
};
