import publishEvent, { SourceService } from '@calo-backend/publishEvent';

import { DriverDeliveryActioned } from './driverDeliveryActioned/DriverDeliveryActioned';

export default class DriverDeliveryActionedEvent {
  protected event: DriverDeliveryActioned;
  constructor(data: DriverDeliveryActioned['data'], { serviceFunction }: { serviceFunction: string }) {
    this.event = new DriverDeliveryActioned();
    this.event.data = data;
    this.event.metadata = {
      version: '1.0.0',
      serviceFunction: serviceFunction,
    };
  }

  async publish() {
    await publishEvent({
      data: {
        ...this.event.data,
      },
      metadata: {
        sourceService: SourceService.driverService,
        eventName: 'DriverDeliveryActioned',
        ...this.event.metadata,
      },
    });
  }
}
