import { generateAutoRoutePlan, getAutoRoutePlan } from 'actions';
import { useToast } from 'components/MUI/Toast/Toast';
import { MultiRouteOutput, SidebarValues } from 'lib/interfaces';
import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { timeStringToISO, validateTimeConstraints } from '../helper';

interface UseAutoRoutePlanParams {
  routeID: string;
  configSideBarValues: SidebarValues;
  simulateTriggered: boolean;
  resetSimulateTrigger: () => void;
  shouldStartPolling: boolean;
  setShouldStartPolling: (value: boolean) => void;
  preloadedData?: {
    autoRoutePlanData?: MultiRouteOutput;
    fileName?: string;
  };
}

export const useAutoRoutePlan = ({
  routeID,
  configSideBarValues,
  simulateTriggered,
  resetSimulateTrigger,
  shouldStartPolling,
  setShouldStartPolling,
  preloadedData
}: UseAutoRoutePlanParams) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Validate time constraints
  const timeValidation = useMemo(
    () => validateTimeConstraints(configSideBarValues),
    [
      configSideBarValues.shiftStartTime,
      configSideBarValues.shiftEndTime,
      configSideBarValues.deliveryStartTime,
      configSideBarValues.deliveryEndTime,
      configSideBarValues.firstSubslotEndTime,
      configSideBarValues.isDeliveryEndTimeNextDay,
      configSideBarValues.isShiftEndTimeNextDay,
      configSideBarValues.isSubslotTimeNextDay
    ]
  );

  // React Query for generating route plan file name
  const {
    data: routePlanfileNameData,
    isLoading: isLoadingAutoRoutePlan,
    isFetching: isFetchingAutoRoutePlan
  } = useQuery({
    queryKey: ['autoRoutePlanFile', routeID],
    queryFn: () => {
      const payload = {
        ...configSideBarValues,
        shiftStartTime: timeStringToISO(configSideBarValues.shiftStartTime),
        shiftEndTime: timeStringToISO(configSideBarValues.shiftEndTime),
        deliveryStartTime: timeStringToISO(configSideBarValues.deliveryStartTime),
        deliveryEndTime: timeStringToISO(configSideBarValues.deliveryEndTime),
        firstSubslotEndTime: configSideBarValues.firstSubslotEndTime
          ? timeStringToISO(configSideBarValues.firstSubslotEndTime)
          : undefined
      };
      return generateAutoRoutePlan(routeID, payload);
    },
    enabled: simulateTriggered && !preloadedData?.fileName && timeValidation.isValid,
    onError: (error) => {
      console.error(error);
      resetSimulateTrigger();
    }
  });

  // Handle validation errors when simulate is triggered but validation fails
  useEffect(() => {
    if (simulateTriggered && !timeValidation.isValid && !preloadedData?.fileName) {
      if (!timeValidation.errorMessage) return;
      showToast(timeValidation.errorMessage, 'error');
      resetSimulateTrigger();
    }
  }, [
    simulateTriggered,
    timeValidation.isValid,
    timeValidation.errorMessage,
    preloadedData?.fileName,
    resetSimulateTrigger,
    showToast
  ]);

  // React Query for fetching route plan data (dependent query)
  const fileName = preloadedData?.fileName || routePlanfileNameData?.fileName;
  const {
    data: autoRoutePlanData,
    isLoading: isRoutePlanLoading,
    isFetching: isRoutePlanFetching,
    isError
  } = useQuery<MultiRouteOutput | null>({
    queryKey: ['routePlan', fileName],
    queryFn: () => getAutoRoutePlan(fileName!),
    refetchInterval: (data) => {
      if (!shouldStartPolling) return false;
      return data && data?.routes[0].vehicleLabel ? false : 10000;
    },
    enabled: !!fileName && shouldStartPolling && !preloadedData?.autoRoutePlanData
  });

  const isErrors = shouldStartPolling ? isError : false;

  const isLoading = isLoadingAutoRoutePlan || isFetchingAutoRoutePlan || isRoutePlanLoading || isErrors;

  const handleCancelPolling = useCallback(() => {
    setShouldStartPolling(false);
    // Cancelling pre flight requests , for stopping the polling we are tracking it through useState
    queryClient.cancelQueries(['routePlan', fileName]);
    queryClient.cancelQueries(['autoRoutePlanFile', routeID]);
    resetSimulateTrigger();
  }, [setShouldStartPolling, queryClient, fileName, routeID, resetSimulateTrigger]);

  return {
    autoRoutePlanData: autoRoutePlanData || preloadedData?.autoRoutePlanData, // If we have preloaded data and query is disabled, return preloaded data
    isLoading,
    isFetching: isRoutePlanFetching,
    fileName,
    handleCancelPolling
  };
};
