import middleware from 'libs/middleware';
import GenerateTimeWindowRouteUseCase from './useCase';
import { RoutePlanRepository } from '../../../libs/repositories';
import { DeliveryRepository } from 'libs/repositories/ES';
import { withSecrets } from 'libs/middlewares';
import { logger } from '@teamcalo/core';

interface PathParameters {
  id: string;
}

export const handler = middleware<null, null, PathParameters>(async (event) => {
  let { id } = event.pathParameters;
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

  const {
    windowType,
    windowSize,
    startTime,
    endTime,
    avgDeliveryTime,
    shiftStartTime,
    shiftEndTime,
    travelDurationMultiple,
    dispatchLocation,
    endAtKitchen,
    firstSubslotEndTime,
    lookbackDays,
    isDeliveryEndTimeNextDay,
    isShiftEndTimeNextDay,
    isSubslotTimeNextDay,
    costModel
  } = body;
  if (!id) {
    id = body.id;
  }
  const deliveryStartTime = startTime;
  const deliveryEndTime = endTime;
  logger.info(
    '🚀 ~ handler ~ id, windowType, windowSize, deliveryStartTime, deliveryEndTime, avgDeliveryTime, shiftStartTime, shiftEndTime, travelDurationMultiple, dispatchLocation:',
    id,
    windowType,
    windowSize,
    deliveryStartTime,
    deliveryEndTime,
    avgDeliveryTime,
    shiftStartTime,
    shiftEndTime,
    travelDurationMultiple,
    dispatchLocation,
    endAtKitchen,
    firstSubslotEndTime,
    lookbackDays,
    isDeliveryEndTimeNextDay,
    isShiftEndTimeNextDay,
    isSubslotTimeNextDay,
    costModel
  );
  const generateTimeWindowRouteUseCase = new GenerateTimeWindowRouteUseCase(
    new RoutePlanRepository(),
    new DeliveryRepository()
  );
  const response = await generateTimeWindowRouteUseCase.exec(
    id,
    windowType,
    windowSize,
    deliveryStartTime,
    deliveryEndTime,
    avgDeliveryTime,
    isDeliveryEndTimeNextDay,
    isShiftEndTimeNextDay,
    isSubslotTimeNextDay,
    shiftStartTime,
    shiftEndTime,
    travelDurationMultiple,
    dispatchLocation,
    endAtKitchen,
    firstSubslotEndTime,
    lookbackDays,
    costModel
  );
  logger.info('🚀 ~ handler ~ response:', JSON.stringify(response, null, 2));
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}).use(withSecrets(process.env.OS_SECRET_ARN));
