import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { startCase } from 'lodash-es';
import FeatherIcons from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { DeliveryStatusTabs, ShiftTimeButton, ViewSwitch } from '@components';
import { BottomSheetRef } from '@components/BottomSheet';
import useCurrentUser from '@hooks/useCurrentUser';
import { DeliveryTime } from '@lib/enums';
import { ROUTES } from '@navigation/types';
import { DeliveryFilters, DeliveryStatusCounts, Driver } from '@types';

import { DeliveriesNavigationProp } from '../types';

import SearchComponent from './SearchBar';
import { styles } from './styles';

interface HeaderProps {
  selectedTab: number;
  screenState: string;
  shiftLoading: boolean;
  currentDriver: Driver;
  filters: DeliveryFilters;
  setSearchText: (value: string) => void;
  setIsScanModeActive: (value: boolean) => void;
  accountSettingRef: React.RefObject<BottomSheetRef>;
  setSelectedTab: React.Dispatch<React.SetStateAction<number>>;
  setScreenState: React.Dispatch<React.SetStateAction<string>>;
  tabsTotalLength: DeliveryStatusCounts;
  deliveryTimeBottomSheetRef: React.RefObject<BottomSheetRef>;
}

const Header = ({
  currentDriver,
  shiftLoading,
  filters,
  screenState,
  setScreenState,
  accountSettingRef,
  selectedTab,
  tabsTotalLength,
  setSelectedTab,
  setIsScanModeActive,
  setSearchText,
  deliveryTimeBottomSheetRef
}: HeaderProps) => {
  const { country } = useCurrentUser();
  const navigation = useNavigation<DeliveriesNavigationProp>();

  const [searchOpen, setSearchOpen] = useState(false);

  const shiftText = useMemo(() => {
    if ([DeliveryTime.earlyMorning, DeliveryTime.morning].includes(filters.deliveryTime) && country === 'GB') {
      return 'Overnight';
    }

    return startCase(filters.deliveryTime);
  }, [country, filters.deliveryTime]);

  return (
    <>
      <View style={styles.topBarContainer}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 4
          }}
        >
          <View style={styles.driverNameView}>
            <Text style={styles.driverNameText}>{currentDriver.name}</Text>
            <Text style={[styles.deliveryTimeText]}>{shiftText} Shift</Text>
          </View>

          <ShiftTimeButton filters={filters} isLoading={shiftLoading} deliveryTimeBottomSheetRef={deliveryTimeBottomSheetRef} />
        </View>
      </View>

      <View style={styles.actionTopBarContainer}>
        <View style={{ marginHorizontal: 6, alignSelf: 'center', width: '16%' }}>
          <ViewSwitch screenState={screenState} setScreenState={setScreenState} />
        </View>
        <View style={{ ...styles.scanView, justifyContent: 'space-between' }}>
          <View
            style={{
              width: searchOpen ? '88%' : 'auto',
              marginRight: searchOpen ? 4 : 32
            }}
          >
            <SearchComponent searchOpen={searchOpen} setSearchOpen={setSearchOpen} setSearchText={setSearchText} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              display: searchOpen ? 'none' : 'flex'
            }}
          >
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.DeliveriesV2, { deliveryTime: filters.deliveryTime })}>
              <MaterialCommunityIcons
                name="format-list-bulleted"
                size={21}
                style={{
                  marginRight: 16
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsScanModeActive(true)}>
              <MaterialCommunityIcons
                name="line-scan"
                size={21}
                style={{
                  marginRight: 32
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => accountSettingRef.current?.open()}>
              <FeatherIcons
                name="more-vertical"
                size={26}
                style={{
                  marginRight: 26
                }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View>
        <DeliveryStatusTabs onSelectStatus={setSelectedTab} tabsTotalLength={tabsTotalLength} selectedTab={selectedTab} />
      </View>
    </>
  );
};
export default Header;
