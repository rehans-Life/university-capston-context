import React, { useContext } from 'react';
import { Linking, TouchableOpacity, View } from 'react-native';

import { Text } from '@ui-kitten/components';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { Delivery } from '@calo/driver-types';

import { GREEN_COLOR } from '../../../types/constants';
import DeliveryContext from '../DeliveryContext';

import { styles } from './Styles';

interface DeliveryContactProps {
  item: Delivery;
}

const DeliveryContact = ({ item }: DeliveryContactProps) => {
  const { openWhatsAppOptions } = useContext(DeliveryContext);

  const openLocationOnNativeMap = (delivery: Delivery) => {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${delivery.deliveryAddress.lat},${delivery.deliveryAddress.lng}&dir_action=navigate&travelmode=driving`
    );
  };

  return (
    <View
      style={{
        alignContent: 'flex-end',
        justifyContent: 'flex-end',
        flexDirection: 'row',
        paddingRight: 12
      }}
    >
      <TouchableOpacity onPress={() => openWhatsAppOptions(item)}>
        <Text style={styles.whatsappButton}>
          <MaterialCommunityIcons name="whatsapp" size={24} color={GREEN_COLOR} />
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          openLocationOnNativeMap(item);
        }}
      >
        <Text style={styles.navigatorButton}>
          <MaterialCommunityIcons name="navigation-variant-outline" size={24} color={'white'} />
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default DeliveryContact;
