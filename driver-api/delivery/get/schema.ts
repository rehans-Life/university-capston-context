import { z } from 'zod';

import { idPathParamSchema, createObjectResponseSchema } from '@libs/schemas';

export const eventRequestSchema = z.object({
  pathParameters: idPathParamSchema,
});

const deliverySchema = z.looseObject({
  id: z.string(),
  userId: z.string(),
  paymentMethod: z.string(),
  deliveryAddress: z.record(z.string(), z.unknown()),
  name: z.string(),
  phoneNumber: z.string(),
  day: z.string(),
  time: z.string().optional(),
  status: z.string(),
  pendingAmount: z.number().nullish(),
  deliveryStatus: z.string().optional(),
  priority: z.number().optional(),
  currency: z.string(),
  eta: z.record(z.string(), z.unknown()).optional(),
  deliveredAt: z.string().optional(),
  groupBufferTime: z.number().optional(),
  shortId: z.string(),
  brand: z.string(),
  withCoolerBag: z.boolean().optional(),
  unreturnedCoolerBags: z.number().optional(),
  coolerBagsReturned: z.number().optional(),
});

export const eventResponseSchema = createObjectResponseSchema(deliverySchema);
