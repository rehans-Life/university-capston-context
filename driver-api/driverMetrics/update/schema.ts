import { z } from 'zod';

import { idPathParamSchema, createObjectResponseSchema, updateDriverMetricsBodySchema } from '@libs/schemas';

export const eventRequestSchema = z.object({
  pathParameters: idPathParamSchema,
  body: updateDriverMetricsBodySchema,
});

export const eventResponseSchema = createObjectResponseSchema(z.record(z.string(), z.unknown()));
