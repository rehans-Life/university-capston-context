import { MapRepository } from 'libs/repositories/DDB';
import { RoutingConfigRepository } from '../../../libs/repositories';
import { RoutePlanRepository } from 'libs/repositories/ES';
import { RoutingConfigEntity } from 'libs/entities/DDB/RoutingConfigEntity';
import { RoutePlanEntity } from 'libs/entities/ES';
import { Lambda } from 'aws-sdk';
import { logger } from '@teamcalo/core';
import { getRoutePlansForConfig } from './helper';
import { NotFound } from 'http-errors';

class RunRoutingConfigUseCase {
  constructor(
    private readonly routingConfigRepository: RoutingConfigRepository,
    private readonly routePlanRepository: RoutePlanRepository,
    private readonly mapRepository: MapRepository
  ) {}

  async exec(id: string, day: string) {
    const config = await this.routingConfigRepository.findById(id);
    if (!config) {
      throw new NotFound(`Routing Config with id ${id} not found`);
    }

    const routePlans = await getRoutePlansForConfig(config, day, this.mapRepository, this.routePlanRepository);

    if (routePlans.length === 0) {
      return {
        message: 'No route plans found for the given configuration and day.',
        results: []
      };
    }

    // for each route plan, call the generateTimeWindowRoutePlan function in promise.all api calls
    const settledResults = await Promise.allSettled(
      routePlans.map(async (routePlan) => {
        logger.info(
          `Generating time window route plan for Route Plan ID: ${routePlan.id} with Routing Config ID: ${config.id}`
        );
        const response = await this.generateTimeWindowRoutePlan(routePlan, config);
        return {
          routePlanId: routePlan.id,
          fileName: response?.fileName ?? null
        };
      })
    );

    const results = settledResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.error(
          `Failed to generate time window route plan for Route Plan ID: ${routePlans[index].id}`,
          result.reason
        );
        return {
          routePlanId: routePlans[index].id,
          fileName: null,
          error: result.reason?.message || 'Unknown error occurred'
        };
      }
    });

    const successCount = settledResults.filter((r) => r.status === 'fulfilled').length;
    const failureCount = settledResults.filter((r) => r.status === 'rejected').length;

    return {
      message: `Generated time window route plans: ${successCount} succeeded, ${failureCount} failed out of ${routePlans.length} total.`,
      results
    };
  }

  private async generateTimeWindowRoutePlan(
    routePlan: RoutePlanEntity,
    config: RoutingConfigEntity
  ): Promise<{ fileName: string | null } | null> {
    const lambda = new Lambda();

    // Invoke worker Lambda synchronously
    const params: Lambda.InvocationRequest = {
      FunctionName: process.env.WORKER_FUNCTION_NAME!,
      InvocationType: 'RequestResponse', // Synchronous invocation
      Payload: JSON.stringify({
        body: {
          id: routePlan.id,
          windowType: config.windowType,
          windowSize: config.windowSize,
          lookbackDays: config.lookbackDays,
          startTime: config.deliveryStartTime,
          endTime: config.deliveryEndTime,
          avgDeliveryTime: `${config.avgDeliveryTime}s`,
          shiftStartTime: config.shiftStartTime,
          shiftEndTime: config.shiftEndTime,
          travelDurationMultiple: config.travelDurationMultiple,
          dispatchLocation: config.customDispatchLocation,
          endAtKitchen: config.endAtKitchen,
          firstSubslotEndTime: config.firstSubslotEndTime,
          costModel: config.costModel,
          isDeliveryEndTimeNextDay: config.isDeliveryEndTimeNextDay,
          isShiftEndTimeNextDay: config.isShiftEndTimeNextDay,
          isSubslotTimeNextDay: config.isSubslotTimeNextDay
        }
      })
    };

    try {
      const result = await lambda.invoke(params).promise();
      if (result.FunctionError) {
        logger.error('Worker Lambda returned a function error for time window route plan generation', {
          routePlanId: routePlan.id,
          routingConfigId: config.id,
          functionError: result.FunctionError,
          payload: result.Payload ? result.Payload.toString() : undefined
        });
        throw new Error(
          `Worker Lambda invocation failed for Route Plan ID ${routePlan.id} and Routing Config ID ${config.id}`
        );
      }
      // Parse the response payload
      if (!result.Payload) return null;
      const parsedPayload = JSON.parse(result.Payload.toString());
      return parsedPayload.body ? JSON.parse(parsedPayload.body) : null;
    } catch (error) {
      logger.error('Failed to invoke worker Lambda or parse response payload for time window route plan generation', {
        error,
        routePlanId: routePlan.id,
        routingConfigId: config.id
      });
      throw new Error('Failed to invoke worker Lambda or parse response payload');
    }
  }
}
export default RunRoutingConfigUseCase;
