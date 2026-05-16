/**
 * MapMarkers Component
 * ====================
 *
 * PURPOSE:
 * Reusable marker components for the map view.
 *
 * COMPONENTS:
 * - CarIconMarker: Driver location marker
 * - AnimatedMarker: Delivery stop marker with pulse animation
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';

import { GOOGLE_BLUE, GOOGLE_GRAY } from '../constants';

// ============================================================================
// TYPES
// ============================================================================

interface CarIconMarkerProps {}

interface AnimatedMarkerProps {
  stopNumber: number;
  isNext: boolean;
  isCompleted: boolean;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * CarIconMarker Component
 * Displays driver's current location as a car icon
 */
export const CarIconMarker: React.FC<CarIconMarkerProps> = () => (
  <View style={carMarkerStyles.container}>
    <View style={carMarkerStyles.shadow} />
    <View style={carMarkerStyles.carContainer}>
      <Icon name="directions-car" size={32} color="#FFFFFF" />
    </View>
  </View>
);

/**
 * AnimatedMarker Component
 * Displays delivery stop markers with optional pulse animation
 */
export const AnimatedMarker: React.FC<AnimatedMarkerProps> = ({ stopNumber, isNext, isCompleted }) => {
  // Animation value for pulse effect
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Start pulse animation for next stop
  useEffect(() => {
    if (isNext) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isNext, pulseAnim]);

  return (
    <View
      style={[markerStyles.markerContainer, isNext && markerStyles.markerActive, isCompleted && markerStyles.markerCompleted]}
    >
      {/* Pulse ring (only for next stop) */}
      {isNext && (
        <Animated.View
          style={[
            markerStyles.markerPulse,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.4],
                outputRange: [0.3, 0]
              })
            }
          ]}
        />
      )}
      {/* Marker circle with number */}
      <View
        style={[
          markerStyles.markerCircle,
          isNext && markerStyles.markerCircleActive,
          isCompleted && markerStyles.markerCircleCompleted
        ]}
      >
        <Text
          style={[
            markerStyles.markerText,
            isNext && markerStyles.markerTextActive,
            isCompleted && markerStyles.markerTextCompleted
          ]}
        >
          {stopNumber}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const carMarkerStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  shadow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000',
    opacity: 0.2,
    transform: [{ scale: 1.2 }],
    zIndex: -1
  },
  carContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GOOGLE_BLUE,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8
  }
});

const markerStyles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  markerActive: {
    transform: [{ scale: 1.1 }]
  },
  markerCompleted: {
    opacity: 0.6
  },
  markerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2574C',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
  markerCircleActive: {
    backgroundColor: GOOGLE_BLUE,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4
  },
  markerCircleCompleted: {
    backgroundColor: GOOGLE_GRAY,
    width: 32,
    height: 32,
    borderRadius: 16
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center'
  },
  markerTextActive: {
    fontSize: 16,
    fontWeight: '800'
  },
  markerTextCompleted: {
    fontSize: 12
  },
  markerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GOOGLE_BLUE,
    zIndex: -1
  }
});
