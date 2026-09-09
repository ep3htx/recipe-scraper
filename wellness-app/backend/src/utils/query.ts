import { z } from "zod";

// Shared query-string schema for "give me records between these dates,
// capped at N" — used by nearly every log/history endpoint.
export const dateRangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(2000).default(365),
});

export type DateRangeQuery = z.infer<typeof dateRangeQuery>;

export function dateRangeWhere(field: string, q: DateRangeQuery) {
  if (!q.from && !q.to) return {};
  const range: Record<string, Date> = {};
  if (q.from) range.gte = q.from;
  if (q.to) range.lte = q.to;
  return { [field]: range };
}
