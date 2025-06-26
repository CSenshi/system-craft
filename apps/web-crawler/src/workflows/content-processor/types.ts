import { z } from 'zod';

export const ZodQueueJobSchema = z.object({
  contentName: z.string(),
  aux: z.object({
    depth: z.number().int()
  }),
});

export type JobType = z.infer<typeof ZodQueueJobSchema>;
