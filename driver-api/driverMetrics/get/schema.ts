import { DeliveryTime } from '@calo-backend/enums';
import { z } from 'zod';

import { createObjectResponseSchema } from '@libs/schemas';

const driverMetricsTimePathParamSchema = z.object({
  time: z.enum(DeliveryTime, { message: 'time is required' }),
});

export const eventRequestSchema = z.object({
  pathParameters: driverMetricsTimePathParamSchema,
});

const positionSchema = z.looseObject({
  lat: z.number(),
  lng: z.number(),
  id: z.string().optional(),
});

const routeItemActionSchema = z.looseObject({
  createdAt: z.string(),
  type: z.string(),
  note: z.string().optional(),
  newLocation: z.string().optional(),
});

const routeItemSchema = z.looseObject({
  id: z.string().nullish(),
  priority: z.number().nullish(),
  isMatched: z.boolean().nullish(),
  origin: positionSchema.nullish(),
  travelTime: z.number().nullish(),
  groupBufferTime: z.number().optional(),
  deliveredAtLocation: positionSchema.optional(),
  toBeDeliveredAt: z.string().optional().nullish(),
  reasonForNotFollowPriority: z.string().optional(),
  actions: z.array(routeItemActionSchema).optional().default([]),
});

const driverActionSchema = z.looseObject({
  type: z.string(),
  time: z.string(),
  distance: z.number().optional(),
  vanData: z
    .object({
      temp: z.string().optional(),
      bags: z.string().optional(),
    })
    .optional(),
  autoGenerateRoute: z.boolean().optional(),
});

const driverMetricsResponseSchema = z.looseObject({
  id: z.string(),
  day: z.string(),
  time: z.enum(DeliveryTime),
  totalDeliveries: z.number().optional(),
  deliveredDeliveries: z.number().optional(),
  canStartShift: z.boolean(),
  driverActions: z.array(driverActionSchema).optional().default([]),
  kitchenPosition: positionSchema,
  startingPosition: positionSchema.optional(),
  startShiftTime: z.string(),
  routePlan: z.record(z.string(), routeItemSchema),
  driver: z.object({
    driverName: z.string(),
    id: z.string(),
    phoneNumber: z.string(),
    email: z.string(),
  }),
  allowPhotographicNotes: z.boolean(),
});

export const eventResponseSchema = createObjectResponseSchema(driverMetricsResponseSchema.nullish());
