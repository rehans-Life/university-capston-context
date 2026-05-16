import { z } from 'zod';

import { getDeliveriesQuerySchema, createObjectResponseSchema } from '@libs/schemas';

export const eventRequestSchema = z.object({
  queryStringParameters: getDeliveriesQuerySchema,
});

const deliveryItemSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    paymentMethod: z.string(),
    deliveryAddress: z.record(z.string(), z.unknown()),
    name: z.string(),
    phoneNumber: z.string(),
    day: z.string(),
    time: z.string().optional(),
    status: z.string(),
    pendingAmount: z.number(),
    deliveryStatus: z.string().optional(),
    priority: z.number().optional(),
    currency: z.string(),
    eta: z.record(z.string(), z.unknown()).optional(),
    deliveredAt: z.string().optional(),
    groupBufferTime: z.number().optional(),
    shortId: z.string(),
    brand: z.string(),
    withCoolerBag: z.boolean().optional(),
    shouldReturnBag: z.boolean().optional(),
    unreturnedCoolerBags: z.number().optional(),
    coolerBagsReturned: z.number().optional(),
  })
  .passthrough();

export const getListResponseBodySchema = z.object({
  data: z.array(deliveryItemSchema),
});

export const eventResponseSchema = createObjectResponseSchema(getListResponseBodySchema);
