import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableOpacity, Keyboard, Image } from 'react-native';

import { Text } from '@ui-kitten/components';
import { chunk, compact } from 'lodash-es';
import Config from 'react-native-config';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import { Delivery } from '@calo/driver-types';
import { DeliveryInstruction } from '@calo/types';

import DeliveryContext from '../DeliveryContext';

import { styles } from './Styles';

interface DeliveryInstructionsCardProps {
  item: Delivery;
  viewList: string;
}

const DeliveryInstructionsCard = ({ item, viewList }: DeliveryInstructionsCardProps) => {
  const { openDriverImagesPreviewBottomSheet } = useContext(DeliveryContext);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(true);
  const [isDriverImagesOpen, setIsDriverImagesOpen] = useState(false);
  const toggleInstructions = () => setIsInstructionsOpen(!isInstructionsOpen);
  const toggleDriverNote = () => setIsDriverImagesOpen(!isDriverImagesOpen);

  useEffect(() => {
    if (viewList === 'map') {
      const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', _keyboardDidShow);
      return () => {
        keyboardDidShowListener.remove();
      };
    }
  }, [viewList]);

  const _keyboardDidShow = () => {
    setIsInstructionsOpen(false);
    setIsDriverImagesOpen(false);
  };

  const handleToggles = (card: string) => {
    if (viewList === 'map') {
      if (card === 'driverImages') {
        setIsInstructionsOpen(false);
        setIsDriverImagesOpen(!isDriverImagesOpen);
      } else {
        setIsDriverImagesOpen(false);
        setIsInstructionsOpen(!isInstructionsOpen);
      }
    } else {
      if (card === 'driverImages') {
        toggleDriverNote();
      } else {
        toggleInstructions();
      }
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

  const renderInstructionsGrid = () => {
    const instructions = item.deliveryAddress.deliveryInstructions || [];
    return (
      <View style={[styles.gridContainer, { display: instructions.length > 0 ? 'flex' : 'none' }]}>
        {instructions.map((instructionType) => (
          <View key={instructionType} style={styles.instructionBox}>
            <Text style={styles.instructionText}>{getInstructionText(instructionType)}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
      <View
        style={{
          ...styles.cardContainer,
          display:
            (item.deliveryAddress.deliveryInstructions && item.deliveryAddress.deliveryInstructions.length > 0) ||
            (item.deliveryAddress.notes && item.deliveryAddress.notes.length > 0)
              ? 'flex'
              : 'none'
        }}
      >
        <TouchableOpacity onPress={() => handleToggles('instructions')} style={styles.cardHeader}>
          <Text style={styles.headerText}>Delivery Instructions</Text>
          <FontAwesome5 name={isInstructionsOpen ? 'chevron-up' : 'chevron-down'} size={12} style={{ marginRight: 4 }} />
        </TouchableOpacity>

        {isInstructionsOpen && (
          <View style={styles.cardContent}>
            {renderInstructionsGrid()}
            {!!item.deliveryAddress.notes && (
              <View style={styles.noteSection}>
                <Text style={styles.headerText}>Note:</Text>
                <Text style={[styles.noteText, { marginTop: 2 }]}>{compact([item.deliveryAddress.notes]).join(', ')}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {!!item.deliveryAddress?.driverImages && (
        <View style={styles.cardContainer}>
          <TouchableOpacity onPress={() => handleToggles('driverImages')} style={styles.cardHeader}>
            <Text style={styles.headerText}>Driver Images</Text>
            <FontAwesome5 name={isDriverImagesOpen ? 'chevron-up' : 'chevron-down'} size={12} style={{ marginRight: 4 }} />
          </TouchableOpacity>

          {isDriverImagesOpen && (
            <View style={styles.cardContent}>
              {chunk(item.deliveryAddress.driverImages || [], 5).map((images, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={1}
                  onPress={() => openDriverImagesPreviewBottomSheet(item)}
                  style={styles.previewImageContainer}
                >
                  {images.map((image) => (
                    <Image
                      key={image.replace('undefined', '')}
                      style={styles.previewImage}
                      source={{
                        uri: `${Config.REACT_NATIVE_BUCKET_URL}${image.replace('undefined', '')}/square@1x.jpg`
                      }}
                    />
                  ))}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </>
  );
};

export default DeliveryInstructionsCard;
