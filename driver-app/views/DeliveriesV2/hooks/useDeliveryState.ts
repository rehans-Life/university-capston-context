/**
 * useDeliveryState Hook
 * =====================
 *
 * PURPOSE:
 * Manages delivery state using reducer and AsyncStorage for persistence.
 * Handles delivery list, skipped deliveries, and data synchronization.
 *
 * FEATURES:
 * - Reducer-based state management
 * - AsyncStorage persistence for skipped deliveries
 * - Automatic data sync from API
 * - Ordered delivery list (priority + skipped)
 */

import { useEffect, useState, useMemo, useCallback, useReducer } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { keyBy, orderBy } from 'lodash-es';

import { Delivery } from '@calo/driver-types';
import { handleErrorCheck } from '@helpers';
import deliveryReducer from '@reducers/delivery';

const SKIPPED_DELIVERIES_KEY = 'skippedDeliveries';

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Custom hook for managing delivery state
 *
 * @param deliveriesData - Delivery data from API
 * @returns Delivery state and control functions
 */
export const useDeliveryState = (deliveriesData: Delivery[] | undefined) => {
  const [state, dispatch] = useReducer(deliveryReducer, {
    list: [],
    keyedList: {},
    selected: null,
    skippedToLast: []
  });

  const { list, keyedList, skippedToLast } = state;

  const [activeSkippedDeliveryIds, setActiveSkippedDeliveryIds] = useState<string[]>([]);

  // ========================================
  // CALLBACKS
  // ========================================

  /**
   * Update already skipped deliveries from AsyncStorage
   */
  const updateAlreadySkipped = useCallback(async () => {
    const skippedDeliveryIds: string[] = [];
    try {
      const value = await AsyncStorage.getItem(SKIPPED_DELIVERIES_KEY);
      if (value !== null) {
        const ids = JSON.parse(value);
        const keyedDeliveries = keyBy(deliveriesData || [], 'id');
        for (const id of ids) {
          const delivery = keyedDeliveries[id];
          if (delivery) {
            skippedDeliveryIds.push(delivery.id);
            dispatch({
              type: 'skipToLast',
              payload: delivery
            });
          }
        }
      }
      setActiveSkippedDeliveryIds(skippedDeliveryIds);
    } catch (error: unknown) {
      handleErrorCheck(error, 'Loading data from local storage failed');
    }
  }, [deliveriesData]);

  // ========================================
  // EFFECTS
  // ========================================

  /**
   * Sync API data to reducer
   * Also restores skipped deliveries from AsyncStorage
   */
  useEffect(() => {
    if (deliveriesData) {
      dispatch({ type: 'set', payload: deliveriesData });
      updateAlreadySkipped();
    }
  }, [deliveriesData, updateAlreadySkipped]);

  // ========================================
  // MEMOIZED VALUES
  // ========================================

  /**
   * Build delivery list from reducer state
   * Orders by priority, then appends skipped deliveries
   */
  const deliveryList = useMemo(() => {
    const deliveriesOrdered = orderBy(
      list.map((id) => keyedList[id]),
      ['priority', 'shortId']
    );
    const skipped = skippedToLast.map((id) => keyedList[id]);
    return [...deliveriesOrdered, ...skipped];
  }, [keyedList, list, skippedToLast]);

  // ========================================
  // ACTIONS
  // ========================================

  /**
   * Skip a delivery to the end
   */
  const skipToLastDelivery = useCallback(
    async (item: Delivery) => {
      dispatch({
        type: 'skipToLast',
        payload: item
      });
      try {
        const data = [...activeSkippedDeliveryIds, item.id];
        setActiveSkippedDeliveryIds(data);
        await AsyncStorage.setItem(SKIPPED_DELIVERIES_KEY, JSON.stringify(data));
      } catch (error: unknown) {
        handleErrorCheck(error, 'Writing data to local storage failed with error', false);
      }
    },
    [activeSkippedDeliveryIds]
  );

  /**
   * Update delivery in state
   */
  const updateDelivery = useCallback((delivery: Delivery) => {
    dispatch({
      type: 'update',
      payload: delivery
    });
  }, []);

  // ========================================
  // RETURN
  // ========================================

  return {
    deliveryList,
    keyedList,
    list,
    skippedToLast,
    activeSkippedDeliveryIds,
    dispatch,
    skipToLastDelivery,
    updateDelivery
  };
};
