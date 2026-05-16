import fireEvent from '@calo-backend/fireEvent';
import { Slack } from '@calo-backend/interfaces';
import { DeliveryRepository } from '@calo-backend/repositories/DDB';

import { AddressService } from '@calo/services';
import { Brand, Country } from '@calo/types';

import unableToDeliverTemplate from '../../libs/static/slack/unableToDeliverTemplate';

class UnableToDeliverUseCase {
  constructor(private readonly deliveryRepository: DeliveryRepository) {}

  async exec(id: string, driverNumber: string, driverName: string) {
    const delivery = await this.deliveryRepository.findById(id);

    const slackEvent: Slack = {
      channel: 'driver-changes',
      suppress: process.env.STAGE !== 'prod',
      country: delivery.deliveryAddress.country || Country.BH,
      brand: delivery.brand ?? Brand.CALO,
      blocks: unableToDeliverTemplate({
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

export default UnableToDeliverUseCase;
