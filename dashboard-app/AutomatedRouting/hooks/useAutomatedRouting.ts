import { Country, Kitchen } from '@calo/types';
import { getCountryConfig, getList } from 'actions';
import { getNextDayFlagUpdates } from 'components/AutoRoute/RouteConfigBar/nextDayFlags';
import { CreateRoutingConfigRequest } from 'components/ConfigPopup/types';
import { format, parseISO } from 'date-fns';
import { resolveCountryFromKitchen } from 'lib/helpers';
import { convertTo24Hour, defaultSidebarValues } from 'lib/helpers/automatedRouting';
import { mapConfigToSidebarValues } from 'lib/helpers/routingConfigMapper';
import { CountryConfig, RouteFilters, SidebarValues } from 'lib/interfaces';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router';
import { useConfigChangeTracker } from '../hooks/useConfigChangeTracker';

export const useAutomatedRouting = (preloadedData?: CreateRoutingConfigRequest) => {
  const { routeID } = useParams<{ routeID?: string }>();

  const { data: driverMetricData } = useQuery<any, Error, any>([`/route-plans/${routeID}`], getList, {
    suspense: true,
    enabled: !!routeID // Only fetch if routeID exists
  });

  const [filters] = useState<RouteFilters>({
    routeID: routeID || '',
    name: driverMetricData?.driver.driverName || '',
    day: {
      lte: driverMetricData?.day ? format(parseISO(driverMetricData.day), 'MMM d, yyyy') : format(new Date(), 'MMM d, yyyy'),
      gte: driverMetricData?.day ? format(parseISO(driverMetricData.day), 'MMM d, yyyy') : format(new Date(), 'MMM d, yyyy')
    },
    deliveryTime: driverMetricData?.time || '',
    deliveryStatus: driverMetricData?.driverActions?.[driverMetricData.driverActions.length - 1]?.type || '',
    kitchen: driverMetricData?.kitchen || Kitchen.BH1,
    country: resolveCountryFromKitchen(driverMetricData?.kitchen || Kitchen.BH1)
  });

  // Sidebar
  const [sideBar, setSideBar] = useState(false);
  const [sidebarValues, setSidebarValues] = useState<SidebarValues>(defaultSidebarValues);
  // Start and End time based on country config
  const { data: countryConfig } = useQuery<CountryConfig | undefined>(
    ['country-config', { country: filters.country as Country, configKeys: ['delivery'] }],
    async () => {
      return await getCountryConfig({ country: filters.country as Country, configKeys: ['delivery'] });
    }
  );

  useEffect(() => {
    if (!countryConfig) return;

    if (preloadedData) {
      const mappedValues = mapConfigToSidebarValues(preloadedData);
      // If endAtKitchen is false, shiftEndTime should match deliveryEndTime
      if (!mappedValues.endAtKitchen) {
        mappedValues.shiftEndTime = mappedValues.deliveryEndTime;
      }
      setSidebarValues((prev) => ({
        ...prev,
        ...mappedValues
      }));
      return;
    } else {
      const action = countryConfig.delivery.timings.find((a) => a.id === filters.deliveryTime);

      if (action) {
        setSidebarValues((prev) => {
          const timeUpdates = {
            shiftStartTime: convertTo24Hour(action.from, '-2'),
            shiftEndTime: prev.endAtKitchen ? convertTo24Hour(action.to, '1') : convertTo24Hour(action.to, '0.5'),
            deliveryStartTime: convertTo24Hour(action.from, '-1'),
            deliveryEndTime: convertTo24Hour(action.to, '0.5'),
            firstSubslotEndTime: filters.country === 'GB' ? convertTo24Hour(action.to, '0.5') : ''
          };
          const flagUpdates = getNextDayFlagUpdates(timeUpdates, { ...prev, ...timeUpdates });
          return { ...prev, ...timeUpdates, ...flagUpdates };
        });
      }
    }
  }, [countryConfig, filters.deliveryTime, filters.country]);

  // Trigger for simulation of route
  const [simulateTriggered, setSimulateTriggered] = useState(false);
  const [analyseTriggered, setAnalyseTriggered] = useState(false);

  // Track configuration changes (only for simulation, not analysis)
  const hasConfigChanged = useConfigChangeTracker(sidebarValues, simulateTriggered);

  // Memoize sidebarValues to prevent unnecessary renders
  const memoSidebarValues = useMemo(
    () => sidebarValues,
    [
      sidebarValues.windowType,
      sidebarValues.windowSize,
      sidebarValues.shiftStartTime,
      sidebarValues.shiftEndTime,
      sidebarValues.deliveryStartTime,
      sidebarValues.deliveryEndTime,
      sidebarValues.averageDeliveryTime,
      sidebarValues.lookbackDays,
      sidebarValues.useCustomKitchenLocation,
      sidebarValues.customKitchenLocation,
      sidebarValues.travelDurationMultiple,
      sidebarValues.endAtKitchen,
      sidebarValues.firstSubslotEndTime,
      sidebarValues.isDeliveryEndTimeNextDay,
      sidebarValues.isShiftEndTimeNextDay,
      sidebarValues.isSubslotTimeNextDay,
      sidebarValues.costModel
    ]
  );

  const toggleSideBar = useCallback(() => setSideBar((prev) => !prev), []);
  const resetSimulateTrigger = useCallback(() => setSimulateTriggered(false), []);
  const resetAnalyseTrigger = useCallback(() => setAnalyseTriggered(false), []);

  return {
    routeID: routeID || '',
    driverMetricData,
    filters,
    sideBar,
    toggleSideBar,
    setSideBar,
    sidebarValues,
    setSidebarValues,
    simulateTriggered,
    setSimulateTriggered,
    resetSimulateTrigger,
    analyseTriggered,
    setAnalyseTriggered,
    resetAnalyseTrigger,
    memoSidebarValues,
    initialDeliveries: driverMetricData?.routePlan ?? [],
    hasConfigChanged
  };
};
