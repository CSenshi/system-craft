import { z } from 'zod';

export const ZodQueueJobSchema = z.object({
  url: z.string(),
});

export type JobType = z.infer<typeof ZodQueueJobSchema>;
