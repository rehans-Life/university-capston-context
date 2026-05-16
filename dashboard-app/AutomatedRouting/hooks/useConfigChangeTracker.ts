import { SidebarValues } from 'lib/interfaces';
import { useEffect, useMemo, useRef } from 'react';

/**
 * Custom hook to track changes in route configuration values.
 * Compares current values with the values that were used for the last simulation.
 * Note: Only tracks changes for simulation, not for analysis (since analysis doesn't depend on config values).
 *
 * @param sidebarValues - Current route configuration values
 * @param simulateTriggered - Whether simulation has been triggered
 * @returns Boolean indicating if configuration has changed since last simulation
 */
export const useConfigChangeTracker = (sidebarValues: SidebarValues, simulateTriggered: boolean): boolean => {
  // Track the values that were used for the last route simulation
  const lastSimulatedValuesRef = useRef<SidebarValues | null>(null);

  // Track previous trigger state
  const prevSimulateTriggeredRef = useRef(false);

  // Track when simulation is triggered to save the current values
  // Note: We don't track analyze triggers since analysis doesn't depend on config values
  useEffect(() => {
    const simulateJustTriggered = simulateTriggered && !prevSimulateTriggeredRef.current;

    if (simulateJustTriggered) {
      // Deep clone the sidebarValues to avoid reference issues
      lastSimulatedValuesRef.current = {
        ...sidebarValues,
        customKitchenLocation: sidebarValues.customKitchenLocation ? { ...sidebarValues.customKitchenLocation } : null
      };
    }

    prevSimulateTriggeredRef.current = simulateTriggered;
  }, [simulateTriggered, sidebarValues]);

  // Check if current values differ from last simulated values
  const hasConfigChanged = useMemo(() => {
    if (!lastSimulatedValuesRef.current) {
      return false; // No simulation has been run yet
    }

    const last = lastSimulatedValuesRef.current;
    const current = sidebarValues;

    // Compare customKitchenLocation properly
    const lastLocation = last.customKitchenLocation;
    const currentLocation = current.customKitchenLocation;
    const locationChanged =
      last.useCustomKitchenLocation !== current.useCustomKitchenLocation ||
      (last.useCustomKitchenLocation &&
        current.useCustomKitchenLocation &&
        lastLocation &&
        currentLocation &&
        (lastLocation.lat !== currentLocation.lat || lastLocation.lng !== currentLocation.lng)) ||
      (lastLocation === null) !== (currentLocation === null);

    // Compare all relevant fields
    return (
      last.windowType !== current.windowType ||
      last.windowSize !== current.windowSize ||
      last.shiftStartTime !== current.shiftStartTime ||
      last.shiftEndTime !== current.shiftEndTime ||
      last.deliveryStartTime !== current.deliveryStartTime ||
      last.deliveryEndTime !== current.deliveryEndTime ||
      last.averageDeliveryTime !== current.averageDeliveryTime ||
      last.lookbackDays !== current.lookbackDays ||
      last.travelDurationMultiple !== current.travelDurationMultiple ||
      last.endAtKitchen !== current.endAtKitchen ||
      locationChanged
    );
  }, [sidebarValues, simulateTriggered]);

  return hasConfigChanged;
};
