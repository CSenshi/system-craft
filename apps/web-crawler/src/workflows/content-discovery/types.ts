import { z } from 'zod';

export const ZodQueueJobSchema = z.object({
  url: z.string(),
  depth: z.number().int().min(0).max(15).default(0),
});

export type JobType = z.infer<typeof ZodQueueJobSchema>;
