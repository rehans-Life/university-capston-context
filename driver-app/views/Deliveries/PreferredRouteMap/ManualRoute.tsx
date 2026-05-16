import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ImageBackground, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@ui-kitten/components';
import { getDistance } from 'geolib';
import { flatten, orderBy } from 'lodash-es';
import MapViewWithClusters from 'react-native-map-clustering';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { Delivery, LatLng, PreferredRouteItem, ShiftActions, ShiftActionType } from '@calo/driver-types';
import { Dictionary } from '@calo/types';
import { getCurPos } from '@helpers';
import { DeliveryTime } from '@lib/enums';

import Button from '../../../components/Button';
import PreferredRoutePanel from '../../../components/PreferredRoutePanel';
import { GREEN_COLOR, RED_COLOR } from '../../../types/constants';
import { DeliveriesGroupForPreferredRoute, VanData } from '../../../types/interfaces';

import PreferredRouteCard from './PreferredRouteCard';

const redMarker = require('../../../images/marker-red.png');
const greenMarker = require('../../../images/marker.png');
const oldMarker = require('../../../images/old-marker.png');

interface PreferredRouteMapProps {
  deliveries: Delivery[];
  handleUpdateShift: (action: ShiftActions, preferredRoute: PreferredRouteItem[], driverPos: LatLng) => Promise<void>;
  setSnapPointIndex: (point: number) => void;
  driverName: string;
  deliveryTime: DeliveryTime;
  vanData: VanData;
  isVanPanelVisible: boolean;
  isShiftLoading: boolean;
  setIsShiftLoading: (loading: boolean) => void;
  setIsInSetRouteStage: (inSetRouteStage: boolean) => void;
  isInSetRouteStage: boolean;
}

const ManualRoute = ({
  deliveries,
  handleUpdateShift,
  setSnapPointIndex,
  isVanPanelVisible,
  vanData,
  isShiftLoading,
  setIsShiftLoading,
  setIsInSetRouteStage,
  isInSetRouteStage
}: PreferredRouteMapProps) => {
  const camera = useRef<MapView>(null);
  const [withClusters, setWithClusters] = useState(false);
  const [displayCustomMarkers, setDisplayCustomMarkers] = useState(false);
  const [priorities, setPriorities] = useState<Dictionary<number | undefined>>({});
  const [selected, setSelected] = useState<DeliveriesGroupForPreferredRoute | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<DeliveriesGroupForPreferredRoute[]>([]);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 26.21536,
    longitude: 50.5832,
    latitudeDelta: 0.2922,
    longitudeDelta: 0.2421
  });

  const handleBackButton = async () => {
    setSnapPointIndex(2);
    setIsInSetRouteStage(false);
  };

  useEffect(() => {
    const data: Dictionary<number | undefined> = {};
    for (const group of selectedGroups) {
      data[group.id] = group.priority;
    }
    setPriorities(data);
  }, [selectedGroups]);

  useEffect(() => {
    if (deliveries.length > 0 && deliveries[0].deliveryAddress?.lat && deliveries[0].deliveryAddress?.lng && camera.current) {
      const lat = deliveries[0].deliveryAddress.lat;
      const lng = deliveries[0].deliveryAddress.lng;

      setInitialRegion((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));

      // Animate camera to the location to ensure navigation happens
      camera.current.animateCamera({
        center: {
          latitude: lat,
          longitude: lng
        }
      });
    }
  }, [deliveries]);

  const handleMarkerClick = (item: DeliveriesGroupForPreferredRoute) => {
    const index = selectedGroups.findIndex((i) => i.id === item.id);
    if (index === -1) {
      setSelected(item);
      setSelectedGroups([{ ...item, priority: selectedGroups.length + 1 }, ...selectedGroups]);
    } else {
      setSelected(selectedGroups[index]);
    }
  };

  const reorder = (picked: DeliveriesGroupForPreferredRoute, idOfItemToAppend: string) => {
    const newSelectedGroups = selectedGroups;
    let newData = [];
    const indexOfItemToRemove = selectedGroups.findIndex((g) => g.id === picked?.id);
    const indexOfItemToAppendTo = selectedGroups.findIndex((g) => g.id === idOfItemToAppend);
    if (indexOfItemToRemove !== -1 && indexOfItemToAppendTo !== -1 && picked) {
      selectedGroups.splice(indexOfItemToRemove, 1);
      newSelectedGroups.splice(indexOfItemToAppendTo, 0, picked);
    }
    newData = newSelectedGroups.map((group, index) => ({
      ...group,
      priority: newSelectedGroups.length - index,
      isPreviousPriority: false
    }));
    handleGroupClickOnPanel(newData[indexOfItemToAppendTo]);
    setSelectedGroups(newData);
  };

  const finishSettingRoute = async () => {
    if (selectedGroups.length === groupsToRender.length) {
      setIsShiftLoading(true);
      const curPos: { latitude: number; longitude: number } = await getCurPos();
      const preffRoute = flatten(
        selectedGroups.map((group) =>
          group.deliveries.map((d) => ({
            id: d.id,
            userId: d.userId,
            priority: group.priority || 0,
            origin: {
              lat: d.deliveryAddress.lat,
              lng: d.deliveryAddress.lng
            },
            groupBufferTime: group.bufferTime || 0
          }))
        )
      );
      await handleUpdateShift(
        {
          type: ShiftActionType.STARTED_DELIVERING,
          time: new Date().toISOString(),
          vanData
        },
        preffRoute,
        {
          lat: curPos.latitude,
          lng: curPos.longitude
        }
      );
      setIsInSetRouteStage(false);
      setIsShiftLoading(false);
    } else {
      const ids = selectedGroups.map((i) => i.id);
      //find missing delivery and select camera to it
      const index = groupsToRender.findIndex((d) => !ids.includes(d.id));
      if (index !== -1) {
        camera.current?.animateCamera({
          center: {
            latitude: groupsToRender[index].lat,
            longitude: groupsToRender[index].lng
          }
        });
      }
    }
  };

  const handleGroupClickOnPanel = (item: DeliveriesGroupForPreferredRoute) => {
    setSelected(item);
    camera.current?.animateCamera({
      center: {
        latitude: item.lat,
        longitude: item.lng
      }
    });
  };

  const handleSetBufferTime = (item: DeliveriesGroupForPreferredRoute, value: number) => {
    const updatedItem = { ...item, bufferTime: value };
    setSelected(updatedItem);
    if (selectedGroups.some((i) => i.id === item.id)) {
      setSelectedGroups(
        selectedGroups.map((g) => {
          if (g.id === item.id) {
            return {
              ...g,
              bufferTime: value
            };
          } else {
            return g;
          }
        })
      );
    }
  };

  const renderMarkerColor = (item: DeliveriesGroupForPreferredRoute) => {
    return selectedGroups.some((i) => i.id === item.id)
      ? selected && item.id === selected.id
        ? 'blue'
        : GREEN_COLOR
      : RED_COLOR;
  };

  const renderMarkerKey = (item: DeliveriesGroupForPreferredRoute) => {
    return `${item.id}-${selectedGroups.some((i) => i.id === item.id) ? (selected && item.id === selected.id ? 'selected' : 'active') : 'inactive'}`;
  };

  const groupsToRender = useMemo(() => {
    let remainingDeliveries = deliveries.filter((item) => item.deliveryAddress.lng && item.deliveryAddress.lat);
    const groupedDeliveries: Dictionary<DeliveriesGroupForPreferredRoute> = {};
    while (remainingDeliveries.length !== 0) {
      const matchedDeliveries: Delivery[] = [];
      let bufferTime = 0;
      const notMatchedDeliveries: Delivery[] = [];
      const { lat, lng } = remainingDeliveries[0].deliveryAddress;
      for (const d of remainingDeliveries) {
        let distance = -1;
        try {
          distance = getDistance(
            {
              latitude: lat,
              longitude: lng
            },
            {
              latitude: d.deliveryAddress.lat,
              longitude: d.deliveryAddress.lng
            }
          );
        } catch (error) {
          console.log(error);
        }

        if (distance <= 10 && distance !== -1) {
          matchedDeliveries.push(d);
          if (d.groupBufferTime && d.groupBufferTime > bufferTime) {
            bufferTime = d.groupBufferTime;
          }
        } else {
          notMatchedDeliveries.push(d);
        }
      }
      const group = `${lat}-${lng}`;
      groupedDeliveries[group] = {
        id: group,
        count: matchedDeliveries.length,
        deliveries: matchedDeliveries,
        bufferTime,
        lat,
        lng
      };
      remainingDeliveries = notMatchedDeliveries;
    }
    const data = Object.values(groupedDeliveries);
    const withPriority = data.filter((group) => group.priority);
    setSelectedGroups(
      orderBy(withPriority, 'priority', 'desc').map((group, index) => ({
        ...group,
        priority: withPriority.length - index
      }))
    );
    return data;
  }, [deliveries]);

  useEffect(() => {
    if (selectedGroups.length > 0 && !isVanPanelVisible) {
      handleGroupClickOnPanel(selectedGroups[selectedGroups.length - 1]);
    }
  }, [isVanPanelVisible]);

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <TouchableOpacity onPress={handleBackButton} style={styles.navButton}>
        <Text style={styles.navButtonText}>{'<- BACK'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDisplayCustomMarkers(!displayCustomMarkers)} style={styles.markerButton}>
        <Image style={styles.buttonMarker} source={displayCustomMarkers ? oldMarker : redMarker} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setWithClusters(!withClusters)} style={styles.clusterButton}>
        <Text style={styles.navButtonText}>{`CL - ${withClusters ? 'ON' : 'OFF'}`}</Text>
      </TouchableOpacity>
      {withClusters ? (
        <MapViewWithClusters
          ref={camera}
          provider={PROVIDER_GOOGLE}
          moveOnMarkerPress={!isInSetRouteStage}
          style={styles.mapStyle}
          initialRegion={initialRegion}
          showsUserLocation={true}
          toolbarEnabled={false}
          loadingEnabled={true}
        >
          {groupsToRender.map((group) => {
            return (
              <Marker
                key={renderMarkerKey(group)}
                coordinate={{
                  longitude: group.lng,
                  latitude: group.lat
                }}
                onPress={() => handleMarkerClick(group)}
                tracksViewChanges={true}
                pinColor={renderMarkerColor(group)}
              >
                {displayCustomMarkers && (
                  <ImageBackground
                    style={styles.marker}
                    source={selectedGroups.some((i) => i.id === group.id) ? greenMarker : redMarker}
                  >
                    <Text style={styles.priority}>{priorities[group.id] || ''}</Text>
                  </ImageBackground>
                )}
              </Marker>
            );
          })}
        </MapViewWithClusters>
      ) : (
        <MapView
          ref={camera}
          provider={PROVIDER_GOOGLE}
          moveOnMarkerPress={!isInSetRouteStage}
          style={styles.mapStyle}
          initialRegion={initialRegion}
          showsUserLocation
          toolbarEnabled={false}
          loadingEnabled={true}
        >
          {groupsToRender.map((group) => {
            return (
              <Marker
                key={renderMarkerKey(group)}
                coordinate={{
                  longitude: group.lng,
                  latitude: group.lat
                }}
                onPress={() => handleMarkerClick(group)}
                tracksViewChanges={false}
                pinColor={renderMarkerColor(group)}
              >
                {displayCustomMarkers && (
                  <ImageBackground
                    style={styles.marker}
                    source={selectedGroups.some((i) => i.id === group.id) ? greenMarker : redMarker}
                  >
                    <Text style={styles.priority}>{priorities[group.id] || ''}</Text>
                  </ImageBackground>
                )}
              </Marker>
            );
          })}
        </MapView>
      )}
      {selected && (
        <View style={styles.bottomSection}>
          <PreferredRoutePanel
            selectedGroups={selectedGroups}
            selected={selected}
            handleGroupClick={handleGroupClickOnPanel}
            reorder={reorder}
          />
          <PreferredRouteCard group={selected} bufferTime={selected.bufferTime || 0} setBufferTime={handleSetBufferTime} />
          <Button
            type="primary"
            disabled={isShiftLoading}
            onButtonPress={finishSettingRoute}
            disabledColorOnly={groupsToRender.length === selectedGroups.length}
            buttonText={`Set preferred route (${groupsToRender.length}/${selectedGroups.length})`}
            customTextStyle={{
              color: groupsToRender.length === selectedGroups.length ? GREEN_COLOR : '#808080'
            }}
            customButtonStyle={[
              styles.setRouteBtn,
              {
                borderColor: groupsToRender.length === selectedGroups.length ? GREEN_COLOR : '#808080'
              }
            ]}
          />
        </View>
      )}
    </View>
  );
};

export default ManualRoute;
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
  navButton: {
    position: 'absolute',
    top: 12,
    left: 10,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'white'
  },
  markerButton: {
    position: 'absolute',
    top: 60,
    right: 11,
    borderRadius: 5,
    padding: 3,
    backgroundColor: 'white'
  },
  clusterButton: {
    position: 'absolute',
    top: 12,
    right: 60,
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: 'white'
  },
  bottomSection: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    padding: 5,
    backgroundColor: 'white',
    borderRadius: 15
  },
  navButtonText: {
    color: GREEN_COLOR,
    fontWeight: 'bold'
  },
  setRouteBtn: {
    borderRadius: 10,
    paddingVertical: 15
  },
  buttonMarker: {
    width: 33,
    height: 46
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
  }
});
