import { Kitchen, DeliveryStatus, Country } from 'libs/enums';
import { keyBy } from 'lodash';
import { logger } from '@teamcalo/core';
import { DeliveryRepository } from 'libs/repositories/ES';
import { DeliveryRepository as DDBDeliveryRepository, DonationRepository } from 'libs/repositories/DDB';
import { DeliveryEntity } from 'libs/entities/DDB';
import { DeliveryTime } from 'libs/enums';
import { Donation, DeliveryFood, DeliveryAddon } from 'libs/interfaces';
import DeliveryAddressService from 'libs/services/DeliveryAddressService';
import DeliveryFoodService from 'libs/services/DeliveryFoodService';

/**
 * Day mapping note (route-plan day = N):
 * - morning run on N: deliveries have day=N, deliveryDay=N.
 * - earlyMorning run on N: deliveries have day=N, deliveryDay=N.
 * - evening run on N: deliveries have day=N, deliveryDay=N-1
 *   (ES stores evening day = deliveryDay + 1, so querying day=N is correct).
 * - evening run (GB bundle) on N: also includes early-morning deliveries
 *   with day=N, deliveryDay=N.
 */

function hasOnlyThirdPartyAddons(delivery: ExtendedDelivery): boolean {
  const addons = (delivery.addons ?? []) as DeliveryAddon[];
  if (addons.length === 0) return false;

  const hasFood = (delivery.food?.length ?? 0) > 0;
  const hasGifts = DeliveryFoodService.hasGifts(delivery);
  if (hasFood || hasGifts) return false;

  return addons.every((a) => {
    const metadata = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata;
    return Boolean(metadata?.thirdPartyFulfillment);
  });
}

export interface ExtendedDelivery extends DeliveryEntity {
  isDonated?: boolean;
  address?: string;
}

/**
 * Fetches donations for a kitchen on a given day that should be delivered to customers
 */
export async function fetchUserDonations(date: string, kitchen: Kitchen): Promise<Donation[]> {
  const donationRepository = new DonationRepository();
  const donations = await donationRepository.findKitchenDonationsByDate(kitchen, date, [
    'subscriptionId',
    'mealsCount',
    'foodId',
    'deliverToCustomer'
  ]);
  return donations.filter((donation) => donation.deliverToCustomer);
}

/**
 * Fetches deliveries from ES for a given day and kitchen
 */
export async function fetchDeliveries(
  date: string,
  kitchen: Kitchen,
  deliveryTime?: DeliveryTime
): Promise<DeliveryEntity[]> {
  const deliveryRepository = new DeliveryRepository();
  const result = await deliveryRepository.getDeliveries({
    day: { gte: date, lte: date },
    kitchen,
    deliveryTime,
    status: [DeliveryStatus.paymentRequired, DeliveryStatus.upcoming]
  });
  return result.data as unknown as DeliveryEntity[];
}

/**
 * Finds a delivery for a user who has a donation but no delivery scheduled
 */
export async function findUserDelivery(date: string, userId: string): Promise<DeliveryEntity> {
  const ddbDeliveryRepository = new DDBDeliveryRepository();
  // Try to find an existing delivery for the user on this date
  const existingDelivery = await ddbDeliveryRepository.findDeliveryByDate(userId, date);
  if (existingDelivery) {
    return existingDelivery;
  }
  throw new Error(`No delivery found for user ${userId} on ${date}`);
}

/**
 * Merges donations with deliveries, finding deliveries for users who have donations but no scheduled delivery.
 * In this data model, donation.subscriptionId IS the userId (subscriptions are keyed by userId),
 * so we use it directly to match against deliveries.
 */
export async function addDonationsToDeliveries(
  date: string,
  donations: Donation[],
  deliveries: DeliveryEntity[]
): Promise<ExtendedDelivery[]> {
  const deliveriesByUser = keyBy(deliveries, 'userId');
  const newlyCreatedDonations: ExtendedDelivery[] = [];

  await Promise.all(
    donations.map(async (donation) => {
      const delivery = deliveriesByUser[donation.subscriptionId];
      if (!delivery) {
        try {
          const newDelivery = await findUserDelivery(date, donation.subscriptionId);
          newlyCreatedDonations.push({
            ...newDelivery,
            isDonated: true
          } as ExtendedDelivery);
        } catch (error) {
          logger.warn('Failed to find delivery for donation', {
            subscriptionId: donation.subscriptionId,
            error
          });
        }
      }
    })
  );

  const mappedDeliveries: ExtendedDelivery[] = [...deliveries, ...newlyCreatedDonations].map(
    (delivery) =>
      ({
        ...delivery.valueOf(),
        deliveryDay: delivery.deliveryDay,
        day: delivery.day,
        food: delivery.food ? delivery.food.filter((item: DeliveryFood) => !item.skipped) : [],
        address: DeliveryAddressService.display(delivery.deliveryAddress),
        isDonated: (delivery as ExtendedDelivery).isDonated
      }) as ExtendedDelivery
  );

  return mappedDeliveries.filter((delivery) => !hasOnlyThirdPartyAddons(delivery));
}

export interface FetchAndMergeDeliveriesParams {
  day: string;
  kitchen: Kitchen;
  deliveryTime?: DeliveryTime;
  country?: Country;
}

export interface FetchAndMergeDeliveriesResult {
  extendedDeliveries: ExtendedDelivery[];
}

/**
 * Fetches deliveries and donations for a given day and kitchen, then merges them.
 * This is the main entry point for fetching deliveries with donation support.
 *
 * For all delivery times, we query ES with route-plan day N directly.
 * ES stores evening deliveries with day = deliveryDay + 1, so querying day=N
 * returns evening deliveries with deliveryDay=N-1.
 * For GB evening routing configs, it additionally includes early morning deliveries from day N.
 */
export async function fetchAndMergeDeliveries(
  params: FetchAndMergeDeliveriesParams
): Promise<FetchAndMergeDeliveriesResult> {
  const { day, kitchen, deliveryTime, country } = params;

  // Step 1: Fetch donations for the route-plan day
  const userDonations = await fetchUserDonations(day, kitchen);
  logger.info('Fetched donations:', { count: userDonations.length });

  // Step 2: Fetch deliveries for the primary leg.
  // Always query ES with route-plan day directly. For evening, ES already stores
  // day = deliveryDay + 1, so querying day=N returns deliveryDay=N-1 evening deliveries.
  const deliveries = await fetchDeliveries(day, kitchen, deliveryTime);
  logger.info('Fetched deliveries:', { count: deliveries.length, day, deliveryTime });

  // Step 2b: For GB evening bundles, also fetch route-plan day's early morning deliveries.
  let nextDayEarlyMorningDeliveries: DeliveryEntity[] = [];
  if (country === Country.GB && deliveryTime === DeliveryTime.evening) {
    const earlyMorningDay = day;
    nextDayEarlyMorningDeliveries = await fetchDeliveries(earlyMorningDay, kitchen, DeliveryTime.earlyMorning);
    logger.info('Fetched route-plan day early morning deliveries for GB evening route:', {
      earlyMorningDay,
      count: nextDayEarlyMorningDeliveries.length
    });
  }

  // Step 3: Merge donations with deliveries (including bundled early morning if applicable)
  const allDeliveries = [...deliveries, ...nextDayEarlyMorningDeliveries];
  const extendedDeliveries = await addDonationsToDeliveries(day, userDonations, allDeliveries);
  logger.info('Extended deliveries (with donations):', { count: extendedDeliveries.length });

  return {
    extendedDeliveries
  };
}
