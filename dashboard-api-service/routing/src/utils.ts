import { DriverRepository } from 'libs/repositories/Cognito';
import { logger } from '@teamcalo/core';

export const getDriverNames = async (
  driverRepository: DriverRepository,
  driverIds: string[]
): Promise<{ [id: string]: string }> => {
  const driverNames: { [id: string]: string } = {};
  await Promise.all(
    driverIds.map(async (driverId) => {
      try {
        const driver = await driverRepository.find(driverId);
        driverNames[driverId] = driver?.name ?? '';
      } catch (error) {
        logger.warn(`Failed to fetch driver name for driverId: ${driverId}`, error as Error);
      }
    })
  );
  return driverNames;
};
