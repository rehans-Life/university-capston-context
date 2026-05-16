import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Linking } from 'react-native';

import { Text } from '@ui-kitten/components';
import { parsePhoneNumber } from 'libphonenumber-js';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { Delivery } from '@calo/driver-types';
import BottomSheet, { BottomSheetRef } from '@components/BottomSheet/BottomSheet';
import { handleErrorCheck } from '@helpers';

import { whatsappBottomSheetStyles } from '../styles';

interface WhatsAppOptionsSheetProps {
  isVisible: boolean;
  onClose: () => void;
  item: Delivery | null;
}

const messages = [
  {
    title: 'Ask for pin location',
    en: 'Hello there, this is the driver from Calo 👋 Can you kindly share your location? 🙏💚',
    ar: 'هلا والله, معاك السايق من كالو 👋 حبيت اتأكد من موقع التوصيل 💚🙏'
  },
  {
    title: 'Arrived at location',
    en: 'Hello there, this is the driver from Calo 👋 I have arrived at your location and I am waiting for you outside to deliver your meals 🙏💚',
    ar: 'هلا والله, معاك السايق من كالو 👋 وصلت إلى موقعك و أنتظرك خارج المبنى لتسليم وجباتك 💚🙏'
  },
  {
    title: 'Left meals at door',
    en: 'Hello there, this is the driver from Calo 👋 I kept your meals at the door as requested 🙏💚',
    ar: 'هلا والله, معاك السايق من كالو 👋 تركت وجباتك عند الباب مثل ما طلبت 💚🙏'
  },
  {
    title: 'Left meals at reception',
    en: 'Hello there, this is the driver from Calo 👋 I kept your meals at the reception as requested 🙏💚',
    ar: 'هلا والله, معاك السايق من كالو 👋 تركت وجباتك عند الاستقبال مثل ما طلبت 💚🙏'
  },
  {
    title: 'Could not reach you',
    en: 'Hello there, this is the driver from Calo 👋 I attempted to contact you regarding your delivery but I could not reach you 🙏💚',
    ar: 'هلا والله, معاك السايق من كالو 👋 حاولنا نتواصل معاك بخصوص توصيل وجباتك لكن ما قدرنا نوصل لك 💚🙏'
  }
];

const getMessageOptions = (country: string) => {
  const isUK = country.includes('GB');

  return messages.map(({ title, en, ar }) => ({ title, message: isUK ? en : `${en}\n\n${ar}` }));
};

const WhatsAppOptionsSheet: React.FC<WhatsAppOptionsSheetProps> = ({ isVisible, onClose, item }) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  let country = '';
  if (item) {
    try {
      country = item.deliveryAddress.country ?? parsePhoneNumber(item.phoneNumber).country;
    } catch {
      country = '';
    }
  }
  const options = getMessageOptions(country);

  const openWhatsApp = (message: string) => {
    if (!item) {
      return;
    }
    const phoneNumber = item.phoneNumber;
    const encodedMessage = encodeURIComponent(message);
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
    Linking.openURL(url).catch((error: unknown) => handleErrorCheck(error, 'Error opening WhatsApp', true));
    onClose();
  };

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.open();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      dynamicHeight
      onClose={onClose}
      displayCustomHandle
      includeTitleSection
      includeCloseButton
      onChange={(index: number) => {
        if (index === -1) {
          onClose();
        }
      }}
      titleProps={{
        title: `Chat with ${item?.name}`,
        titleStyle: whatsappBottomSheetStyles.titleStyle
      }}
      closeButtonProps={{
        onPressCloseButton: onClose
      }}
    >
      <View style={whatsappBottomSheetStyles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              whatsappBottomSheetStyles.optionButton,
              index === options.length - 1 && whatsappBottomSheetStyles.lastOptionButton
            ]}
            onPress={() => openWhatsApp(option.message)}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Text style={whatsappBottomSheetStyles.optionText}>{option.title}</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={'grey'} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
};

export default WhatsAppOptionsSheet;
