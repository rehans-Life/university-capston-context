import { CreateRoutingConfigRequest } from 'components/ConfigPopup/types';
import { MultiRouteOutput } from 'lib/interfaces';
import { useEffect, useState } from 'react';

interface PreloadedDataState {
  autoRoutePlanData: MultiRouteOutput;
  fileName: string;
  fromGroupRouting: boolean;
  selectedRoute: CreateRoutingConfigRequest | null;
}

interface UsePreloadedDataReturn {
  preloadedState: PreloadedDataState | null;
  isCheckingPreloadedData: boolean;
  shouldStartPolling: boolean;
  setShouldStartPolling: (value: boolean) => void;
  clearPreloadedState: () => void;
}

/**
 * Custom hook to manage preloaded data from sessionStorage
 * Handles loading state from group routing navigation
 */
export const usePreloadedData = (): UsePreloadedDataReturn => {
  const [preloadedState, setPreloadedState] = useState<PreloadedDataState | null>(null);
  const [isCheckingPreloadedData, setIsCheckingPreloadedData] = useState(true);
  const [shouldStartPolling, setShouldStartPolling] = useState(true);

  useEffect(() => {
    const storedState = sessionStorage.getItem('routeEditState');
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState);
        setPreloadedState(parsedState);
        // If we have preloaded data, don't start polling
        if (parsedState.fromGroupRouting) {
          setShouldStartPolling(false);
        }
        // Clear the sessionStorage after reading
        sessionStorage.removeItem('routeEditState');
      } catch (error) {
        console.error('Error parsing session state:', error);
      }
    }
    // Mark that we've finished checking for preloaded data
    setIsCheckingPreloadedData(false);
  }, []);

  const clearPreloadedState = () => {
    setPreloadedState(null);
  };

  return {
    preloadedState,
    isCheckingPreloadedData,
    shouldStartPolling,
    setShouldStartPolling,
    clearPreloadedState
  };
};
