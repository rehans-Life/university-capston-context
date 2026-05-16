import { z } from 'zod';

import {
  idPathParamSchema,
  createObjectResponseSchema,
  dDeliveryStatusSchema,
  updateDeliveryBodySchema,
} from '@libs/schemas';

export const eventRequestSchema = z.object({
  pathParameters: idPathParamSchema,
  body: updateDeliveryBodySchema,
});

export const updateDeliveryResponseBodySchema = z.object({
  id: z.string(),
  deliveryStatus: dDeliveryStatusSchema.optional(),
  deliveredAt: z.string().optional(),
  coolerBagsReturned: z.number().optional(),
});

export const eventResponseSchema = createObjectResponseSchema(updateDeliveryResponseBodySchema);
