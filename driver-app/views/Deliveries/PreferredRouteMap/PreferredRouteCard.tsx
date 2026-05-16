import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { Text } from '@ui-kitten/components';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AddressService from '@services/AddressService';

import { default as theme } from '../../../../custom-theme.json';
import { GREEN_COLOR, RED_COLOR } from '../../../types/constants';
import { DeliveriesGroupForPreferredRoute } from '../../../types/interfaces';

interface PreferredRouteCardProps {
  group: DeliveriesGroupForPreferredRoute;
  bufferTime: number;
  setBufferTime: (group: DeliveriesGroupForPreferredRoute, value: number) => void;
}

const PreferredRouteCard = ({ group, bufferTime, setBufferTime }: PreferredRouteCardProps) => {
  const item = group.deliveries[0];
  const brand = item.shortId.charAt(0) === 'M' ? 'MEALO' : 'CALO';

  const formatedAddress = AddressService.displayV2(item.deliveryAddress);

  const renderBufferTimeIconText = () => {
    if (bufferTime === 30) {
      return 'High building';
    }
    if (bufferTime === 15) {
      return 'Hotel';
    }
    if (bufferTime === 5) {
      return 'Parking';
    }
    return '';
  };
  return (
    <>
      <View style={styles.item}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 5,
            flexDirection: 'row',
            justifyContent: 'space-between'
          }}
        >
          <Text
            category={'h5'}
            style={{
              fontFamily: 'Bebas Neue',
              color: brand === 'MEALO' ? '#FF9900' : '#57AE7F',
              fontWeight: 'bold'
            }}
          >
            {brand}
          </Text>
          <Text>{group.count > 1 ? `+${group.count - 1} more deliveries` : ''}</Text>
          {group.priority ? (
            <Text
              category={'h6'}
              style={{
                fontFamily: 'Lato-Bold',
                backgroundColor: group.priority ? '#CDE7D9' : RED_COLOR,
                borderRadius: 50,
                height: 40,
                width: 40,
                textAlign: 'center',
                textAlignVertical: 'center',
                fontSize: 20
              }}
            >
              {group.priority}
            </Text>
          ) : (
            <Text />
          )}
        </View>
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <View style={{ width: '70%' }}>
            <View style={{ paddingLeft: 16, paddingTop: 5 }}>
              <Text
                category={'h5'}
                style={{
                  fontFamily: 'Lato-Bold'
                }}
              >
                {item.shortId}
              </Text>
              <Text
                category={'h6'}
                style={{
                  fontFamily: 'Lato-Bold'
                }}
              >
                {item.name}
              </Text>
            </View>
            <View style={{ paddingHorizontal: 16 }}>
              <View style={styles.rowBlock}>
                <Text category={'p1'} style={{ maxWidth: '75%', color: theme['color-basic-600'] }}>
                  <Text category={'p1'} style={{ fontWeight: '700', color: 'black' }}>
                    Address:{' '}
                  </Text>
                  {formatedAddress}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ width: '30%', marginTop: 10 }}>
            <View style={styles.bufferTimeSection}>
              <TouchableOpacity
                onPressIn={() => setBufferTime(group, bufferTime === 30 ? 0 : 30)}
                style={{ paddingHorizontal: 10, marginRight: 2 }}
              >
                <FontAwesome5
                  name="building"
                  size={bufferTime === 30 ? 28 : 22}
                  style={{
                    marginTop: 2,
                    color: bufferTime === 30 ? GREEN_COLOR : 'grey'
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPressIn={() => setBufferTime(group, bufferTime === 15 ? 0 : 15)}
                style={{ paddingHorizontal: 10, marginRight: 2 }}
              >
                <FontAwesome5
                  name="hotel"
                  size={bufferTime === 15 ? 28 : 22}
                  style={{
                    marginTop: 2,
                    color: bufferTime === 15 ? GREEN_COLOR : 'grey'
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity onPressIn={() => setBufferTime(group, bufferTime === 5 ? 0 : 5)} style={{ paddingHorizontal: 6 }}>
                <MaterialCommunityIcons
                  name="parking"
                  size={bufferTime === 5 ? 32 : 25}
                  style={{
                    marginTop: 2,
                    color: bufferTime === 5 ? GREEN_COLOR : 'grey'
                  }}
                />
              </TouchableOpacity>
            </View>
            {bufferTime > 0 && (
              <Text style={styles.bufferTimeText}>
                ({renderBufferTimeIconText()}) This will add {bufferTime} minutes to ETA for this group of deliveries
              </Text>
            )}
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  item: {
    marginVertical: 8,
    paddingBottom: 6,
    borderRadius: 5
  },
  rowBlock: {
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  bufferTimeSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignContent: 'center'
  },
  bufferTimeText: {
    color: 'red',
    fontSize: 12,
    paddingTop: 5,
    alignSelf: 'center',
    textAlign: 'center'
  }
});

export default PreferredRouteCard;
