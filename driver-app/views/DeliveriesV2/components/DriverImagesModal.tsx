import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent
} from 'react-native';

import Config from 'react-native-config';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Delivery } from '@calo/driver-types';
import { colors } from '@components/theme';

interface DriverImagesModalProps {
  visible: boolean;
  delivery: Delivery | undefined;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DriverImagesModal: React.FC<DriverImagesModalProps> = ({ visible, delivery, onClose }) => {
  const images = delivery && delivery?.deliveryAddress.driverImages ? delivery?.deliveryAddress.driverImages : []; // Use dummy images for now
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <View style={styles.closeButtonContainer}>
              <Icon name="close" size={24} color={colors.grey[700]} />
            </View>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Icon name="photo-library" size={20} color={colors.grey[700]} style={styles.titleIcon} />
            <Text style={styles.title}>Driver Images</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Images ScrollView */}
        <View style={styles.scrollViewContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onMomentumScrollEnd={handleScroll}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image
                  source={{
                    uri: `${Config.REACT_NATIVE_BUCKET_URL}${image.replace('undefined', '')}/square@1x.jpg`
                  }}
                  style={styles.image}
                  resizeMode="contain"
                  onError={(error) => {
                    console.log('Image load error:', error);
                  }}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Pagination Dots */}
        {images.length > 1 && (
          <View style={styles.paginationContainer}>
            {images.map((_, index) => (
              <View key={`dot-${index}`} style={[styles.paginationDot, index === currentIndex && styles.paginationDotActive]} />
            ))}
          </View>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey[900]
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.system.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[100],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.grey[200]
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  titleIcon: {
    marginRight: 6
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.grey[900],
    letterSpacing: 0.1
  },
  placeholder: {
    width: 40
  },
  scrollViewContainer: {
    flex: 1,
    backgroundColor: colors.grey[900]
  },
  scrollContent: {
    alignItems: 'center'
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grey[900]
  },
  image: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT - 200,
    borderRadius: 8,
    backgroundColor: colors.grey[800]
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    gap: 8
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)'
  },
  paginationDotActive: {
    backgroundColor: colors.system.white,
    width: 24
  },
  counterContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  counterText: {
    color: colors.system.white,
    fontSize: 14,
    fontWeight: '600'
  }
});

export default DriverImagesModal;
