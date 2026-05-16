import { useState } from 'react';
import { Pressable, StyleProp, TextStyle, TouchableOpacity, View } from 'react-native';

import { Text } from '@ui-kitten/components';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { Delivery, RouteItemAction, RouteItemActionType } from '@calo/driver-types';
import { DDeliveryStatus } from '@calo/types';
import { WarningBadge } from '@components';
import { formatTime } from '@helpers';
import AddressService from '@services/AddressService';
import { GREEN_COLOR, YELLOW_500 } from '@types';

import theme from '../../../../custom-theme.json';

import DeliveryContact from './DeliveryContact';
import DeliveryInstructionsCard from './DeliveryInstructions';
import { styles } from './Styles';

type DeliveryWithCoolerBags = Delivery & { coolerBagsReturned?: number };

type CoolerBagVariant = 'red' | 'orange' | 'green';

interface CoolerBagBadge {
  count: number | string;
  variant: CoolerBagVariant;
  shouldShowBadge: boolean;
}

const getCoolerBagBadge = (item: DeliveryWithCoolerBags): CoolerBagBadge => {
  const unreturnedCoolerBags = item?.unreturnedCoolerBags ?? 0;
  const isDelivered = item.deliveryStatus === DDeliveryStatus.delivered;
  const compiledCount = isDelivered ? `${item.coolerBagsReturned}/${unreturnedCoolerBags}` : unreturnedCoolerBags;
  let variant: CoolerBagVariant = 'red';
  if (isDelivered) {
    variant = item?.coolerBagsReturned ?? 0 === unreturnedCoolerBags ? 'green' : 'orange';
  }
  return {
    count: compiledCount,
    variant,
    shouldShowBadge: (item?.coolerBagsReturned ?? 0) > 0 ? true : unreturnedCoolerBags > 0
  };
};

interface DeliveryInformationProps {
  item: DeliveryWithCoolerBags;
  viewList: string;
  searchText: string;
  selectedTab: number;
  handleCallUser: (item: Delivery) => void;
  shiftAction: RouteItemAction[] | undefined;
}

const DeliveryInformation = ({
  searchText,
  item,
  selectedTab,
  shiftAction,
  handleCallUser,
  viewList
}: DeliveryInformationProps) => {
  const formattedAddress = AddressService.displayV2(item.deliveryAddress);

  const [showName, setShowName] = useState(false);

  const handlePendingStatusText = (text: RouteItemActionType) => {
    switch (text) {
      case RouteItemActionType.CUSTOMERS_REQUESTING_A_CALL_FROM_CX:
        return 'Pending CX call';
      case RouteItemActionType.CUSTOMERS_REQUESTING_LOGISTICS_CHANGES:
        return 'Pending logistics change';
      case RouteItemActionType.CUSTOMERS_NOT_ANSWERING:
        return 'Pending customer response';
      case RouteItemActionType.CUSTOMERS_REQUESTING_DELIVERY_CANCELLATIONS:
        return 'Pending delivery cancellation';
      default:
        return 'Pending CX call';
    }
  };

  const handlePressShowName = () => {
    setShowName((prev) => !prev);
  };

  const highlightedText = (text: string, baseStyle: StyleProp<TextStyle>, category: string) => {
    if (!searchText.trim() || typeof text !== 'string') {
      return (
        <Text category={category} style={baseStyle}>
          {text}
        </Text>
      );
    }
    const regex = new RegExp(`(${searchText?.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    const highlightedStyle = {
      textDecorationLine: 'underline' as const,
      textDecorationColor: YELLOW_500,
      color: YELLOW_500,
      fontWeight: '900' as const,
      fontFamily: 'Lato-Bold'
    };
    return (
      <Text category={category} style={baseStyle}>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <Text key={index} category={category} style={[baseStyle, highlightedStyle]}>
              {part}
            </Text>
          ) : (
            <Text key={index} category={category} style={baseStyle}>
              {part}
            </Text>
          )
        )}
      </Text>
    );
  };

  const { count: coolerBagCount, shouldShowBadge: shouldShowCoolerBagBadge, variant: coolerBagVariant } = getCoolerBagBadge(item);

  return (
    <View style={{ width: '100%' }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <View style={styles.shortIdView}>
          <Text category={'h5'} style={styles.shortIdText}>
            {highlightedText(item.shortId, styles.shortIdText, 'h2')}
          </Text>
          {item.priority ? (
            <Text category={'h6'} style={styles.priorityText}>
              {item.priority}
            </Text>
          ) : null}
          {item.withCoolerBag && (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <FeatherIcon name="shopping-bag" size={19} color="#343434" />
            </View>
          )}
        </View>
        <DeliveryContact item={item} key={item.id} />
      </View>

      {item.deliveryAddress.driverNote && (
        <View style={styles.driverNoteCard}>
          <Text category="p1" style={{ lineHeight: 18, flexWrap: 'wrap', flex: 1 }}>
            <Text style={{ color: theme['color-danger-500'], fontWeight: '700' }}>Driver Note: </Text>
            {item.deliveryAddress.driverNote}
          </Text>
        </View>
      )}

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.rowAlighSpaceBetween}>
          <View
            style={{
              display: item.deliveryStatus !== DDeliveryStatus.delivered && selectedTab === 1 && shiftAction ? 'flex' : 'none'
            }}
          >
            <Text category={'h6'} style={styles.statusText}>
              {shiftAction && handlePendingStatusText(shiftAction[shiftAction.length - 1]?.type)}
            </Text>
          </View>
          <View style={styles.rowBlock}>
            <Text category={'p1'} style={styles.phoneNumberText}>
              Phone:{' '}
            </Text>
            <TouchableOpacity activeOpacity={1} onPress={() => handleCallUser(item)}>
              <Text category={'p1'} style={[styles.phoneNumberText, { color: theme['color-info-600'] }]}>
                {highlightedText(item.phoneNumber, { ...styles.phoneNumberText, color: theme['color-info-600'] }, 'p1')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.rowBlock}>
          <Text category={'p1'} style={{ maxWidth: '100%', color: theme['color-basic-600'] }}>
            <Text category={'p1'} style={styles.phoneNumberText}>
              Address:{' '}
            </Text>
            {highlightedText(formattedAddress, { maxWidth: '100%', color: theme['color-basic-600'] }, 'p1')}
          </Text>
        </View>
        {!!item.eta && (
          <View style={{ paddingVertical: 2 }}>
            <Text category={'p1'} style={styles.phoneNumberText}>
              ETA: {formatTime(item.eta)}
            </Text>
          </View>
        )}

        {showName && (
          <View style={styles.rowBlock}>
            <Text category={'p1'} style={{ maxWidth: '100%', color: theme['color-basic-600'] }}>
              <Text category={'p1'} style={styles.phoneNumberText}>
                Name:{' '}
              </Text>
              {highlightedText(item.name, { maxWidth: '100%', color: theme['color-basic-600'] }, 'p1')}
            </Text>
          </View>
        )}

        <Pressable onPress={handlePressShowName} style={styles.rowBlock}>
          {highlightedText(showName ? 'Hide name' : 'Show name', styles.showNameText, 'p2')}
          <FeatherIcon name={showName ? 'chevron-up' : 'chevron-down'} size={20} color={GREEN_COLOR} />
        </Pressable>
        {shouldShowCoolerBagBadge ? (
          <View style={{ paddingTop: 12 }}>
            <WarningBadge variant={coolerBagVariant} count={coolerBagCount} label="cooler bags" />
          </View>
        ) : null}
      </View>
      <View style={styles.pendingPanel}>
        {item.status === 'paymentRequired' && item.pendingAmount > 0 && (
          <>
            <Text category="p1" style={{ fontWeight: '700' }}>
              Pending:{' '}
            </Text>
            <Text category="p1">
              {item.pendingAmount} {item.currency}
            </Text>
          </>
        )}
      </View>
      <View style={{ width: '100%' }}>
        <DeliveryInstructionsCard item={item} viewList={viewList} />
      </View>
    </View>
  );
};
export default DeliveryInformation;
