import { format, getDay, parseISO } from 'date-fns/fp';

import {
  DataType,
  SubscriptionStatus,
  PaymentMethod,
  MacrosType,
  Currency,
  Country,
  Language,
  Brand,
  Kitchen,
  SubscriptionTier,
  DeliveryTime
} from '../enums';
import {
  NextPlan,
  Subscription,
  MultiCurrencyAmount,
  AddonSubscription,
  MealPreferenceData,
  DeliveryAddress,
  DeliveryPreferences,
  MacrosData,
  MacrosBag,
  MacrosPreferences,
  Plan
} from '../interfaces';
import { Entity } from './Entity';
import DeliveryPreferencesService from '../../services/DeliveryPreferencesService';

export class SubscriptionEntity extends Entity<Subscription> implements Subscription {
  readonly id: DataType.subscription;
  readonly sk: string;
  readonly fk: string;
  readonly status: SubscriptionStatus;
  readonly paymentMethod: PaymentMethod;
  readonly deliveryAddresses: DeliveryAddress[];
  readonly deliveryPreferences?: DeliveryPreferences;
  readonly macrosData: MacrosData;
  readonly macros: MacrosBag;
  readonly macrosBag: MacrosBag;
  readonly macrosType: MacrosType;
  readonly macrosPreferences: MacrosPreferences;
  readonly deliveryDays: number[];
  readonly timezone: string;
  readonly name: string;
  readonly phoneNumber: string;
  readonly plan: Plan;
  readonly email: string;
  readonly startedAt: string;
  readonly extendedAt: string;
  readonly balance: MultiCurrencyAmount;
  readonly totalPaid: MultiCurrencyAmount;
  readonly pendingAmount: MultiCurrencyAmount;
  readonly autoRenew: boolean;
  /**
   * @deprecated only used endsAt
   */
  readonly expectedEndDate?: string;
  /**
   * @deprecated should be deprecated since we charging users at resume
   */
  readonly forceRenew: boolean;
  readonly cycleStartedAt: string;
  readonly initialCurrency: Currency;
  readonly currency: Currency;
  readonly country: Country;
  readonly invitationCode?: string;
  readonly resumeFirstDay?: string;
  readonly nextPlan?: NextPlan;
  readonly userId?: string;
  readonly cardId?: string;
  readonly pausedAt?: string;
  readonly unpauseAt?: string;
  readonly zohoUserId?: string;
  readonly deliveryTime?: DeliveryTime;
  readonly isGifted?: boolean;
  readonly language?: Language;
  readonly withCutlery?: boolean;
  readonly numberOfCutlery?: number;
  readonly brand?: Brand;
  readonly lastDeliveredDate?: string;
  readonly kitchen?: Kitchen;
  readonly isNonConfirmed?: boolean;
  readonly trialSubscription?: boolean;
  readonly useBalanceOnRenew?: boolean;
  readonly withCoolerBag?: boolean;
  readonly addonSubscription?: AddonSubscription[];
  readonly tier?: SubscriptionTier;
  readonly paymentBalance?: number;
  readonly mealSizePreferences?: MealPreferenceData[];
  readonly endsAt?: string;
  readonly remainingDays?: number;
  readonly gymFitnessTimePopupViewed?: boolean;
  readonly pauseReason?: string;
  readonly allowanceDays?: number;
  readonly isPublicMarketUser?: boolean;
  readonly minActionDate?: string;
  readonly pendingCoolerBags?: number;

  defaultCard(cardId: string) {
    this.set({ cardId });
  }

  planPriceForDay(day: string): number {
    const activeAddonSubscriptions = this.addonSubscription?.filter(
      (addonSub) => addonSub.startDate <= day && (!addonSub.endDate || addonSub.endDate >= day)
    );

    const addonPricePerDay =
      activeAddonSubscriptions?.reduce((acc, addonSub) => +(acc + addonSub.pricePerDay).toFixed(3), 0) ?? 0;
    let pricePerDay = this.plan.pricePerDay;

    if (this.nextPlan && this.nextPlan.type === 'DATE_RANGE' && this.nextPlan.startDate <= day) {
      pricePerDay = +this.nextPlan.pricePerDay.toFixed(3);
    }
    return +(pricePerDay + addonPricePerDay).toFixed(3);
  }

  isDayInPause(day: string): boolean {
    //handling where unpauseAt is less or equal to pausedAt
    let unpauseAt = this.unpauseAt;
    if (unpauseAt && unpauseAt <= this.pausedAt!) unpauseAt = undefined;
    // the user was supposed to be unpaused in the past
    if (unpauseAt && format('yyyy-MM-dd')(new Date()) > unpauseAt) unpauseAt = undefined;
    if (!this.pausedAt) return false;
    return day < this.pausedAt || day >= this.unpauseAt! ? false : true;
  }

  getTier() {
    return this.tier ?? SubscriptionTier.personalized;
  }

  getDefaultAddress(day?: string) {
    if (DeliveryPreferencesService.validateSubscriptionDeliveryPreferences(this)) {
      const weekDay = day ? getDay(parseISO(day)).toString() : '0';
      const deliveryPreferencesAddressId =
        this.deliveryPreferences![weekDay as keyof DeliveryPreferences]?.deliveryAddressId;

      const deliveryPreferencesAddress = this.deliveryAddresses.find(
        (address) => address.id === deliveryPreferencesAddressId
      );

      if (deliveryPreferencesAddress) {
        return deliveryPreferencesAddress;
      }
    }

    return this.deliveryAddresses.find((address) => address.default) ?? this.deliveryAddresses[0];
  }

  resolvePlanForDelivery(day: string) {
    if (this.nextPlan?.type === 'DATE_RANGE') {
      const { startDate, endDate, type: _type, ...plan } = this.nextPlan;
      if (startDate <= day && (!endDate || endDate >= day)) {
        return { ...plan, tier: this.nextPlan.tier ?? this.getTier() };
      }
    }
    return { ...this.plan, tier: this.getTier() };
  }

  resolvePlan(day?: string) {
    if (this.nextPlan) {
      switch (this.nextPlan.type) {
        case 'DATE_RANGE':
          return this.resolvePlanForDelivery(day!);
      }
    }
    return this.plan;
  }

  getBalance(): number {
    const currency = this.currency;
    if (!currency) {
      console.error(`Subscription ${this.sk} doesn't have a currency set.`);
      return 0;
    }
    return this.balance[currency] || 0;
  }

  getPendingAmount(): number {
    const currency = this.currency;
    if (!currency) {
      console.error(`Subscription ${this.sk} doesn't have a currency set.`);
      return 0;
    }
    return this.pendingAmount[currency] || 0;
  }

  //For users trying to pause in a future date, we will consider it as scheduled pause will be set to pause on that date
  pause(pausedAt: string, unpauseAt: string | null, minActionDate: string) {
    if (pausedAt <= minActionDate) {
      this.set({
        status: SubscriptionStatus.paused
      });
    }
    this.set({
      pausedAt,
      unpauseAt: unpauseAt ?? undefined
    });
  }

  //For users trying to unpause in a future date, we will consider it as scheduled unpause will be set to unpause on that date
  resume(unpauseAt: string, minActionDate: string) {
    if (unpauseAt <= minActionDate) {
      this.set({
        status: SubscriptionStatus.ongoing,
        resumeFirstDay: unpauseAt,
        pausedAt: undefined,
        unpauseAt: undefined
      });
    } else {
      this.set({
        unpauseAt: unpauseAt
      });
    }
  }

  //For customers are in scheduled pause, we will clear the pause schedule
  clearPauseSchedule() {
    this.set({
      pausedAt: undefined,
      unpauseAt: undefined
    });
  }

  protected getIndexMap() {
    return {
      tk: ['status'],
      fk: ['country', 'kitchen', 'status'],
      fhk: ['extendedAt']
    };
  }
}
