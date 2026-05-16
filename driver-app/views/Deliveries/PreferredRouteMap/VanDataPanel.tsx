import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Divider, Input, Text } from '@ui-kitten/components';
import { capitalize } from 'lodash-es';

import { DeliveryTime } from '@lib/enums';

import Button from '../../../components/Button';
import { GREEN_COLOR } from '../../../types/constants';
import { VanData } from '../../../types/interfaces';

interface VanDataPanelProps {
  currentDriver: string;
  deliveryTime: DeliveryTime;
  vanData: VanData;
  setVanData: (state: VanData) => void;
  totalDeliveries: number;
  onPressDone: () => void;
  isShiftLoading: boolean;
}

const VanDataPanel = ({
  currentDriver,
  deliveryTime,
  setVanData,
  totalDeliveries,
  vanData,
  onPressDone,
  isShiftLoading
}: VanDataPanelProps) => {
  const updateData = (data: Partial<VanData>) => {
    setVanData({
      ...vanData,
      ...data
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.driverSection]}>
        <Text style={{ fontSize: 16 }}> Hi, {currentDriver}</Text>
        <Text style={styles.deliveryTime}>{capitalize(deliveryTime)}</Text>
      </View>
      <Divider />
      <View style={styles.body}>
        <View style={[styles.row, styles.totalDeliveriesSection]}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Total deliveries</Text>
          <Text style={{ fontSize: 27, fontWeight: 'bold' }}>{totalDeliveries}</Text>
        </View>
        <View style={styles.inputSection}>
          <Text category="h6" style={{ paddingVertical: 12 }}>
            Number of Bags in Van:
          </Text>
          <Input
            value={vanData.bags}
            size="large"
            placeholder="Please enter number of loaded bags"
            placeholderTextColor="#d9d9d9"
            onChangeText={(nextValue) => updateData({ bags: nextValue })}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.inputSection}>
          <Text category="h6" style={{ paddingVertical: 12 }}>
            Van Temperature:
          </Text>
          <Input
            value={vanData.temp}
            placeholder="Please enter van temperature"
            placeholderTextColor="#d9d9d9"
            size="large"
            onChangeText={(nextValue) => updateData({ temp: nextValue })}
            keyboardType="numeric"
          />
        </View>
        <View style={{ opacity: !vanData.bags || !vanData.temp ? 0.3 : 1 }}>
          <Button
            onButtonPress={onPressDone}
            buttonText="Done"
            type="success"
            customTextStyle={{ color: 'white', fontSize: 18 }}
            disabled={!vanData.bags || !vanData.temp || isShiftLoading}
            loading={isShiftLoading}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  body: {
    padding: 16,
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  driverSection: {
    height: 70,
    paddingHorizontal: 15,
    marginTop: 10
  },
  totalDeliveriesSection: {
    padding: 10,
    backgroundColor: '#F7F7F7',
    borderRadius: 5,
    marginBottom: 15
  },
  inputSection: {
    paddingBottom: 21
  },
  deliveryTime: {
    fontSize: 20,
    textAlignVertical: 'center',
    color: GREEN_COLOR,
    borderColor: GREEN_COLOR,
    borderRadius: 10,
    borderWidth: 1,
    height: 50,
    paddingHorizontal: 15,
    margin: 5
  }
});

export default VanDataPanel;
