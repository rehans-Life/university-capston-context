import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { startCase } from 'lodash-es';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { BottomSheetRef } from '@components/BottomSheet';
import { colors } from '@components/theme';
import { DeliveryTime } from '@lib/enums';
import { DeliveryFilters } from '@types';

import { MoonIcon, SunIcon, SunRiseIcon } from '../../icons';

interface DeliveriesV2HeaderProps {
  filters: DeliveryFilters;
  shiftLoading: boolean;
  deliveryTimeBottomSheetRef: React.RefObject<BottomSheetRef>;
  onSearchPress?: () => void;
  onMenuPress?: () => void;
  country: string;
}

const DeliveriesV2Header: React.FC<DeliveriesV2HeaderProps> = ({
  filters,
  shiftLoading,
  deliveryTimeBottomSheetRef,
  onSearchPress,
  onMenuPress,
  country
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const canGoBack = navigation.canGoBack();

  const shiftText = useMemo(() => {
    if ([DeliveryTime.earlyMorning, DeliveryTime.morning].includes(filters.deliveryTime) && country === 'GB') {
      return 'Overnight';
    }
    return startCase(filters.deliveryTime);
  }, [country, filters.deliveryTime]);

  const renderShiftIcon = (deliveryTime: DeliveryTime) => {
    switch (deliveryTime) {
      case DeliveryTime.morning:
        return <SunIcon width={18} height={18} />;
      case DeliveryTime.evening:
        return <MoonIcon width={18} height={18} />;
      case DeliveryTime.earlyMorning:
        return <SunRiseIcon width={18} height={18} />;
      default:
        return <SunIcon width={18} height={18} />;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: 'white' }]}>
      <View style={styles.headerRow}>
        <View style={styles.leftContent}>
          {canGoBack && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <FeatherIcon name="arrow-left" size={22} color={colors.grey[900]} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => deliveryTimeBottomSheetRef.current?.open()}
            disabled={shiftLoading}
            style={styles.shiftButton}
            activeOpacity={0.7}
          >
            {renderShiftIcon(filters.deliveryTime)}
            <Text style={styles.deliveryTimeText}>{shiftText} Shift</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rightButton}>
          {onSearchPress && (
            <TouchableOpacity onPress={onSearchPress} style={styles.searchButton}>
              <Ionicons name="search-outline" size={22} color={colors.grey[900]} />
            </TouchableOpacity>
          )}
          {onMenuPress && (
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <FeatherIcon name="more-vertical" size={22} color={colors.grey[900]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingHorizontal: 10
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center'
  },
  shiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8
  },
  rightButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center'
  },
  deliveryTimeText: {
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    color: colors.grey[900],
    textAlign: 'left'
  }
});

export default DeliveriesV2Header;
