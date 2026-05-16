import { z } from 'zod';

import { idPathParamSchema, nullBodyResponseSchema } from '@libs/schemas';

export const eventRequestSchema = z.object({
  pathParameters: idPathParamSchema,
});

export const eventResponseSchema = nullBodyResponseSchema;
