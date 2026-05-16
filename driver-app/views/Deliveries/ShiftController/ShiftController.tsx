import React, { useState } from 'react';
import { Dimensions, StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';

import { format } from 'date-fns/fp';
import { getDistance } from 'geolib';

import { DriverMetrics, ShiftActions, ShiftActionType } from '@calo/driver-types';
import { getCurPos, clearOldData } from '@helpers';
import useCurrentUser from '@hooks/useCurrentUser';

import { Button, PopUp } from '../../../components';
import { GREEN_COLOR } from '../../../types/constants';

interface ShiftControllerProps {
  driverName: string;
  visible: boolean;
  shift: DriverMetrics | undefined;
  handleUpdateShift: (action: ShiftActions) => Promise<void>;
  snapPointIndex: number;
  isLoadingDeliveries: boolean;
  selectPreferredRoute: () => void;
}

const renderDots = () => {
  return (
    <View>
      <View style={{ ...styles.dot, marginVertical: 7 }} />
      <View style={styles.dot} />
      <View style={{ ...styles.dot, marginBottom: 7 }} />
      <View style={styles.dot} />
      <View style={{ ...styles.dot, marginBottom: 7 }} />
      <View style={styles.dot} />
      <View style={{ ...styles.dot, marginBottom: 7 }} />
      <View style={styles.dot} />
    </View>
  );
};

const buttonImage = () => (
  <Image
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- React Native image asset
    source={require('../../../images/Check-icon.png')}
    style={{ width: 20, height: 20, tintColor: 'white', marginRight: 10 }}
  />
);

const ShiftController = ({
  driverName,
  visible,
  shift,
  handleUpdateShift,
  snapPointIndex,
  selectPreferredRoute,
  isLoadingDeliveries
}: ShiftControllerProps) => {
  const currentDriver = useCurrentUser();
  const snapPointFractions: number[] = [1, 0.75, 0.5]; // 100%, 75%, 50%
  const [isMinimized, setIsMinimized] = useState(false);
  const [kitchenModal, setKitchenModal] = useState(false);
  const [distance, setDistance] = useState<number>(0);
  const [confirmPressed, setConfirmPressed] = useState<boolean>(false);

  const getTime = (type: ShiftActionType) => {
    if (shift) {
      const index = shift?.driverActions.findIndex((t) => t.type === type);
      if (index !== -1) {
        return format('HH:mm')(Date.parse(shift.driverActions[index].time));
      }
      return '--:--';
    }
    return '--:--';
  };

  const handleStartShift = async () => {
    setConfirmPressed(true);

    try {
      await clearOldData(currentDriver.id);
      await handleUpdateShift({
        type: ShiftActionType.STARTED_SHIFT,
        time: new Date().toISOString(),
        distance
      });
      if (kitchenModal) {
        setKitchenModal(false);
      }
    } catch {
      setConfirmPressed(false);
    }
  };
  const startShift = async () => {
    let distanceFromKitchen = 0;
    try {
      const pos = await getCurPos();
      if (shift && shift.kitchenPosition) {
        distanceFromKitchen = getDistance(pos, {
          latitude: shift.kitchenPosition.lat,
          longitude: shift.kitchenPosition.lng
        });
      }
      setDistance(distanceFromKitchen);
    } catch {
      distanceFromKitchen = -1;
    }
    setDistance(distanceFromKitchen);
    //if in 100m radius from kitchen continue
    if (distanceFromKitchen < 100 && distanceFromKitchen !== -1) {
      handleStartShift();
      return;
    }
    setKitchenModal(true);
  };

  if (visible) {
    const { height: windowHeight } = Dimensions.get('window');
    const topFraction = isMinimized ? 0.94 : snapPointFractions[snapPointIndex] ?? 1;
    const bottomFraction = isMinimized ? 0.94 : snapPointFractions[snapPointIndex] ?? 1;

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setIsMinimized(!isMinimized)}
        style={{
          position: 'absolute',
          top: windowHeight * topFraction,
          right: 0,
          left: 0,
          zIndex: 0,
          bottom: -windowHeight * bottomFraction,
          borderRadius: 25
        }}
      >
        <View style={styles.container}>
          {kitchenModal && (
            <PopUp
              visible={kitchenModal}
              cancelPress={() => setKitchenModal(false)}
              confirmPress={() => handleStartShift()}
              customButton={
                distance === -1
                  ? () => <Button buttonText="Ok" onButtonPress={() => setKitchenModal(false)} type="success" />
                  : undefined
              }
              popUpText={
                distance === -1
                  ? 'Please make sure that location is turned on in order to proceed '
                  : `Your current location is ${distance}m away from the kitchen, are you sure you want to proceed?`
              }
            />
          )}
          <Text style={{ color: 'white', fontFamily: 'Lato', fontSize: 16 }}>
            {driverName ? `Hi, ${driverName}` : 'Please wait'}
          </Text>
          <Button
            buttonText="Start shift"
            onButtonPress={startShift}
            afterPressIcon={buttonImage}
            type="shift"
            rounded
            afterPressText={`Shift started at ${getTime(ShiftActionType.STARTED_SHIFT)}`}
            disabled={snapPointIndex !== 1 || !shift || !isLoadingDeliveries || confirmPressed}
            alreadyPressed={snapPointIndex > 1}
            customButtonStyle={{ marginVertical: 20 }}
          />
          {renderDots()}
          <Button
            buttonText="Set van data"
            onButtonPress={selectPreferredRoute}
            afterPressIcon={buttonImage}
            type="shift"
            rounded
            disabled={snapPointIndex !== 2}
            alreadyPressed={snapPointIndex > 2}
            customButtonStyle={{ marginVertical: 20 }}
          />
        </View>
      </TouchableOpacity>
    );
  } else {
    return <View />;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 0.5,
    borderTopStartRadius: 25,
    borderTopEndRadius: 25,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: GREEN_COLOR,
    paddingBottom: 50,
    paddingTop: 10,
    zIndex: 0
  },
  dot: { borderWidth: 3, borderColor: 'white' }
});

export default ShiftController;
