import { z } from 'zod';

export const ZodQueueJobSchema = z.object({
  contentName: z.string(),
  aux: z.object({
    depth: z.number().int(),
    crawlId: z.string(),
  }),
});

export type JobType = z.infer<typeof ZodQueueJobSchema>;
