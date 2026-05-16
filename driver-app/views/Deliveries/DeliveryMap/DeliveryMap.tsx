import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View, ImageBackground, TouchableOpacity, Keyboard } from 'react-native';

import Location from '@react-native-community/geolocation';
import { Text } from '@ui-kitten/components';
import { getDistance } from 'geolib';
import MapView from 'react-native-map-clustering';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Carousel from 'react-native-reanimated-carousel'

import { Delivery, RouteItem } from '@calo/driver-types';
import { BottomSheetRef } from '@components/BottomSheet';
import { captureSentryMessage, snackbarShow } from '@helpers';
import { Route, GREEN_COLOR, RED_COLOR, SECONDARY_COLOR } from '@types';
import DeliveryCard from '@views/Deliveries/DeliveryCard';

import { getRoute } from '../../../actions';

const screenWidth = Dimensions.get('window').width;
const redMarker = require('../../../images/marker-red.png');
const greenMarker = require('../../../images/marker.png');

interface DeliveryMapProps {
  searchText: string;
  deliveries: Delivery[];
  displayCustomMarkers: boolean;
  selectedTab: number;
  actionModalRef: React.RefObject<BottomSheetRef>;
  setSelectedDelivery: (value: Delivery) => void;
  confirmationRef: React.RefObject<BottomSheetRef>;
  coolerBagModalRef: React.RefObject<BottomSheetRef>;
  coolerBagsRetrievedModalRef: React.RefObject<BottomSheetRef>;
  navigationToCoolerBagManagement: (delivery: Delivery) => void;
  shiftAction: Record<string, RouteItem> | undefined;
}

const DeliveryMap = ({
  searchText,
  shiftAction,
  confirmationRef,
  coolerBagModalRef,
  coolerBagsRetrievedModalRef,
  navigationToCoolerBagManagement,
  deliveries,
  displayCustomMarkers,
  selectedTab,
  actionModalRef,
  setSelectedDelivery
}: DeliveryMapProps) => {
  const [selected, setSelected] = useState<Delivery | null>();
  const [route, setRoute] = useState<Route | null>(null);
  const [closeDeliveries, setCloseDeliveries] = useState<Delivery[] | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  const mapRef = useRef<RNMapView>(null);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 26.21536,
    longitude: 50.5832,
    latitudeDelta: 0.2922,
    longitudeDelta: 0.2421
  });

  const getNavigationDetails = async () => {
    if (selected) {
      try {
        const curPos: { latitude: number; longitude: number } = await getCurPos();
        const data = await getRoute(
          curPos.longitude,
          curPos.latitude,
          selected.deliveryAddress.lng,
          selected.deliveryAddress.lat
        );
        setRoute(data);
      } catch (error) {
        captureSentryMessage(`getRoute failed with error: ${JSON.stringify(error)}`);
        snackbarShow('Something went with getRoute', true);
        setRoute({
          waypoints: [],
          duration: 0
        });
      }
    } else {
      setRoute(null);
      setCloseDeliveries(null);
    }
  };

  useEffect(() => {
    setRoute(null);
  }, [deliveries.length]);

  useEffect(() => {
    if (selected) {
      const index = deliveries.findIndex((del) => del.id === selected.id);
      if (index === -1) {
        setSelected(null);
        setCloseDeliveries(null);
      } else {
        setSelected(deliveries[index]);
        if (closeDeliveries) {
          const updatedDels: Delivery[] = [];
          for (const d of closeDeliveries) {
            const deliveryIndex = deliveries.findIndex((del) => del.id === d.id);
            if (deliveryIndex !== -1) {
              updatedDels.push(deliveries[deliveryIndex]);
            }
          }
          setCloseDeliveries(updatedDels);
        }
      }
    }
  }, [deliveries]);

  useEffect(() => {
    getCurPos()
      .then((pos) => {
        setInitialRegion({
          ...initialRegion,
          ...pos
        });
        mapRef.current?.animateCamera({
          center: {
            latitude: pos.latitude,
            longitude: pos.longitude
          }
        });
      })
      .catch(() => {
        snackbarShow('Something went wrong with setting initial map region. Please report the problem', true);
      });
  }, []);

  useEffect(() => {
    if (!selected) {
      setRoute(null);
      setCloseDeliveries(null);
    }
  }, [selected]);

  const getCloseDeliveries = (delivery: Delivery) =>
    deliveries.filter(
      (del) =>
        getDistance(
          {
            latitude: delivery.deliveryAddress.lat,
            longitude: delivery.deliveryAddress.lng
          },
          {
            latitude: del.deliveryAddress.lat,
            longitude: del.deliveryAddress.lng
          }
        ) <= 10 && del.id !== delivery.id
    );

  const handleMarkerClick = (item: Delivery) => {
    setSelected(item);
    const del = getCloseDeliveries(item);
    setCloseDeliveries([item, ...del]);
  };

  const handleCaroselSnap = (index: number) => {
    if (closeDeliveries) {
      const delivery = closeDeliveries[index];
      setSelected(delivery);
    }
  };

  const getCurPos = async () =>
    new Promise<{ latitude: number; longitude: number }>((resolve) => {
      Location.getCurrentPosition(
        (pos: { coords: { latitude: number; longitude: number } }) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        undefined,
        undefined
      );
    });

  const renderSheetContent = ({ item }: { item: Delivery }) => (
    <View
      style={{
        flex: 1,
        justifyContent: 'flex-end'
      }}
    >
      <DeliveryCard
        item={item}
        viewList="map"
        searchText={searchText}
        selectedTab={selectedTab}
        actionModalRef={actionModalRef}
        setSelectedDelivery={setSelectedDelivery}
        confirmationRef={confirmationRef}
        coolerBagModalRef={coolerBagModalRef}
        coolerBagsRetrievedModalRef={coolerBagsRetrievedModalRef}
        navigationToCoolerBagManagement={navigationToCoolerBagManagement}
        shiftAction={shiftAction ? shiftAction[item.id]?.actions : []}
      />
    </View>
  );
  const renderPinColor = (item: Delivery) => {
    return selected && selected.id === item.id ? GREEN_COLOR : RED_COLOR;
  };

  const deliveriesToRender = useMemo(
    () => deliveries.filter((item) => item.deliveryAddress.lng && item.deliveryAddress.lat),
    [deliveries]
  );
  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <TouchableOpacity onPress={getNavigationDetails} style={styles.navButton}>
        <Text style={styles.navButtonText}>NAV</Text>
      </TouchableOpacity>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.mapStyle}
        initialRegion={initialRegion}
        ref={mapRef}
        showsUserLocation={true}
        onPress={() => setSelected(null)}
        toolbarEnabled={false}
        loadingEnabled={true}
      >
        {deliveriesToRender.map((item, index) => (
          <Marker
            key={`${index}-${selected?.id === item.id ? 'active' : 'inactive'}`}
            coordinate={{
              longitude: item.deliveryAddress.lng,
              latitude: item.deliveryAddress.lat
            }}
            onPress={() => handleMarkerClick(item)}
            style={selected && selected.id === item.id ? { zIndex: 25 } : {}}
            tracksViewChanges={false}
            pinColor={renderPinColor(item)}
          >
            {displayCustomMarkers && (
              <ImageBackground style={styles.marker} source={selected && selected.id === item.id ? greenMarker : redMarker}>
                <Text style={styles.priority}>{item.priority || ''}</Text>
              </ImageBackground>
            )}
          </Marker>
        ))}

        <Polyline coordinates={route?.waypoints || []} strokeColor="#000" strokeWidth={3} />
        {!!route?.waypoints && route.waypoints.length > 0 && !!route?.duration && (
          <Marker
            //@ts-ignore
            cluster={false}
            coordinate={route.waypoints[Math.floor((route.waypoints.length || 0) / 2)]}
            tracksViewChanges={false}
          >
            <Text
              style={{
                padding: 5,
                backgroundColor: SECONDARY_COLOR,
                color: 'white',
                borderRadius: 5
              }}
            >
              {`${Math.ceil(route.duration / 60)}min`}
            </Text>
          </Marker>
        )}
      </MapView>

      {closeDeliveries && !keyboardVisible && (
        <Carousel
  width={screenWidth * 0.9}
  height={200} // adjust to match your card height
  style={{
    position: 'absolute',
    bottom: 10,
    width: screenWidth,
  }}
  data={closeDeliveries}
  renderItem={renderSheetContent}
  onSnapToItem={(index) => handleCaroselSnap(index)}
  mode="parallax"
  modeConfig={{
    parallaxScrollingScale: 0.9,
    parallaxScrollingOffset: screenWidth * 0.05,
  }}
/>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mapStyle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    overflow: 'hidden'
  },
  marker: {
    width: 35,
    height: 48
  },
  priority: {
    color: '#000',
    fontSize: 12,
    textAlign: 'center',
    height: '100%',
    paddingTop: '26%'
  },
  timePanel: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 5,
    alignItems: 'center'
  },
  navButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'white',
    opacity: 0.9
  },
  navButtonText: {
    color: GREEN_COLOR,
    fontWeight: 'bold'
  }
});

export default DeliveryMap;
