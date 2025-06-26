import { z } from 'zod';

export const ZodQueueJobSchema = z.object({
  contentName: z.string(),
});

export type JobType = z.infer<typeof ZodQueueJobSchema>;
