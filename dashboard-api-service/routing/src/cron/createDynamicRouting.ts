import { ScheduledHandler } from 'aws-lambda';
import { addDays, addHours } from 'date-fns';
import { format } from 'date-fns/fp';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { withSecrets } from 'libs/middlewares';
import middleware from 'libs/middleware';
import { SQS } from 'libs/facades';
import { RoutingConfigRepository } from '../../libs/repositories';
import TimezoneService from 'libs/services/TimezoneService';
import { Country } from 'libs/enums';
import { logger } from '@teamcalo/core';

const LOCKUP_THRESHOLD_MS = 1 * 60 * 60 * 1000; // target: 1 hour in milliseconds
const LOCKUP_TOLERANCE_MS = 10 * 60 * 1000; // +/- 10 minutes for scheduler jitter/cold starts
// Countries allowed per scheduled UTC hour. Linked LOCKUP_THRESHOLD_MS to RUN_COUNTRIES_BY_HOUR to ensure lockup checks align with cron windows and target delivery days.
const RUN_COUNTRIES_BY_HOUR: Record<number, Country[]> = {
  10: [Country.GB], // GB during Summer Time (UTC+1)
  11: [Country.GB], // GB during Winter Time (UTC+0)
  19: [Country.AE, Country.OM],
  20: [Country.BH, Country.SA, Country.KW, Country.QA]
};

/**
 * Cutoff hours before midnight of the delivery date, per country.
 *
 * - GB: lockup is 36 hours before midnight of delivery date.
 * - All other countries: lockup is 24 hours before midnight of delivery date
 *   (i.e. midnight the day before delivery — 00:00 local on the delivery date).
 */
function getCutoffHours(country: Country): number {
  return country === Country.GB ? 36 : 24;
}

// lockupTime = (deliveryDate at midnight, local) − cutoffHours
function getLockupTimeUTC(deliveryDay: string, country: Country): Date {
  const timezone = TimezoneService.getTimeZoneForCountry(country);
  const cutoffHours = getCutoffHours(country);

  // Convert the local midnight of the delivery day into UTC, then subtract the cutoff.
  const midnightLocal = `${deliveryDay}T00:00:00.000`;
  const midnightUTC = zonedTimeToUtc(midnightLocal, timezone);

  return addHours(midnightUTC, -cutoffHours);
}

// Checks whether the current time is approximately x hours before lockup.
// We allow a small tolerance to handle scheduler jitter/cold starts while
// still requiring the run to happen before lockup.
function isWithinLockupThreshold(now: Date, deliveryDay: string, country: Country): boolean {
  const lockupTime = getLockupTimeUTC(deliveryDay, country);
  const msUntilLockup = lockupTime.getTime() - now.getTime();
  const minMsUntilLockup = LOCKUP_THRESHOLD_MS - LOCKUP_TOLERANCE_MS;
  const maxMsUntilLockup = LOCKUP_THRESHOLD_MS + LOCKUP_TOLERANCE_MS;
  const withinThreshold = msUntilLockup > 0 && msUntilLockup >= minMsUntilLockup && msUntilLockup <= maxMsUntilLockup;

  logger.info('Lockup threshold check', {
    country,
    deliveryDay,
    lockupTimeUTC: lockupTime.toISOString(),
    nowUTC: now.toISOString(),
    msUntilLockup,
    thresholdMs: LOCKUP_THRESHOLD_MS,
    toleranceMs: LOCKUP_TOLERANCE_MS,
    withinThreshold
  });

  return withinThreshold;
}

/**
 * Returns the target delivery day formatted as 'yyyy-MM-dd' in the kitchen's local timezone.
 *
 * We target +2 local days to align lockup checks with the current cron windows.
 * The cron schedule is chosen so that the evaluated lockup lands exactly 1 hour away.
 */
function getTargetDeliveryDay(now: Date, country: Country): string {
  const timezone = TimezoneService.getTimeZoneForCountry(country);
  const localNow = utcToZonedTime(now, timezone);
  const targetLocalDay = addDays(localNow, 2);
  return format('yyyy-MM-dd')(targetLocalDay);
}

function isCountryAllowedForRun(country: Country, utcHour: number): boolean {
  return (RUN_COUNTRIES_BY_HOUR[utcHour] ?? []).includes(country);
}

// @ts-ignore
export const handler: ScheduledHandler = middleware(async () => {
  logger.info('createDynamicRouting cron started');

  const now = new Date();
  const utcHour = now.getUTCHours();

  const routingConfigRepository = new RoutingConfigRepository();
  const enabledConfigs = await routingConfigRepository.getAllEnabled();

  if (enabledConfigs.length === 0) {
    logger.info('No enabled routing configs found — nothing to queue');
    return;
  }

  const sqsClient = new SQS(process.env.DYNAMIC_ROUTING_QUEUE_URL!);
  let queuedCount = 0;

  for (const config of enabledConfigs) {
    const country = config.country as Country;

    if (!isCountryAllowedForRun(country, utcHour)) {
      logger.info('Config not allowed for current cron hour — skipping', {
        routingConfigId: config.sk,
        routingConfigName: config.name,
        country,
        utcHour
      });
      continue;
    }

    const deliveryDay = getTargetDeliveryDay(now, country);

    if (!isWithinLockupThreshold(now, deliveryDay, country)) {
      logger.info('Config not within lockup threshold — skipping', {
        routingConfigId: config.sk,
        routingConfigName: config.name,
        country,
        deliveryDay
      });
      continue;
    }

    try {
      await sqsClient.send({
        routingConfigId: config.sk,
        day: deliveryDay
      });

      queuedCount++;
      logger.info('Dynamic routing job queued', {
        routingConfigId: config.sk,
        routingConfigName: config.name,
        country,
        day: deliveryDay
      });
    } catch (error) {
      logger.error('Failed to queue dynamic routing job', {
        routingConfigId: config.sk,
        routingConfigName: config.name,
        country,
        error
      });
    }
  }

  logger.info('createDynamicRouting cron finished', {
    totalEnabled: enabledConfigs.length,
    queued: queuedCount,
    utcHour
  });
}).use(withSecrets(process.env.OS_SECRET_ARN));
