import { z } from 'zod';

import { idPathParamSchema, nullBodyResponseSchema, handleActionsBodySchema } from '@libs/schemas';

export const eventRequestSchema = z.object({
  pathParameters: idPathParamSchema,
  body: handleActionsBodySchema,
});

export const eventResponseSchema = nullBodyResponseSchema;
