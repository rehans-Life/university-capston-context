import { getAnalyzeCompletedSimulatedRoute } from 'actions';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';

interface UseAnalyseRoutePlanParams {
  routeID: string;
  analyseTriggered: boolean;
  resetAnalyseTrigger: () => void;
  shouldStartPolling: boolean;
  setShouldStartPolling: (value: boolean) => void;
}

export const useAnalyseRoutePlan = ({
  routeID,
  analyseTriggered,
  resetAnalyseTrigger,
  shouldStartPolling,
  setShouldStartPolling
}: UseAnalyseRoutePlanParams) => {
  const queryClient = useQueryClient();
  const [analyseVersion, setAnalyseVersion] = useState(0);
  const prevAnalyseTriggeredRef = useRef(false);

  // Increment version when analyseTriggered is true, Tentative solution to avoid stale data, we might look for better approach
  useEffect(() => {
    if (analyseTriggered && !prevAnalyseTriggeredRef.current) {
      setAnalyseVersion((prev) => prev + 1);
    }
    prevAnalyseTriggeredRef.current = analyseTriggered;
  }, [analyseTriggered]);

  // React Query for generating route plan file name
  const {
    data: analyseRoutePlanData,
    isLoading,
    isFetching,
    isError
  } = useQuery({
    queryKey: ['autoRouteAnalyse', routeID, analyseVersion],
    queryFn: () => {
      return getAnalyzeCompletedSimulatedRoute(routeID);
    },
    refetchInterval: (data) => {
      if (!shouldStartPolling) return false;
      return data ? false : 10000;
    },
    enabled: analyseTriggered,
    onError: (error) => {
      console.error(error);
      resetAnalyseTrigger();
    }
  });
  const isErrors = shouldStartPolling ? isError : false;

  const handleCancelAnalysePolling = useCallback(() => {
    setShouldStartPolling(false);
    // Cancelling pre flight requests , for stopping the polling we are tracking it through useState
    queryClient.cancelQueries(['autoRouteAnalyse', routeID, analyseVersion]);
    resetAnalyseTrigger();
  }, [setShouldStartPolling, queryClient, routeID, analyseVersion, resetAnalyseTrigger]);

  return {
    analyseRoutePlanData,
    isLoading: isLoading || isErrors || isFetching,
    handleCancelPolling: handleCancelAnalysePolling
  };
};
