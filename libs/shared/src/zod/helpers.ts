import { z } from 'zod';

export const ZodStringToJSONSchema = z
  .string()
  .transform((str, ctx): z.infer<ReturnType<JSON['parse']>> => {
    try {
      return JSON.parse(str);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
      return z.NEVER;
    }
  });
