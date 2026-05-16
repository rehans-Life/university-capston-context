import { Kitchen, DeliveryTime } from 'libs/enums';
import { Dictionary } from 'libs/interfaces';
import { InvoiceCodesEntity } from '../entities';
import { makeIdForInvoiceCodes, makeInvoiceCodes } from '../factories';
import { InvoiceCodesRepository } from '../repositories';

export class InvoiceCodesService {
  public static async fetchInvoiceCodes(
    kitchen: Kitchen,
    day: string,
    driverId: string,
    time: DeliveryTime,
    isPreview: boolean
  ) {
    const invoiceCodesRepository = new InvoiceCodesRepository();
    const invoiceCodes = await invoiceCodesRepository.find({
      id: makeIdForInvoiceCodes(kitchen, day, time, isPreview),
      sk: driverId
    });

    return invoiceCodes;
  }

  public static async updateInvoiceCodes(
    invoiceCodes: InvoiceCodesEntity | null,
    kitchen: Kitchen,
    day: string,
    driverId: string,
    time: DeliveryTime,
    isPreview: boolean,
    newCodes: Dictionary<string>
  ) {
    const invoiceCodesRepository = new InvoiceCodesRepository();
    if (invoiceCodes) {
      invoiceCodes.set({
        codes: newCodes,
        ttl: Math.round(Date.now() / 1000) + 2 * 86400
      });
      await invoiceCodesRepository.update(invoiceCodes);
    } else {
      const newCodesEntity = makeInvoiceCodes(kitchen, day, time, driverId, isPreview, newCodes);
      await invoiceCodesRepository.create(newCodesEntity);
    }
  }
}
