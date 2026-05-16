/**
 * useOutOfSequence Hook
 * =====================
 *
 * PURPOSE:
 * Manages out-of-sequence delivery popup state and handlers.
 * When a driver picks a delivery out of the expected sequence,
 * they must provide a reason.
 *
 * USAGE:
 * const {
 *   isOutOfSequencePopupVisible,
 *   outOfSequenceDelivery,
 *   isOutOfSequenceLoading,
 *   handleOutOfSequenceDelivery,
 *   handleConfirmOutOfSequence,
 *   handleCancelOutOfSequence,
 * } = useOutOfSequence({
 *   filteredDeliveries,
 *   selectedTab,
 *   startDelivery,
 *   handleDelivered,
 *   refetchShift,
 *   deliveriesListRef,
 * });
 */

import { useState, useCallback } from 'react';

import type { BottomSheetFlatListMethods } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetScrollable/types';

import { addActions } from '@actions';
import { Delivery, RouteItemActionType } from '@calo/driver-types';

// ============================================================================
// TYPES
// ============================================================================

interface UseOutOfSequenceParams {
  filteredDeliveries: Delivery[];
  selectedTab: number;
  startDelivery: (deliveryId: string) => Promise<void>;
  handleDelivered: (item: Delivery) => Promise<void>;
  refetchShift: () => Promise<unknown>;
  deliveriesListRef: React.RefObject<BottomSheetFlatListMethods>;
}

interface UseOutOfSequenceResult {
  isOutOfSequencePopupVisible: boolean;
  outOfSequenceDelivery: Delivery | null;
  isOutOfSequenceLoading: boolean;
  handleOutOfSequenceDelivery: (deliveryId: string) => void;
  handleConfirmOutOfSequence: (reason: string) => Promise<void>;
  handleCancelOutOfSequence: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useOutOfSequence = ({
  filteredDeliveries,
  selectedTab,
  startDelivery,
  handleDelivered,
  refetchShift,
  deliveriesListRef
}: UseOutOfSequenceParams): UseOutOfSequenceResult => {
  const [isOutOfSequencePopupVisible, setIsOutOfSequencePopupVisible] = useState(false);
  const [outOfSequenceDelivery, setOutOfSequenceDelivery] = useState<Delivery | null>(null);
  const [isOutOfSequenceLoading, setIsOutOfSequenceLoading] = useState(false);

  /**
   * Show out-of-sequence popup for a delivery
   */
  const handleOutOfSequenceDelivery = useCallback(
    (deliveryId: string) => {
      const delivery = filteredDeliveries.find((d) => d.id === deliveryId);
      if (delivery) {
        setOutOfSequenceDelivery(delivery);
        setIsOutOfSequencePopupVisible(true);
      }
    },
    [filteredDeliveries]
  );

  /**
   * Confirm out-of-sequence delivery with reason
   */
  const handleConfirmOutOfSequence = useCallback(
    async (reason: string) => {
      if (!outOfSequenceDelivery) return;

      setIsOutOfSequenceLoading(true);
      try {
        await addActions(outOfSequenceDelivery.id, [
          {
            note: `Out of sequence delivery reason: ${reason}`,
            createdAt: '',
            type: RouteItemActionType.PRIORITIZE_DELIVERY
          }
        ]);

        // selectedTab 1 means delivery is in Pending Tab, so already picked, we need to deliver
        if (selectedTab === 1) {
          await handleDelivered(outOfSequenceDelivery);
        } else {
          // Now start the delivery
          await startDelivery(outOfSequenceDelivery.id);
          await refetchShift();
        }
        setIsOutOfSequencePopupVisible(false);
        setOutOfSequenceDelivery(null);
      } catch (error: unknown) {
        console.error('Error saving out of sequence reason or starting delivery:', error);
      } finally {
        setIsOutOfSequenceLoading(false);
        deliveriesListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    },
    [outOfSequenceDelivery, selectedTab, startDelivery, handleDelivered, refetchShift, deliveriesListRef]
  );

  /**
   * Cancel out-of-sequence popup
   */
  const handleCancelOutOfSequence = useCallback(() => {
    if (!isOutOfSequenceLoading) {
      setIsOutOfSequencePopupVisible(false);
      setOutOfSequenceDelivery(null);
    }
  }, [isOutOfSequenceLoading]);

  return {
    isOutOfSequencePopupVisible,
    outOfSequenceDelivery,
    isOutOfSequenceLoading,
    handleOutOfSequenceDelivery,
    handleConfirmOutOfSequence,
    handleCancelOutOfSequence
  };
};
