import { makeDeliveryEstimation } from 'src/libs/factories/DDB';
import { DeliveryETAPriority, PreferredRouteItemWithDeliveryTime } from 'src/libs/interfaces';
import { formatETA } from 'src/libs/utils';

/**
 * Checks if the provided version is greater than or equal to the minimum required version.
 * Compares semantic versions numerically (e.g., "4.4.10" > "4.4.1").
 *
 * @param userVersion - The version to check (e.g., "4.4.1")
 * @param minVersion - The minimum required version (e.g., "4.4.1")
 * @returns true if userVersion >= minVersion
 */
export const isVersionSupported = (userVersion: string, minVersion: string): boolean => {
  // Split versions into parts (major.minor.patch) and convert to numbers
  const userParts = userVersion.split('.').map((part) => parseInt(part, 10) || 0);
  const minParts = minVersion.split('.').map((part) => parseInt(part, 10) || 0);

  // Compare each version segment (major, minor, patch)
  for (let i = 0; i < Math.max(userParts.length, minParts.length); i++) {
    const userPart = userParts[i] || 0; // Default to 0 if segment missing
    const minPart = minParts[i] || 0;

    if (userPart > minPart) return true; // User version is newer
    if (userPart < minPart) return false; // User version is older
  }

  return true; // Versions are equal
};

export const syncEstimations = (
  preferredRoute: PreferredRouteItemWithDeliveryTime[],
  day: string,
): Record<string, { gte: string; lte: string } | undefined> => {
  const eta: Record<string, { gte: string; lte: string } | undefined> = {};
  for (const item of preferredRoute) {
    const newEta: DeliveryETAPriority = {
      day,
      priority: item.priority || 0,
      time: item?.deliveryTime,
      groupBufferTime: item.groupBufferTime,
    };

    const estimation = makeDeliveryEstimation(item.userId, [newEta]);
    eta[item.id] = formatETA(estimation, day);
  }
  return eta;
};
