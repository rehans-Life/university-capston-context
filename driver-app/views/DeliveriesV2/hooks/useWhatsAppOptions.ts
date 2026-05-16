/**
 * useWhatsAppOptions Hook
 * =======================
 *
 * PURPOSE:
 * Manages WhatsApp options sheet state for contacting customers.
 *
 * USAGE:
 * const {
 *   isWhatsAppOptionsVisible,
 *   selectedWhatsAppDelivery,
 *   openWhatsAppOptions,
 *   closeWhatsAppOptions,
 * } = useWhatsAppOptions();
 */

import { useState, useCallback } from 'react';

import { Delivery } from '@calo/driver-types';

// ============================================================================
// TYPES
// ============================================================================

interface UseWhatsAppOptionsResult {
  isWhatsAppOptionsVisible: boolean;
  selectedWhatsAppDelivery: Delivery | null;
  openWhatsAppOptions: (delivery: Delivery) => void;
  closeWhatsAppOptions: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useWhatsAppOptions = (): UseWhatsAppOptionsResult => {
  const [isWhatsAppOptionsVisible, setWhatsAppOptionsVisible] = useState(false);
  const [selectedWhatsAppDelivery, setSelectedWhatsAppDelivery] = useState<Delivery | null>(null);

  const openWhatsAppOptions = useCallback((delivery: Delivery) => {
    setSelectedWhatsAppDelivery(delivery);
    setWhatsAppOptionsVisible(true);
  }, []);

  const closeWhatsAppOptions = useCallback(() => {
    setWhatsAppOptionsVisible(false);
    setSelectedWhatsAppDelivery(null);
  }, []);

  return {
    isWhatsAppOptionsVisible,
    selectedWhatsAppDelivery,
    openWhatsAppOptions,
    closeWhatsAppOptions
  };
};
