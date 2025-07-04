import { z } from 'zod';

export const ZodQueueJobSchema = z.object({
  url: z.string(),
  depth: z.number().int().min(0).max(15).default(0),
  _aux: z
    .object({
      crawlId: z.string(),
    })
    .optional(),
});

export type JobType = z.infer<typeof ZodQueueJobSchema>;

export const queueName = process.env[
  'AWS_SQS_CONTENT_DISCOVERY_QUEUE_NAME'
] as unknown as string;
