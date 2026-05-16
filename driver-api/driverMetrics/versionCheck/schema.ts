import { z } from 'zod';

import { versionPathParamSchema, createObjectResponseSchema } from '@libs/schemas';

export const eventRequestSchema = z.object({
  pathParameters: versionPathParamSchema,
});

export const versionCheckResponseBodySchema = z.object({
  isSupported: z.boolean(),
  apk: z.string(),
});

export const eventResponseSchema = createObjectResponseSchema(versionCheckResponseBodySchema);
