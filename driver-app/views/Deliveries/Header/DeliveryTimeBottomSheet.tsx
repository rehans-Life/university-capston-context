import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { TouchableOpacity } from 'react-native-gesture-handler';

import { Kitchen } from '@calo/types';
import { Button } from '@components';
import { BottomSheet, BottomSheetRef } from '@components/BottomSheet';
import Radio from '@components/Radio/Radio';
import useCurrentUser from '@hooks/useCurrentUser';
import { useRemoteConfig } from '@hooks/useRemoteConfig';
import { DeliveryTime } from '@lib/enums';

import { SunRiseIcon, SunIcon, MoonIcon } from '../../../icons';

interface DeliveryTimeBottomSheetProps {
  modalRef: React.RefObject<BottomSheetRef>;
  selectedDeliveryTime: DeliveryTime;
  onSelectDeliveryTime: (deliveryTime: DeliveryTime) => void;
}

const mapIconToDeliveryTime = (deliveryTime: DeliveryTime) => {
  switch (deliveryTime) {
    case DeliveryTime.morning:
      return <SunIcon />;
    case DeliveryTime.evening:
      return <MoonIcon />;
    case DeliveryTime.earlyMorning:
      return <SunRiseIcon />;
    default:
      return <SunIcon />;
  }
};

const DeliveryTimeBottomSheet = ({ modalRef, selectedDeliveryTime, onSelectDeliveryTime }: DeliveryTimeBottomSheetProps) => {
  const { country, kitchen } = useCurrentUser();
  const { deliveryTimeSlots } = useRemoteConfig(kitchen as Kitchen);

  const [selectedTime, setSelectedTime] = useState(selectedDeliveryTime);
  const handleSave = () => {
    onSelectDeliveryTime(selectedTime);
    modalRef.current?.close();
  };

  useEffect(() => {
    if (selectedTime === DeliveryTime.morning && country === 'GB') {
      setSelectedTime(DeliveryTime.earlyMorning);
    }
  }, [country, selectedTime]);

  const timeText = useCallback(
    (time: DeliveryTime) => {
      if (country === 'GB') {
        switch (time) {
          case DeliveryTime.earlyMorning:
            return 'Overnight (10:30 PM - 6 AM)';
          case DeliveryTime.evening:
            return 'Evening (6 PM - 10:30 PM)';
          default:
            return 'Morning';
        }
      } else {
        switch (time) {
          case DeliveryTime.earlyMorning:
            return 'Early Morning (3 AM - 6 AM)';
          case DeliveryTime.morning:
            return 'Morning (7 AM - 11 AM)';
          case DeliveryTime.evening:
            return 'Evening (6 PM - 10 PM)';
          default:
            return 'Morning';
        }
      }
    },
    [country]
  );

  const deliveryTimes = useMemo(() => {
    return deliveryTimeSlots.filter((slotConfig) => slotConfig.enabled).map((slotConfig) => slotConfig.slot);
  }, [deliveryTimeSlots]);

  return (
    <BottomSheet
      ref={modalRef}
      dynamicHeight
      includeTitleSection
      displayCustomHandle
      onClose={() => {
        modalRef.current?.close();
      }}
      enablePanDownToClose
      includeCloseButton
      isBackdropRendered
      closeButtonProps={{ color: 'black' }}
      titleProps={{
        title: 'Switch shift time',
        titleStyle: {
          fontSize: 24,
          fontFamily: 'Lato-Bold',
          textTransform: 'none',
          marginTop: 10,
          marginLeft: 5
        }
      }}
      style={{ borderRadius: 28, overflow: 'hidden' }}
    >
      <View style={styles.optionsContainer}>
        {deliveryTimes.map((time) => (
          <TouchableOpacity
            key={time}
            style={[styles.optionButton, selectedTime === time && styles.selectedOptionButton]}
            onPress={() => setSelectedTime(time)}
          >
            <Radio
              size="small"
              isSelected={selectedTime === time}
              isDisabled={false}
              style={{ marginLeft: 20, marginVertical: 12 }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginLeft: 10 }}>
              {mapIconToDeliveryTime(time)}
              <Text style={styles.optionText}>{timeText(time)}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <Button
          customButtonStyle={{ marginTop: 12, marginBottom: 30 }}
          customTextStyle={{ fontWeight: '600' }}
          onButtonPress={handleSave}
          buttonText="Save changes"
          type="contained"
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    paddingHorizontal: 10,
    marginTop: 10
  },
  optionButton: {
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    borderColor: '#D3D3D3',
    width: '100%'
  },
  selectedOptionButton: {
    borderColor: '#24A170',
    backgroundColor: '#EAF7F2'
  },
  optionText: {
    fontSize: 16,
    marginLeft: 15,
    fontWeight: '500',
    lineHeight: 24
  },
  bottomSheetContainer: {
    zIndex: 1000
  }
});

export default DeliveryTimeBottomSheet;
