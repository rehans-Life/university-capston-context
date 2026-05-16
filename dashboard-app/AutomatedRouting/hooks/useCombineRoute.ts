import { combineRoutePlans, getRoutePlanForNextDay } from 'actions/route';
import { DeliveryPlan } from 'lib/interfaces';
import { useState } from 'react';
import { useMutation, useQuery } from 'react-query';

export const useCombineRoute = (routeID: string) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const {
    data: nextDayRoutePlans,
    isLoading: isLoadingRoutePlans,
    refetch
  } = useQuery<DeliveryPlan>(['nextDayRoutePlans', routeID], () => getRoutePlanForNextDay(routeID), {
    enabled: false, // Don't auto-fetch on mount
    onError: (error) => {
      console.error('Failed to fetch route plans:', error);
    }
  });

  const combineMutation = useMutation(() => combineRoutePlans(routeID), {
    onSuccess: () => {
      setIsConfirmDialogOpen(false);
    },
    onError: (error) => {
      console.error('Failed to combine route plans:', error);
    }
  });

  const handleCombineRouteClick = async () => {
    setIsConfirmDialogOpen(true);
    refetch();
  };

  const handleCancelCombine = () => {
    setIsConfirmDialogOpen(false);
  };

  const handleConfirmCombine = async () => {
    combineMutation.mutate();
  };

  return {
    isConfirmDialogOpen,
    nextDayRoutePlans: nextDayRoutePlans ?? null,
    isLoadingRoutePlans,
    handleCombineRouteClick,
    handleConfirmCombine,
    handleCancelCombine
  };
};
