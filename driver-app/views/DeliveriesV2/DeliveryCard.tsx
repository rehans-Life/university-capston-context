import React, { useState } from 'react';
import { Image, Linking, StyleSheet, StyleProp, Text, TextStyle, TouchableOpacity, View } from 'react-native';

import Config from 'react-native-config';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Delivery, RouteItemAction, RouteItemActionType } from '@calo/driver-types';
import { DDeliveryStatus, DeliveryInstruction, NewDeliveryAddress } from '@calo/types';
import { BottomSheetRef } from '@components/BottomSheet';
import Button from '@components/Button';
import { colors } from '@components/theme';
import WarningBadge from '@components/WarningBadge';
import { formatTime } from '@helpers';
import AddressService from '@services/AddressService';
import { GREEN_COLOR, NEUTRAL_50 } from '@types';

import { formatDistanceAway } from './utils';

type DeliveryWithCoolerBags = Delivery & {
  coolerBagsReturned?: number;
  unreturnedCoolerBags?: number;
  shouldReturnBag?: boolean;
};

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
    variant = (item?.coolerBagsReturned ?? 0) === unreturnedCoolerBags ? 'green' : 'orange';
  }
  return {
    count: compiledCount,
    variant,
    shouldShowBadge: (item?.coolerBagsReturned ?? 0) > 0 ? true : unreturnedCoolerBags > 0
  };
};

interface DeliveryCardProps {
  delivery: DeliveryWithCoolerBags;
  distanceMeters?: number;
  onStartDelivery?: () => void;
  showButton?: boolean;
  searchText?: string;
  selectedTab?: number;
  setSelectedDelivery?: (value: Delivery) => void;
  onPressDelivered: () => void;
  onOpenActionModal: () => void;
  coolerBagModalRef?: React.RefObject<BottomSheetRef>;
  onOpenDriverImages?: (delivery: Delivery) => void;
  onOpenWhatsApp?: (delivery: Delivery) => void;
  isLoading: boolean;
  shiftAction?: RouteItemAction[] | undefined;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  distanceMeters,
  onStartDelivery,
  showButton = true,
  searchText = '',
  selectedTab = 0,
  onPressDelivered,
  onOpenActionModal,
  coolerBagModalRef,
  onOpenDriverImages,
  onOpenWhatsApp,
  isLoading,
  shiftAction
}) => {
  const openDriverImagesPreviewBottomSheet = onOpenDriverImages || (() => {});

  const openLocationOnNativeMap = (item: Delivery) => {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${item.deliveryAddress.lat},${item.deliveryAddress.lng}&dir_action=navigate&travelmode=driving`
    );
  };

  const handleCallUser = (phoneNumber: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const getInstructionText = (instructionType: DeliveryInstruction) => {
    switch (instructionType) {
      case DeliveryInstruction.RING_MY_DOORBELL:
        return '🛎️ Ring doorbell';
      case DeliveryInstruction.LEAVE_AT_THE_DOOR:
        return '🚪 Leave at door';
      case DeliveryInstruction.LEAVE_AT_RECEPTION:
        return '🛎️ Leave at reception';
      case DeliveryInstruction.CALL_ME_WHEN_YOU_REACH:
        return '📞 Call on arrival';
      default:
        return '';
    }
  };

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

  const highlightedText = (text: string, baseStyle: StyleProp<TextStyle>) => {
    if (!searchText.trim() || typeof text !== 'string') {
      return text;
    }
    const regex = new RegExp(`(${searchText?.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, index) =>
      regex.test(part) ? (
        <Text key={index} style={[baseStyle, { textDecorationLine: 'underline', color: colors.yellow[500], fontWeight: '900' }]}>
          {part}
        </Text>
      ) : (
        <Text key={index} style={baseStyle}>
          {part}
        </Text>
      )
    );
  };

  const formattedAddress = AddressService.displayV2(delivery.deliveryAddress as NewDeliveryAddress);

  const isDelivered = delivery.deliveryStatus === DDeliveryStatus.delivered;
  const isPicked = delivery.deliveryStatus;

  const {
    shouldShowBadge: shouldShowCoolerBagBadge,
    variant: coolerBagVariant,
    count: coolerBagCount
  } = getCoolerBagBadge(delivery);

  // Format ETA for display
  const formatEtaRange = () => {
    if (!delivery.eta) return '';
    return formatTime(delivery.eta);
  };

  // Collapsible name state
  const [showName, setShowName] = useState(false);

  const showDeliveryTime = delivery.time && delivery.deliveryAddress.country?.includes('GB');

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={() => {}} style={styles.card}>
      <View style={styles.content}>
        {/* Top Row: Short ID, optional time, optional distance, Contact Icons */}
        <View style={styles.topRow}>
          <View style={styles.leftSection}>
            <View style={styles.shortIdField}>
              <Text style={styles.shortIdText}>{highlightedText(delivery.shortId || '', styles.shortIdText)}</Text>
            </View>
            {showDeliveryTime ? (
              <View style={styles.deliveryTimeField}>
                <Text style={styles.deliveryTimeText}>{delivery.time}</Text>
              </View>
            ) : null}
            {distanceMeters !== null && distanceMeters !== undefined && distanceMeters >= 0 && isPicked ? (
              <View style={styles.distanceField}>
                <Text style={styles.distanceText} numberOfLines={1}>
                  {formatDistanceAway(distanceMeters)}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.contactIcons}>
            <TouchableOpacity onPress={() => onOpenWhatsApp?.(delivery)} style={styles.contactIcon} activeOpacity={0.8}>
              <MaterialCommunityIcons name="whatsapp" size={18} color={GREEN_COLOR} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openLocationOnNativeMap(delivery)}
              style={[styles.contactIcon, styles.navIcon]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="navigation-variant-outline" size={18} color={colors.system.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Name Section */}
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <View style={styles.nameLeftSection}>
              <TouchableOpacity onPress={() => setShowName(!showName)} activeOpacity={0.7} style={styles.toggleNameButton}>
                <Text style={styles.toggleNameText}>{showName ? 'Hide name' : 'Show name'}</Text>
              </TouchableOpacity>
              {showName && (
                <Text style={[styles.nameText, { marginLeft: 8 }]}>{highlightedText(delivery.name || '', styles.nameText)}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleCallUser(delivery.phoneNumber || '')} activeOpacity={0.7}>
              <Text style={[styles.nameText, { fontSize: 16 }]}>
                {highlightedText(delivery.phoneNumber || '', styles.nameText)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pending Status Row */}
          <View
            style={{
              display:
                delivery.deliveryStatus !== DDeliveryStatus.delivered && selectedTab === 1 && shiftAction ? 'flex' : 'none',
              marginTop: 6
            }}
          >
            <Text style={styles.pendingStatusText}>
              {shiftAction && handlePendingStatusText(shiftAction[shiftAction.length - 1]?.type)}
            </Text>
          </View>
        </View>

        {/* Address Field */}
        <View style={styles.addressField}>
          <Text style={styles.addressText}>{highlightedText(formattedAddress, styles.addressText)}</Text>
        </View>

        {/* Driver Notes Section */}

        {delivery.deliveryAddress?.driverNote && (
          <View style={styles.noteField}>
            <View style={styles.noteIconContainer}>
              <Icon name="local-shipping" size={16} color={colors.grey[700]} />
            </View>
            <View style={styles.noteContent}>
              <Text style={styles.noteText}>{delivery.deliveryAddress.driverNote}</Text>
            </View>
          </View>
        )}

        {((delivery.deliveryAddress?.deliveryInstructions && delivery.deliveryAddress.deliveryInstructions.length > 0) ||
          delivery.deliveryAddress?.notes) && (
          <View style={styles.noteField}>
            <View style={styles.noteIconContainer}>
              <Icon name="info-outline" size={16} color={colors.grey[700]} />
            </View>
            <View style={styles.noteContent}>
              {delivery.deliveryAddress?.deliveryInstructions && delivery.deliveryAddress.deliveryInstructions.length > 0 && (
                <Text style={styles.noteText}>
                  {delivery.deliveryAddress.deliveryInstructions
                    .map((instruction) => getInstructionText(instruction))
                    .join(' • ')}
                </Text>
              )}
              {delivery.deliveryAddress?.notes && (
                <Text
                  style={[
                    styles.noteText,
                    delivery.deliveryAddress?.deliveryInstructions &&
                      delivery.deliveryAddress.deliveryInstructions.length > 0 && { marginTop: 4 }
                  ]}
                >
                  {delivery.deliveryAddress.notes}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Action Row: Bags + Driver Images + Contact Icons */}
        <View style={styles.actionRow}>
          {/* Cooler Bag WarningBadge */}
          <View style={styles.bagSection}>
            {shouldShowCoolerBagBadge && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (coolerBagModalRef?.current) {
                    coolerBagModalRef.current.open();
                  }
                }}
              >
                <WarningBadge count={coolerBagCount} label="bags" variant={coolerBagVariant} />
              </TouchableOpacity>
            )}
          </View>

          {/* Driver Images */}
          {delivery.deliveryAddress?.driverImages && delivery.deliveryAddress.driverImages.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openDriverImagesPreviewBottomSheet(delivery)}
              style={styles.driverImagesContainer}
            >
              {(delivery.deliveryAddress.driverImages || []).slice(0, 1).map((image, index) => (
                <Image
                  key={`${image.replace('undefined', '')}-${index}`}
                  style={styles.driverImagePreview}
                  source={{
                    uri: `${Config.REACT_NATIVE_BUCKET_URL}${image.replace('undefined', '')}/square@1x.jpg`
                  }}
                />
              ))}
              {delivery.deliveryAddress.driverImages.length > 1 && (
                <View style={styles.moreImagesOverlay}>
                  <Text style={styles.moreImagesText}>+{delivery.deliveryAddress.driverImages.length - 1}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* ETA */}
          {delivery.eta && <Text style={styles.etaText}>{formatEtaRange()}</Text>}
        </View>

        {/* Start Delivery Button */}
        {showButton && onStartDelivery && !isPicked && (
          <View style={styles.buttonContainer}>
            <Button
              type="contained"
              buttonText={'Pick for delivery'}
              onButtonPress={onStartDelivery}
              disabled={isLoading}
              loading={isLoading}
              customButtonStyle={styles.button}
              customTextStyle={[styles.buttonText, { textTransform: 'uppercase' }]}
            />
          </View>
        )}

        {isPicked && (
          <View style={styles.actionButtonsRow}>
            <Button
              customButtonStyle={[
                styles.actionButtonStyle,
                { width: isDelivered ? '100%' : '48%', display: selectedTab === 1 ? 'none' : 'flex' }
              ]}
              customTextStyle={styles.actionButtonText}
              onButtonPress={onOpenActionModal}
              buttonText="Actions"
              type="outlined"
            />
            <Button
              customTextStyle={styles.actionButtonText}
              customButtonStyle={[
                styles.actionButtonStyle,
                {
                  width: selectedTab === 1 ? '100%' : '48%',
                  display: delivery.deliveryStatus === DDeliveryStatus.delivered ? 'none' : 'flex',
                  marginLeft: selectedTab === 1 ? 0 : 12
                }
              ]}
              onButtonPress={onPressDelivered}
              buttonText="Delivered"
              type="outlined"
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.system.white,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.grey[100],
    overflow: 'hidden',
    position: 'relative'
  },
  content: {
    padding: 12
  },
  // Top Row: Short ID and ETA
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  shortIdField: {
    borderWidth: 1,
    borderColor: colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 80,
    backgroundColor: colors.grey[50]
  },
  shortIdText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.caloGreen[600],
    letterSpacing: 0.2
  },
  deliveryTimeField: {
    borderWidth: 1,
    borderColor: colors.blue[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.blue[50]
  },
  deliveryTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.blue[700],
    letterSpacing: 0.2,
    textTransform: 'capitalize'
  },
  distanceField: {
    borderWidth: 1,
    borderColor: colors.caloGreen[300],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.caloGreen[50],
    maxWidth: 100
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.caloGreen[800],
    letterSpacing: 0.1
  },
  etaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.blue[600],
    letterSpacing: 0.1
  },
  // Name Section
  nameSection: {
    marginBottom: 8
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  nameLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  nameRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  nameText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.grey[900],
    letterSpacing: 0.1
  },
  pendingStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.orange[700],
    letterSpacing: 0.1
  },
  // Address Field
  addressField: {
    borderWidth: 1,
    borderColor: colors.grey[200],
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    minHeight: 44,
    backgroundColor: colors.grey[50]
  },
  addressText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.grey[800],
    lineHeight: 16,
    letterSpacing: 0.1
  },
  // Note Fields
  noteField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.grey[200],
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
    backgroundColor: colors.grey[50]
  },
  noteIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.system.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.grey[200]
  },
  noteContent: {
    flex: 1,
    paddingTop: 1
  },
  noteText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.grey[800],
    lineHeight: 16,
    letterSpacing: 0.1
  },
  // Action Row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 2
  },
  bagSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  bagIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.grey[200]
  },
  bagButton: {
    backgroundColor: '#FF9EB5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#FF9EB5',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  bagButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.system.white,
    letterSpacing: 0.3
  },
  contactIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.grey[200]
  },
  navIcon: {
    backgroundColor: colors.blue[600],
    borderColor: colors.blue[700]
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[100]
  },
  shortIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  shortIdBadge: {
    backgroundColor: colors.caloGreen[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.caloGreen[200]
  },
  priorityBadge: {
    backgroundColor: colors.orange[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.orange[700]
  },
  coolerBagIcon: {
    backgroundColor: colors.grey[100],
    padding: 6,
    borderRadius: 8
  },
  coolerBagBadgeHeader: {
    marginLeft: 8
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center'
  },
  navButton: {
    backgroundColor: colors.caloGreen[500]
  },
  driverNoteCard: {
    backgroundColor: colors.alert[50],
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.alert[400]
  },
  driverNoteLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.alert[600],
    lineHeight: 20
  },
  driverNoteText: {
    fontSize: 14,
    color: colors.grey[800],
    lineHeight: 20,
    flexWrap: 'wrap',
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[100]
  },
  headerLeft: {
    flex: 1
  },
  etaContainer: {
    marginLeft: 12
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6
  },
  labelIcon: {
    marginRight: 4
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.grey[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  labelActive: {
    color: colors.caloGreen[600]
  },
  stopBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.caloGreen[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.caloGreen[500],
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  stopBadgeActive: {
    backgroundColor: colors.caloGreen[500]
  },
  stopBadgeInactive: {
    backgroundColor: colors.grey[400],
    shadowOpacity: 0,
    elevation: 0
  },
  stopNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.system.white
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[100]
  },
  customerIcon: {
    marginRight: 12,
    backgroundColor: colors.caloGreen[50],
    padding: 8,
    borderRadius: 12
  },
  customerInfo: {
    flex: 1
  },
  customerName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.grey[900],
    letterSpacing: -0.3
  },
  customerNameFull: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.grey[600],
    marginTop: 4
  },
  contactSection: {
    marginBottom: 16,
    gap: 8
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.grey[600],
    marginLeft: 6
  },
  phoneNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blue[600]
  },
  addressContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.grey[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.grey[100]
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.grey[600],
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  address: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.grey[800],
    lineHeight: 22,
    marginTop: 4
  },
  pendingStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange[50],
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.orange[200]
  },
  pendingAmountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange[50],
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.orange[200]
  },
  pendingAmountLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.orange[700],
    marginLeft: 8
  },
  pendingAmountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey[900]
  },
  coolerBagBadgeContainer: {
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 20,
    backgroundColor: colors.caloGreen[50],
    borderRadius: 20,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.caloGreen[100]
  },
  infoItem: {
    flex: 1,
    alignItems: 'center'
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.system.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.grey[600],
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  infoValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.grey[900],
    letterSpacing: -0.5
  },
  infoDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.caloGreen[200],
    marginHorizontal: 20
  },
  toggleNameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  toggleNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.caloGreen[600],
    marginRight: 4
  },
  instructionsCard: {
    backgroundColor: NEUTRAL_50,
    borderRadius: 6,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginHorizontal: 0,
    marginVertical: 4
  },
  instructionsContent: {
    marginTop: 0
  },
  instructionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  instructionBox: {
    backgroundColor: colors.grey[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.grey[200]
  },
  instructionText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    color: colors.grey[800]
  },
  noteSection: {
    marginTop: 8
  },
  driverImagesCard: {
    backgroundColor: colors.grey[50],
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.grey[200],
    overflow: 'hidden'
  },
  driverImagesContent: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  previewImageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.grey[200]
  },
  buttonContainer: {
    marginTop: 4
  },
  button: {
    height: 44,
    borderRadius: 12,
    shadowColor: colors.caloGreen[600],
    shadowOffset: {
      width: 0,
      height: 3
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  pickButton: {
    height: 48,
    borderRadius: 14
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8
  },
  actionButtonStyle: {
    height: 44,
    borderRadius: 12
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700'
  },
  // Compact styles for collapsed view
  customerSectionCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[100]
  },
  customerIconCompact: {
    marginRight: 8,
    backgroundColor: colors.caloGreen[50],
    padding: 5,
    borderRadius: 8
  },
  customerInfoCompact: {
    flex: 1
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  nameToggleContainer: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center'
  },
  customerNameCompact: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.grey[900],
    letterSpacing: -0.2
  },
  customerActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  customerActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2
  },
  navIconButton: {
    backgroundColor: colors.caloGreen[500]
  },
  contactDivider: {
    fontSize: 11,
    color: colors.grey[400],
    marginHorizontal: 3
  },
  etaTextCompact: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.grey[700],
    marginLeft: 3
  },
  addressContainerCompact: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: colors.grey[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.grey[100]
  },
  addressRowCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  addressCompact: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.grey[800],
    lineHeight: 16,
    marginLeft: 5,
    flex: 1
  },
  etaDisplay: {
    marginBottom: 8,
    paddingVertical: 4
  },
  etaDisplayText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.grey[900]
  },
  infoRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.caloGreen[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.caloGreen[100],
    flexWrap: 'wrap',
    gap: 6
  },
  infoItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  infoValueCompact: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.grey[900]
  },
  infoDividerCompact: {
    width: 1,
    height: 20,
    backgroundColor: colors.caloGreen[200]
  },
  pendingStatusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange[50],
    padding: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.orange[200]
  },
  pendingStatusTextInline: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.orange[700],
    marginLeft: 5
  },
  driverImagesCompact: {
    marginBottom: 8
  },
  previewImageContainerCompact: {
    flexDirection: 'row',
    gap: 5,
    position: 'relative'
  },
  previewImageCompact: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: colors.grey[200]
  },
  moreImagesBadge: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: colors.grey[800],
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8
  },
  moreImagesText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.system.white
  },
  // Driver Images Container
  driverImagesContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    position: 'relative'
  },
  driverImagePreview: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.grey[200],
    borderWidth: 1,
    borderColor: colors.grey[300]
  },
  moreImagesOverlay: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.grey[900],
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
    borderWidth: 1,
    borderColor: colors.grey[300]
  }
});

export default DeliveryCard;
