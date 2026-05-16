import fireEvent from '@calo-backend/fireEvent';
import { Slack, SMS } from '@calo-backend/interfaces';
import { DeliveryRepository, RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { subDays, format } from 'date-fns/fp';

import { AddressService } from '@calo/services';
import { Brand, Country, DeliveryTime } from '@calo/types';

import noCustomerAtDeliverySpot from '../../libs/static/slack/noCustomerAtDeliverySpot';

class NoCustomerSMSUseCase {
  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly routePlanRepository: RoutePlanRepository,
  ) {}

  async exec(id: string, driverNumber: string, driverName: string, driverId: string) {
    const delivery = await this.deliveryRepository.findById(id);

    const deliveryDay =
      delivery.time === DeliveryTime.evening ? format('yyyy-MM-dd')(subDays(1)(new Date(delivery.day))) : delivery.day;
    const plan = await this.routePlanRepository.getByDayIdTime(
      deliveryDay,
      driverId,
      delivery.time ?? DeliveryTime.morning,
    );
    if (plan) {
      plan.set({
        routePlan: {
          ...plan.routePlan,
          [`${delivery.sk}`]: {
            ...plan.routePlan[delivery.sk],
            noCustomerOnSpotTime: new Date().toISOString(),
          },
        },
      });
      await this.routePlanRepository.update(plan);
    }

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

    return null;
  }
}

export default NoCustomerSMSUseCase;
