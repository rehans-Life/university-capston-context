import { AddressType, Country, DeliveryTime, GiftItemType } from 'libs/enums';
import { DeliveryAddon } from 'libs/interfaces';
import { generateDelivery } from 'libs/tests/generators/delivery';

import { addDonationsToDeliveries } from '../../deliveryHelper';

jest.mock('libs/services/DeliveryAddressService', () => ({
  __esModule: true,
  default: {
    display: jest.fn().mockReturnValue('Test Address')
  }
}));

describe('deliveryHelper', () => {
  it('keeps deliveries with non-meal gifts when addons are all third-party fulfilled', async () => {
    const thirdPartyAddon: DeliveryAddon = {
      id: 'addon-third-party',
      metadata: {
        thirdPartyFulfillment: true
      }
    };

    const delivery = generateDelivery({
      day: '2025-01-15',
      deliveryDay: '2025-01-15',
      time: DeliveryTime.morning,
      deliveryAddress: {
        id: 'address-1',
        lat: 26.2,
        lng: 50.5,
        city: 'Manama',
        street: 'Street 1',
        building: '10',
        apartment: '1',
        district: 'Block 1',
        region: 'Capital',
        country: Country.BH,
        type: AddressType.home,
        default: true
      },
      food: [],
      addons: [thirdPartyAddon],
      giftedItems: {
        [GiftItemType.flowers]: {
          id: 'gift-1',
          type: GiftItemType.flowers,
          amount: 1
        }
      }
    });

    const result = await addDonationsToDeliveries('2025-01-15', [], [delivery]);

    expect(result).toHaveLength(1);
    expect(result[0].sk).toBe(delivery.sk);
  });
});
