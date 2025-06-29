import { z } from 'zod';

export const ZodQueueJobSchema = z.object({
  contentName: z.string(),
  aux: z.object({
    depth: z.number().int(),
    crawlId: z.string(),
  }),
});

export type JobType = z.infer<typeof ZodQueueJobSchema>;

export const queueName = process.env[
  'AWS_SQS_CONTENT_PROCESSING_QUEUE_NAME'
] as unknown as string;
