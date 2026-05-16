import { generateRecalculatedETAs } from 'actions/route';
import { formatMinutesToHM } from 'components/AutoRoute/helper';
import { AllRoutesStats, RecalculateETAsParameters } from 'components/AutoRoute/types';
import { AutoRouteItem, MultiRouteOutput, RoutingOutput, SidebarValues } from 'lib/interfaces';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

interface UseRoutePlanProcessorParams {
  autoRoutePlanData: MultiRouteOutput | undefined;
  analyseRoutePlanData: RoutingOutput;
  simulateTriggered: boolean;
  analyseTriggered: boolean;
  handleCancelPolling: () => void;
  resetSimulateTrigger: () => void;
  resetAnalyseTrigger: () => void;
  setShouldStartPolling: (value: boolean) => void;
  sidebarValues: SidebarValues;
}

interface UseRoutePlanProcessorReturn {
  stats: AllRoutesStats;
  deliveries: AutoRouteItem[];
  simulatedDeliveries: RoutingOutput['simulated']['route'];
  actualDeliveries: RoutingOutput['actual']['route'];
  handleDeliveriesReorder: (updated: RoutingOutput['simulated']['route']) => void;
  resetManualReorderFlag: () => void;
  isReordering: boolean;
}

export const useRoutePlanProcessor = ({
  autoRoutePlanData,
  analyseRoutePlanData,
  simulateTriggered,
  analyseTriggered,
  handleCancelPolling,
  resetSimulateTrigger,
  resetAnalyseTrigger,
  setShouldStartPolling,
  sidebarValues
}: UseRoutePlanProcessorParams): UseRoutePlanProcessorReturn => {
  const [stats, setStats] = useState<AllRoutesStats>({
    simulatedDeliveryDuration: '--',
    simulatedTime: '--',
    simulatedDeliveriesCompleted: '--',
    simulatedWithinWindow: '--',
    actualDeliveryDuration: '--',
    actualTime: '--',
    actualDeliveriesCompleted: '--',
    actualWithinWindow: '--'
  });

  const [deliveries, setDeliveries] = useState<RoutingOutput['simulated']['route']>([]);
  const [simulatedDeliveries, setSimulatedDeliveries] = useState<RoutingOutput['simulated']['route']>([]);
  const [actualDeliveries, setActualDeliveries] = useState<RoutingOutput['actual']['route']>([]);
  const [isReordering, setIsReordering] = useState(false);
  const hasManualReorder = useRef(false);

  // Handle auto route plan data (simulate)
  useEffect(() => {
    // Guard: Only process if simulate is triggered (not analyse)
    if (analyseTriggered) {
      return;
    }
    // If there's an error, stop polling and reset to initial state
    if (autoRoutePlanData && autoRoutePlanData?.routes[0]?.error) {
      handleCancelPolling();
      setShouldStartPolling(false);
      resetSimulateTrigger();
      toast(autoRoutePlanData.routes[0].error, { type: 'error', autoClose: 2000 });
      return;
    } else if (autoRoutePlanData && autoRoutePlanData?.routes[0]?.vehicleLabel) {
      //* We are using first route as we are only supporting single route plan for now
      const simulated = autoRoutePlanData?.routes[0]?.simulated;
      const actual = autoRoutePlanData?.routes[0]?.actual;

      const simulatedRoute = simulated?.route || [];
      const actualRoute = actual?.route || [];

      setStats({
        simulatedDeliveryDuration: formatMinutesToHM(simulated?.metrics.deliveryDuration),
        simulatedTime: formatMinutesToHM(simulated?.metrics.duration),
        simulatedDeliveriesCompleted: `${simulated?.metrics.performedDeliveries}/${simulated?.metrics.performedDeliveries + simulated?.metrics.skippedDeliveries}`,
        simulatedWithinWindow: simulated?.metrics.totalWithinWindow,
        actualDeliveryDuration: formatMinutesToHM(actual?.metrics.deliveryDuration ?? 0),
        actualTime: formatMinutesToHM(actual?.metrics.duration ?? 0),
        actualDeliveriesCompleted: `${actual?.metrics.performedDeliveries}/${actual?.metrics.performedDeliveries + actual?.metrics.skippedDeliveries}`,
        actualWithinWindow: actual?.metrics.totalWithinWindow
      });

      // Only update deliveries if they haven't been manually reordered
      if (!hasManualReorder.current) {
        setDeliveries(simulatedRoute);
      }
      setSimulatedDeliveries(simulatedRoute);
      setActualDeliveries(actualRoute);
      // resetSimulateTrigger(); // Only reset trigger when we have complete valid data
    }
  }, [autoRoutePlanData, analyseTriggered, resetSimulateTrigger, handleCancelPolling, setShouldStartPolling]);

  // Handle analyse route plan data
  useEffect(() => {
    // Guard: Only process if simulate is triggered (not analyse)
    if (simulateTriggered) {
      return;
    }
    // If there's an error, stop polling and reset to initial state
    if (analyseRoutePlanData && analyseRoutePlanData?.error) {
      handleCancelPolling();
      setShouldStartPolling(false);
      resetAnalyseTrigger();
      toast(analyseRoutePlanData.error, { type: 'error', autoClose: 2000 });
      return;
    } else if (analyseRoutePlanData) {
      const simulated = analyseRoutePlanData?.simulated;
      const actual = analyseRoutePlanData?.actual;

      const simulatedRoute = simulated?.route || [];
      const actualRoute = actual?.route || [];
      setStats({
        simulatedDeliveryDuration: formatMinutesToHM(simulated?.metrics.deliveryDuration),
        simulatedTime: formatMinutesToHM(simulated?.metrics.duration),
        simulatedDeliveriesCompleted: `${simulated?.metrics.performedDeliveries}/${simulated?.metrics.performedDeliveries + simulated?.metrics.skippedDeliveries}`,
        simulatedWithinWindow: simulated?.metrics.totalWithinWindow,
        actualDeliveryDuration: formatMinutesToHM(actual?.metrics.deliveryDuration ?? 0),
        actualTime: formatMinutesToHM(actual?.metrics.duration ?? 0),
        actualDeliveriesCompleted: `${actual?.metrics.performedDeliveries}/${actual?.metrics.performedDeliveries + actual?.metrics.skippedDeliveries}`,
        actualWithinWindow: actual?.metrics.totalWithinWindow
      });

      // Only update deliveries if they haven't been manually reordered
      if (!hasManualReorder.current) {
        setDeliveries(simulatedRoute);
      }
      setSimulatedDeliveries(simulatedRoute);
      setActualDeliveries(actualRoute);
      resetAnalyseTrigger(); // Only reset trigger when we have complete valid data
    }
  }, [analyseRoutePlanData, simulateTriggered, resetAnalyseTrigger, handleCancelPolling, setShouldStartPolling]);

  const handleDeliveriesReorder = async (updated: RoutingOutput['simulated']['route']) => {
    if (autoRoutePlanData) {
      hasManualReorder.current = true;
      setIsReordering(true);
      try {
        const recalculatedETAs = await recalculateETAs(updated, sidebarValues);

        setStats({
          ...stats,
          simulatedDeliveryDuration: formatMinutesToHM(recalculatedETAs.simulated.metrics.deliveryDuration),
          simulatedTime: formatMinutesToHM(recalculatedETAs.simulated.metrics.duration),
          simulatedWithinWindow: recalculatedETAs.simulated.metrics.totalWithinWindow
        });
        autoRoutePlanData.routes[0].simulated.metrics = recalculatedETAs.simulated.metrics;
        setDeliveries(recalculatedETAs.simulated.route);
      } catch {
        toast('Failed to recalculate ETAs', { type: 'error', autoClose: 2000 });
      } finally {
        setIsReordering(false);
      }
    }
  };

  const resetManualReorderFlag = () => {
    hasManualReorder.current = false;
  };

  return {
    stats,
    deliveries,
    simulatedDeliveries,
    actualDeliveries,
    handleDeliveriesReorder,
    resetManualReorderFlag,
    isReordering
  };
};

const recalculateETAs = async (updated: RoutingOutput['simulated']['route'], sidebarValues: SidebarValues) => {
  const parameters: RecalculateETAsParameters = {
    startTime: updated[0]?.deliveredAt ?? '', // KITCHEN_PICKUP deliveredAt
    endTime: sidebarValues.deliveryEndTime,
    averageDeliveryTime: sidebarValues.averageDeliveryTime,
    travelDurationMultiple: sidebarValues.travelDurationMultiple
  };
  const data = await generateRecalculatedETAs(parameters, updated);
  return data;
};
