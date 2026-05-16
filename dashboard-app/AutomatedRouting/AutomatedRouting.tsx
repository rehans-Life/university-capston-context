import { useAnalyseRoutePlan } from 'components/AutoRoute/hooks/useAnalyseRoutePlan';
import { useAutoRoutePlan } from 'components/AutoRoute/hooks/useAutoRoutePlan';
import { usePreloadedData } from 'components/AutoRoute/hooks/usePreloadedData';
import { LoadingOverlay } from 'components/AutoRoute/LoadingOverlay/LoadingOverlay';
import { MapLegend } from 'components/AutoRoute/MapLegend/MapLegend';
import { RouteConfigBar } from 'components/AutoRoute/RouteConfigBar';
import SimulatedRoutes from 'components/AutoRoute/SimulatedRoutes';
import { ConfirmationDialog } from 'components/ConfirmationDialog/ConfirmationDialog';
import DynamicFilterBar from 'components/DynamicFilterBar';
import { ShiftActionType } from 'lib/calo-dashboard-types';
import { DeliveryTime } from 'lib/calo-types/enums2';
import AllRoutes from '../../components/AutoRoute/AllRoutes';
import { CombineRouteDialogContent } from '../../components/ConfirmationDialog/CombineRouteDialogContent';
import { useAutomatedRouting } from './hooks/useAutomatedRouting';
import { useCombineRoute } from './hooks/useCombineRoute';
import { useRoutePlanProcessor } from './hooks/useRoutePlanProcessor';
import SimulateRouteButton from './SimulateRouteButton';

const AutomatedRouting = () => {
  const { preloadedState, isCheckingPreloadedData, shouldStartPolling, setShouldStartPolling, clearPreloadedState } =
    usePreloadedData();

  const {
    routeID,
    driverMetricData,
    filters,
    sidebarValues,
    setSidebarValues,
    simulateTriggered,
    setSimulateTriggered,
    resetSimulateTrigger,
    analyseTriggered,
    setAnalyseTriggered,
    resetAnalyseTrigger,
    memoSidebarValues,
    initialDeliveries,
    hasConfigChanged
  } = useAutomatedRouting(preloadedState?.selectedRoute ?? undefined);

  const {
    isConfirmDialogOpen,
    nextDayRoutePlans: nextDayRoutePlan,
    isLoadingRoutePlans,
    handleCombineRouteClick,
    handleConfirmCombine,
    handleCancelCombine
  } = useCombineRoute(routeID);

  const effectiveShouldStartPolling = isCheckingPreloadedData ? false : shouldStartPolling;

  const { autoRoutePlanData, isLoading, handleCancelPolling, fileName } = useAutoRoutePlan({
    routeID,
    configSideBarValues: memoSidebarValues,
    simulateTriggered,
    resetSimulateTrigger,
    shouldStartPolling: effectiveShouldStartPolling,
    setShouldStartPolling,
    preloadedData: preloadedState?.fromGroupRouting
      ? {
          autoRoutePlanData: preloadedState.autoRoutePlanData,
          fileName: preloadedState.fileName
        }
      : undefined
  });

  const {
    analyseRoutePlanData,
    isLoading: isLoadingAnalyseRoutePlan,
    handleCancelPolling: handleCancelAnalysePolling
  } = useAnalyseRoutePlan({
    routeID,
    analyseTriggered,
    resetAnalyseTrigger,
    shouldStartPolling: isCheckingPreloadedData ? false : shouldStartPolling,
    setShouldStartPolling
  });

  const {
    stats,
    deliveries,
    simulatedDeliveries,
    actualDeliveries,
    handleDeliveriesReorder,
    resetManualReorderFlag,
    isReordering
  } = useRoutePlanProcessor({
    autoRoutePlanData,
    analyseRoutePlanData,
    simulateTriggered,
    analyseTriggered,
    handleCancelPolling,
    resetSimulateTrigger,
    resetAnalyseTrigger,
    setShouldStartPolling,
    sidebarValues
  });

  const onSimulateRoute = () => {
    clearPreloadedState();
    setSimulateTriggered(true);
    setShouldStartPolling(true);
    resetManualReorderFlag();
  };

  const onAnalyseRoute = () => {
    setAnalyseTriggered(true);
    setShouldStartPolling(true);
    resetManualReorderFlag();
  };

  const shiftFinished = filters.deliveryStatus === ShiftActionType.FINISHED_SHIFT;
  const shiftInProgress = filters.deliveryStatus === ShiftActionType.STARTED_DELIVERING;
  const isShiftFinishedOrInProgress = shiftInProgress || shiftFinished;
  const shouldEligibleForAnalyze = isShiftFinishedOrInProgress && !!(driverMetricData && driverMetricData.assignedRoutePlan);

  const renderCombineButton = () => {
    // Don't show if shift is finished or in progress
    if (isShiftFinishedOrInProgress) return null;
    // Only show for GB country and evening delivery time
    if (filters.country !== 'GB' || filters.deliveryTime !== DeliveryTime.evening) return null;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: '6px',
          paddingRight: '6px'
        }}
      >
        <button
          onClick={handleCombineRouteClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'linear-gradient(145deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            outline: 'none',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(37, 99, 235, 0.15)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          Combine Route
        </button>
      </div>
    );
  };

  const renderShiftConfiguration = () => {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: '1 1 auto',
          minWidth: '300px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(196, 181, 253, 0.2)',
            flexShrink: 0
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span
            style={{
              fontSize: '10px',
              fontWeight: '700',
              color: 'white',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}
          >
            Shift
          </span>
        </div>

        <DynamicFilterBar filters={filters} />
      </div>
    );
  };

  const renderRouteConfiguration = () => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          flex: '0 1 auto',
          width: '100%',
          alignItems: 'center'
        }}
      >
        {/* Shared Green Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(110, 231, 183, 0.2)',
            flexShrink: 0
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span
            style={{
              fontSize: '10px',
              fontWeight: '700',
              color: 'white',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}
          >
            Route
          </span>
        </div>

        {/* Route Config Bar with Shift Times */}
        <RouteConfigBar
          sidebarValues={sidebarValues}
          defaultKitchenLocation={
            driverMetricData?.kitchenPosition
              ? { lat: driverMetricData.kitchenPosition.lat, lng: driverMetricData.kitchenPosition.lng }
              : { lat: 0, lng: 0 }
          }
          onChange={(values) => setSidebarValues((prev) => ({ ...prev, ...values }))}
          hasConfigChanged={hasConfigChanged}
          shouldShowFirstSubslot={
            filters.country === 'GB' && filters.deliveryTime === DeliveryTime.evening && !isShiftFinishedOrInProgress
          }
        />
      </div>
    );
  };

  return (
    <>
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Combine Route Plan"
        message="Are you sure you want to combine this route plan? This action will merge the current route configurations."
        confirmLabel="Combine"
        cancelLabel="Cancel"
        onConfirm={handleConfirmCombine}
        onCancel={handleCancelCombine}
        isLoading={isLoadingRoutePlans}
      >
        <CombineRouteDialogContent
          isLoading={isLoadingRoutePlans}
          nextDayRoutePlan={nextDayRoutePlan}
          currentDayRoutePlan={driverMetricData}
        />
      </ConfirmationDialog>
      <LoadingOverlay isRunning={isReordering} message="Recalculating route ETAs..." />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: -32,
          marginBottom: -32,
          marginLeft: -20,
          height: 'calc(100vh - 64px)',
          width: '103%',
          paddingRight: -32
        }}
      >
        {/* Top Bar with Filters and Configuration */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(to bottom, #fafbfc 0%, #ffffff 100%)',
            zIndex: 20,
            borderBottom: '1px solid #e5e7eb',
            gap: '0',
            flexWrap: 'wrap',
            width: '100%'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100vw',
              gap: '0'
            }}
          >
            {/* First Row: Shift Configuration */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                width: '100%',
                gap: '20px',
                padding: '6px 12px'
              }}
            >
              {renderShiftConfiguration()}
            </div>

            {/* Second Row: Route Configuration + Button */}
            <div
              style={{
                padding: '0px 12px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                width: '100%',
                gap: '20px'
              }}
            >
              {renderRouteConfiguration()}
              <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {renderCombineButton()}
                <SimulateRouteButton
                  onSimulateRoute={onSimulateRoute}
                  onAnalyseRoute={onAnalyseRoute}
                  analyseFirst={shouldEligibleForAnalyze}
                  showDropdown={shouldEligibleForAnalyze}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Map/Table container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}
        >
          {/* Map / Routes */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {driverMetricData?.kitchenPosition &&
              (() => {
                const kitchenPosition =
                  sidebarValues.useCustomKitchenLocation && sidebarValues.customKitchenLocation
                    ? sidebarValues.customKitchenLocation
                    : { lat: driverMetricData.kitchenPosition.lat, lng: driverMetricData.kitchenPosition.lng };

                return shiftFinished || shiftInProgress ? (
                  <AllRoutes
                    kitchenPosition={kitchenPosition}
                    initialDeliveries={initialDeliveries || []}
                    isLoading={analyseTriggered ? isLoadingAnalyseRoutePlan : isLoading}
                    handleCancelPolling={analyseTriggered ? handleCancelAnalysePolling : handleCancelPolling}
                    simulatedRoutes={simulatedDeliveries}
                    actualRoutes={actualDeliveries}
                    stats={stats}
                    compliance={analyseRoutePlanData?.compliance}
                    country={filters.country}
                  />
                ) : (
                  <SimulatedRoutes
                    routeID={routeID}
                    kitchenPosition={kitchenPosition}
                    initialDeliveries={initialDeliveries || []}
                    deliveries={deliveries}
                    lookbackDays={sidebarValues.lookbackDays}
                    customKitchenLocation={sidebarValues.customKitchenLocation}
                    stats={stats}
                    isLoading={isLoading}
                    setDeliveries={handleDeliveriesReorder}
                    autoRoutePlanData={autoRoutePlanData}
                    handleCancelPolling={handleCancelPolling}
                    fileName={fileName}
                    country={filters.country}
                  />
                );
              })()}
          </div>

          {/* Legend below the map */}
          {driverMetricData?.kitchenPosition && (
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <MapLegend showCustomKitchen={!!sidebarValues.customKitchenLocation} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
export default AutomatedRouting;
