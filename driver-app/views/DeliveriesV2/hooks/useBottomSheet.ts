/**
 * useBottomSheet Hook
 * ===================
 *
 * PURPOSE:
 * Manages bottom sheet state, snap points, and interactions.
 * Handles dynamic height calculation based on card measurements.
 *
 * FEATURES:
 * - Dynamic snap points based on card height
 * - Bottom sheet index tracking
 * - Search input focus management
 * - Expand/collapse handlers
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { TextInput, Dimensions } from 'react-native';

import { BottomSheetRef } from '@components/BottomSheet';

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_SNAP_PERCENTAGE = 30;
const MAX_SNAP_PERCENTAGE = 80;
const EXPANDED_SNAP_PERCENTAGE = 90;
const DEFAULT_SNAP_PERCENTAGE = 20;
const CARD_PADDING = 85; // Handle + container padding + margin

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Custom hook for managing bottom sheet
 *
 * @returns Bottom sheet state and control functions
 */
export const useBottomSheet = () => {
  // ========================================
  // REFS
  // ========================================

  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const searchInputRef = useRef<TextInput>(null);

  // ========================================
  // STATE
  // ========================================

  const [bottomSheetIndex, setBottomSheetIndex] = useState(0);
  const [firstCardHeight, setFirstCardHeight] = useState<number | null>(null);

  // ========================================
  // MEMOIZED VALUES
  // ========================================

  /**
   * Calculate snap points based on card height
   * - First point: Dynamically calculated based on first card height
   * - Second point: Expanded (80% of screen height)
   */
  const snapPoints = useMemo(() => {
    const screenHeight = Dimensions.get('window').height;

    // If we have measured the card height, use it + padding
    if (firstCardHeight !== null) {
      const calculatedHeight = firstCardHeight + CARD_PADDING;
      const percentage = Math.min(Math.max((calculatedHeight / screenHeight) * 100, MIN_SNAP_PERCENTAGE), MAX_SNAP_PERCENTAGE);
      return [`${percentage}%`, `${EXPANDED_SNAP_PERCENTAGE}%`];
    }

    // Fallback to default if card hasn't been measured yet
    return [`${DEFAULT_SNAP_PERCENTAGE}%`, `${EXPANDED_SNAP_PERCENTAGE}%`];
  }, [firstCardHeight]);

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Handle bottom sheet snap change
   */
  const handleBottomSheetChange = useCallback((index: number) => {
    setBottomSheetIndex(index);
  }, []);

  /**
   * Expand bottom sheet and focus search input
   */
  const expandAndFocusSearch = useCallback(() => {
    // First, update the index immediately to switch to ExpandedView
    setBottomSheetIndex(1);
    // Then animate the bottom sheet
    bottomSheetRef.current?.snapToIndex(1);
    // Focus after animation completes
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 500);
  }, []);

  // ========================================
  // RETURN
  // ========================================

  return {
    bottomSheetRef,
    searchInputRef,
    bottomSheetIndex,
    firstCardHeight,
    setFirstCardHeight,
    snapPoints,
    handleBottomSheetChange,
    expandAndFocusSearch
  };
};
