import { z } from 'zod';

/** Zod schema that validates the `q` search query parameter (1–100 chars). */
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
});

/** Inferred TypeScript type for a validated search query. */
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
