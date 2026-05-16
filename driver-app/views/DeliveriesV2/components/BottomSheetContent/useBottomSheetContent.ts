import { useState } from 'react';

export const useBottomSheetContent = (
  onStartDelivery: (deliveryId: string) => Promise<void>,
  onOutOfSequenceDelivery?: (deliveryId: string) => void,
  checkIfOutOfSequence?: (deliveryId: string) => boolean
) => {
  const [loadingDeliveryId, setLoadingDeliveryId] = useState<string | null>(null);

  const handleStartDelivery = async (deliveryId: string) => {
    // Check if out of sequence BEFORE calling onStartDelivery
    if (checkIfOutOfSequence && checkIfOutOfSequence(deliveryId)) {
      // Show popup instead of starting delivery
      if (onOutOfSequenceDelivery) {
        onOutOfSequenceDelivery(deliveryId);
      }
      return;
    }

    // If not out of sequence, proceed normally
    setLoadingDeliveryId(deliveryId);
    try {
      await onStartDelivery(deliveryId);
    } finally {
      setLoadingDeliveryId(null);
    }
  };

  return {
    loadingDeliveryId,
    handleStartDelivery
  };
};
