import { DeliveryTime, RouteItemActionType } from '@calo-backend/enums';
import fireEvent from '@calo-backend/fireEvent';
import { RouteItemAction, Slack, SMS } from '@calo-backend/interfaces';
import { DeliveryRepository, RoutePlanRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { format, subDays } from 'date-fns/fp';
import { keyBy } from 'lodash-es';

import { AddressService } from '@calo/services';
import { Brand, Country, DDeliveryStatus, Kitchen } from '@calo/types';

import DriverDeliveryActionedEvent from './events/DeliveryActionsEvent';
import noCustomerAtDeliverySpot from '../../libs/static/slack/noCustomerAtDeliverySpot';

class HandleActionsUseCase {
  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly routePlanRepository: RoutePlanRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async exec(
    id: string,
    driverNumber: string,
    driverName: string,
    driverId: string,
    actions: Omit<RouteItemAction, 'createdAt'>[],
  ) {
    const delivery = await this.deliveryRepository.findById(id);
    if (!delivery) {
      throw 'not found';
    }

    //temp fix for old versions
    for (const action of actions) {
      if (action.type === 'FAR_FROM_DELIVERY') {
        action.type = RouteItemActionType.DELIVERY_FAR_FROM_LOCATION;
      }
    }

    const deliveryDay =
      delivery.time === DeliveryTime.evening ? format('yyyy-MM-dd')(subDays(1)(new Date(delivery.day))) : delivery.day;
    const plan = await this.routePlanRepository.getByDayIdTime(
      deliveryDay,
      driverId,
      delivery.time ?? DeliveryTime.morning,
    );

    if (plan) {
      const keyedOldActions = keyBy(plan.routePlan[delivery.sk]?.actions ?? [], 'type');
      const filteredActions = actions.filter((a) => !keyedOldActions[a.type]);

      const existingActions = plan.routePlan[delivery.sk]?.actions ?? [];
      const newActions = filteredActions.map((a) => ({
        ...a,
        createdAt: new Date().toISOString(),
      }));

      plan.set({
        routePlan: {
          ...plan.routePlan,
          [`${delivery.sk}`]: {
            ...plan.routePlan[delivery.sk],
            actions: [...existingActions, ...newActions] as RouteItemAction[],
          },
        },
      });

      if (Object.keys(plan.getDirty()).length > 0) {
        await this.routePlanRepository.update(plan);
      }

      const isCustomersNotAnswering =
        filteredActions &&
        filteredActions.length > 0 &&
        filteredActions.some((a) => a.type === RouteItemActionType.CUSTOMERS_NOT_ANSWERING);
      if (isCustomersNotAnswering) {
        delivery.set({
          deliveryStatus: DDeliveryStatus.unableToDeliver,
        });
        await this.deliveryRepository.update(delivery);

        const smsEvent: SMS = {
          message: `Hey ${delivery.name}, we tried to reach you for your Calo delivery but couldn't find you, 
          please call your driver ${driverName} on ${driverNumber} in the next 10 minutes to arrange, or talk to us on the app.`,
          to: delivery.phoneNumber,
          suppress: process.env.STAGE !== 'prod',
          brand: delivery.brand ?? Brand.CALO,
        };
        await fireEvent(process.env.SMS_TOPIC_ARN!, smsEvent);

        const slackEvent: Slack = {
          channel: 'driver-changes',
          suppress: process.env.STAGE !== 'prod',
          country: delivery.deliveryAddress.country || Country.BH,
          brand: delivery.brand ?? Brand.CALO,
          blocks: noCustomerAtDeliverySpot({
            driverName,
            driverPhoneNumber: driverNumber,
            customerName: delivery.name,
            customerAddress: AddressService.display(delivery.deliveryAddress),
            customerPhoneNumber: delivery.phoneNumber,
          }),
        };
        await fireEvent(process.env.SLACK_TOPIC_ARN!, slackEvent);
      }

      if (newActions.length > 0) {
        const subscription = await this.subscriptionRepository.findById(delivery.userId);
        await Promise.all(
          newActions.map(async (action) => {
            const deliveryActionsEvent = new DriverDeliveryActionedEvent(
              {
                customer: {
                  id: delivery.userId,
                  name: delivery.name,
                  email: subscription.email,
                  phoneNumber: delivery.phoneNumber,
                  lat: delivery.deliveryAddress.lat,
                  lng: delivery.deliveryAddress.lng,
                },
                driver: { name: driverName },
                delivery: { time: delivery.time ?? DeliveryTime.morning, kitchen: delivery.kitchen ?? Kitchen.BH1 },
                action,
              },
              {
                serviceFunction: 'handleActions',
              },
            );

            await deliveryActionsEvent.publish();
          }),
        );
      }
    }

    return null;
  }
}

export default HandleActionsUseCase;
