import { getDay, parseISO } from 'date-fns';

import {
  Brand,
  Country,
  Currency,
  DDeliveryStatus,
  DeliveryStatus,
  Gender,
  Kitchen,
  PaymentMethod,
  SubscriptionStatus,
  SubscriptionTier,
  DeliveryTime
} from '../enums';

import {
  Delivery,
  DeliveryAddon,
  DeliveryProviderData,
  DeliveryFood,
  TimeSlot,
  Plan,
  MacrosData,
  MacrosBag,
  DeliveryFlags,
  DeliveryAddress,
  AddonSubscription,
  DeliveryGiftedItems
} from '../interfaces';
import { Entity } from './Entity';
import { SubscriptionEntity } from './SubscriptionEntity';
import { LockupTimeAllowance, ProofOfDelivery } from '@teamcalo/sudo-sdk';

export class DeliveryEntity extends Entity<Delivery> implements Delivery {
  readonly id: string;
  readonly sk: string;
  readonly userId: string;
  readonly paymentMethod: PaymentMethod;
  readonly deliveryAddress: DeliveryAddress;
  readonly food: DeliveryFood[];
  readonly addons?: DeliveryAddon[];
  readonly plan: Plan;
  readonly cost: number;
  readonly addonsCost?: number;
  readonly paidAmount: number;
  readonly macrosData?: MacrosData;
  readonly macros: MacrosBag;
  readonly macrosBag: MacrosBag;
  readonly name: string;
  readonly phoneNumber: string;
  readonly country?: Country;
  readonly currency?: Currency;
  readonly kitchen?: Kitchen;
  readonly day: string;
  readonly time?: DeliveryTime;
  readonly deliveryTimeSlot?: TimeSlot;
  readonly status: DeliveryStatus;
  readonly deliveryStatus?: DDeliveryStatus;
  readonly skipped: boolean;
  readonly timezone: string;
  readonly shortId?: string;
  readonly priority?: number;
  /**
   * @deprecated The prop should not be used
   */
  readonly deliveryDay?: string;
  readonly driver?: { id: string; name: string };
  /**
   * @deprecated use biometrics dob, reason: in case of reschedule it will be wrong,
   * evening one day before delivery will be also wrong
   */
  readonly isBirthday?: boolean;
  readonly isFirst?: boolean;
  readonly deliveredAt?: string;
  readonly withCutlery: boolean;
  readonly numberOfCutlery?: number;
  readonly withCoolerBag: boolean;
  readonly coolerBagsReturned?: number;
  readonly isGifted?: boolean;
  readonly brand?: Brand;
  readonly biometrics?: {
    dob: string;
    gender: Gender;
  };
  readonly dayAllowance?: boolean;
  readonly tier?: SubscriptionTier;
  readonly addonSubscription?: AddonSubscription[];
  readonly flags?: DeliveryFlags;

  readonly giftedItems?: DeliveryGiftedItems;

  readonly deliveryProviderData?: DeliveryProviderData;

  readonly isMarketDelivery?: boolean;
  readonly cutOffTime?: string;
  readonly lockupTimeAllowance?: LockupTimeAllowance;
  readonly isInLockUpTime?: boolean;
  readonly pod?: ProofOfDelivery;

  protected getIndexMap() {
    return {
      tk: ['day', 'status'],
      fk: ['country', 'day', 'kitchen', 'time', 'driver.id'],
      fhk: ['kitchen', 'day']
    };
  }

  static getShortIdPrefix(brand?: Brand) {
    if (!brand || brand === Brand.CALO) {
      return 'C-';
    } else if (brand === Brand.MEALO) {
      return 'M-';
    } else return '-';
  }

  static getShortId(brand?: Brand) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = DeliveryEntity.getShortIdPrefix(brand); // X-XXXXX
    for (let i = 0; i < 5; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  static getId(subId: string) {
    return `delivery#${subId}`;
  }

  /**
   * Returns the number of day in a week of the delivery date a.k.a `day`s
   * @returns number
   */
  public getDeliveryDay(): number {
    return getDay(parseISO(this.day));
  }

  /**
   * Changes the delivery date. The given `date` has to be
   * of format yyyy-MM-dd
   * @param  {string} date
   */
  public setDeliveryDate(date: string) {
    this.set({ day: date });
  }

  public getTier() {
    return this.tier ?? SubscriptionTier.personalized;
  }

  public markAsToBeDelivered() {
    this.set({ status: DeliveryStatus.paymentRequired });
  }

  public resolveNewStatus(subscription: SubscriptionEntity) {
    switch (subscription.status) {
      case SubscriptionStatus.ongoing:
        return DeliveryStatus.paymentRequired;
      case SubscriptionStatus.paused:
        return this.day < subscription.pausedAt! || this.day > subscription.unpauseAt!
          ? DeliveryStatus.paymentRequired
          : DeliveryStatus.paused;
      case SubscriptionStatus.cancelled:
        return DeliveryStatus.cancelled;
      case SubscriptionStatus.suspended:
        return DeliveryStatus.suspended;
    }
  }

  public totalCalories(): number {
    return this.food.reduce((total, food) => (food.skipped ? total : (food.macros?.cal ?? 0) + total), 0);
  }

  public hasAddons() {
    return Array.isArray(this.addons) && this.addons.length > 0;
  }

  public updatePauseStatus(pausedAt?: string | null, unpauseAt?: string | null) {
    if (pausedAt && this.day >= pausedAt) {
      this.set({ status: DeliveryStatus.paused });
    } else if (this.status === DeliveryStatus.paused) {
      this.set({ status: DeliveryStatus.paymentRequired });
    }
    if (unpauseAt && this.day >= unpauseAt) {
      this.set({ status: DeliveryStatus.paymentRequired });
    }
  }
}
