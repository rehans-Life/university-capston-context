import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { format } from 'date-fns/fp';

import { DriverMetrics, ShiftActionType } from '@calo/driver-types';

import { Button, PopUp } from '../../../components';
import { GREEN_COLOR } from '../../../types/constants';

interface ShiftControllerV2Props {
  driverName: string;
  visible: boolean;
  shift: DriverMetrics | undefined;
  snapPointIndex: number;
  isLoadingDeliveries: boolean;
  selectPreferredRoute: () => void;
  startShift: () => Promise<void>;
  handleStartShift: () => Promise<void>;
  isStartingShift: boolean;
  kitchenModal: boolean;
  setKitchenModal: (show: boolean) => void;
  distance: number;
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
    source={require('../../../images/Check-icon.png')}
    style={{ width: 20, height: 20, tintColor: 'white', marginRight: 10 }}
  />
);

const ShiftControllerV2 = ({
  driverName,
  visible,
  shift,
  snapPointIndex,
  selectPreferredRoute,
  isLoadingDeliveries,
  startShift,
  handleStartShift,
  isStartingShift,
  kitchenModal,
  setKitchenModal,
  distance
}: ShiftControllerV2Props) => {
  const snapPointFractions: number[] = [1, 0.75, 0.5]; // 100%, 75%, 50%
  const [isMinimized, setIsMinimized] = React.useState(false);

  const getTime = (type: ShiftActionType) => {
    if (!shift) return '--:--';

    const index = shift.driverActions.findIndex((t) => t.type === type);
    if (index !== -1) {
      return format('HH:mm')(Date.parse(shift.driverActions[index].time));
    }
    return '--:--';
  };

  // Early return if not visible
  if (!visible) {
    return <View />;
  }

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
            confirmPress={handleStartShift}
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
          disabled={snapPointIndex !== 1 || !shift || !isLoadingDeliveries || isStartingShift}
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

export default ShiftControllerV2;
