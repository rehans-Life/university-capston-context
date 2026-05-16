import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BackHandler, Linking, SafeAreaView } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Auth } from 'aws-amplify';
import { AxiosError } from 'axios';
import { keyBy, orderBy } from 'lodash-es';
import IdleTimerManager from 'react-native-idle-timer';
import { Asset } from 'react-native-image-picker';

import { addActions, addNote, updateAddress, updateShift, uploadPODImages } from '@actions';
import {
  Delivery,
  LatLng,
  PreferredRouteItem,
  Range,
  RouteItemActionType,
  ShiftActionType,
  ShiftActions,
  UpdateDeliveryReq
} from '@calo/driver-types';
import { DDeliveryStatus, Dictionary } from '@calo/types';
import {
  Button as CustomButton,
  ItemDetailsModal,
  LocationPermissionPopup,
  LocationPopup,
  PODCaptureModal,
  PopUp,
  ScannerModal
} from '@components';
import { BottomSheetRef } from '@components/BottomSheet';
import {
  AccountSettingBottomSheet,
  ActionBottomSheet,
  ConfirmationBottomSheet,
  DriverImagesBottomSheet,
  SubActionBottomSheet,
  UnableToDeliverBottomSheet,
  UpdateDeliveryBottomSheet
} from '@components/BottomSheet/BottomSheetsComponents';
import { getInitDeliveryTime, getInitDeliveryDay, handleErrorCheck, mapSubActionToDetails, snackbarShow } from '@helpers';
import useAppVersionCheck from '@hooks/useAppVersionCheck';
import useCurrentUser from '@hooks/useCurrentUser';
import useDeliveryData from '@hooks/useDeliveries';
import useDeliveryActions from '@hooks/useDeliveryActions';
import useFilteredDeliveries from '@hooks/useFilteredDeliveries';
import useFinishShift from '@hooks/useFinishShift';
import useLiveTracking from '@hooks/useLiveTracking';
import useLocationPermission from '@hooks/useLocationPermission';
import useShift from '@hooks/useShift';
import { DeliveryTime, SubActionType } from '@lib/enums';
import { ROUTES } from '@navigation/types';
import deliveryReducer from '@reducers/delivery';

import { DeliveryFilters, DeliveryStatusCounts } from '../../types/interfaces';

import WhatsAppOptionsSheet from './DeliveryCard/WhatsAppOptionsSheet';
import DeliveryContext from './DeliveryContext';
import DeliveryScreenStateController from './DeliveryScreenState/DeliveryScreenState';
import Header from './Header';
import DeliveryTimeBottomSheet from './Header/DeliveryTimeBottomSheet';
import PreferredRouteMap from './PreferredRouteMap';
import ShiftController from './ShiftController';
import { styles } from './styles';
import { DeliveriesNavigationProp } from './types';

const Deliveries = () => {
  const currentDriver = useCurrentUser();
  const { isSupported, newVersionLink, verifyVersion } = useAppVersionCheck();
  const navigation = useNavigation<DeliveriesNavigationProp>();
  const subActionRef = useRef<BottomSheetRef>(null);
  const actionModalRef = useRef<BottomSheetRef>(null);
  const accountSettingRef = useRef<BottomSheetRef>(null);
  const confirmationModalRef = useRef<BottomSheetRef>(null);
  const updateDeliveryModalRef = useRef<BottomSheetRef>(null);
  const unableToDeliverModalRef = useRef<BottomSheetRef>(null);
  const coolerBagModalRef = useRef<BottomSheetRef>(null);
  const coolerBagsRetrievedModalRef = useRef<BottomSheetRef>(null);
  const driverImagesRef = useRef<BottomSheetRef>(null);
  const deliveryTimeBottomSheetRef = useRef<BottomSheetRef>(null);

  const [stopLiveTracking] = useLiveTracking();
  const [startLiveTracking] = useLiveTracking();

  const [screenState, setScreenState] = useState('list');
  const [snapPointIndex, setSnapPointIndex] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [scannedId, setScannedId] = useState<null | string>(null);
  const [isScanModeActive, setIsScanModeActive] = useState(false);
  const [finishShiftPopUp, setFinishShiftPopUp] = useState(false);
  const [showShiftWarnPopUp, setShowShiftWarnPopUp] = useState(false);
  const [displayCustomMarkers, setDisplayCustomMarkers] = useState(false);
  const [isDetailsModalActive, setIsDetailsModalActive] = useState(false);
  const [updatePinLocationPopup, setUpdatePinLocationPopup] = useState<boolean>(false);
  const [activeSkippedDeliveryIds, setActiveSkippedDeliveryIds] = useState<string[]>([]);
  const [selectedUserIdForAddressChange, setSelectedUserIdForAddressChange] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<(Delivery & { shouldReturnBag?: boolean }) | undefined>(undefined);
  const [subActionsInfo, setSubActionsInfo] = useState({
    title: '',
    subTitle: '',
    info: ''
  });

  const [state, dispatch] = useReducer(deliveryReducer, {
    list: [],
    keyedList: {},
    selected: null,
    skippedToLast: []
  });
  const [isShiftSkipped, setIsShiftSkipped] = useState(false);
  const [isInSetRouteStage, setIsInSetRouteStage] = useState(false);

  const [filters, setFilters] = useState<DeliveryFilters>({
    day: getInitDeliveryDay(),
    deliveryTime: getInitDeliveryTime(currentDriver.country)
  });

  const {
    shift,
    shiftRoute,
    refetchShift,
    isShiftStarted,
    isShiftFinished,
    isShiftLoading: shiftLoading
  } = useShift(filters.deliveryTime);

  const { list, keyedList, skippedToLast } = state;
  const { deliveriesData, refetch, isLoading } = useDeliveryData(
    filters,
    // @ts-ignore
    currentDriver.id
  );

  useEffect(() => {
    if (deliveriesData) {
      dispatch({ type: 'set', payload: deliveriesData });
      updateAlreadySkipped();
    }
  }, [deliveriesData]);

  const updateAlreadySkipped = async () => {
    const skippedDeliveryIds: string[] = [];
    try {
      const value = await AsyncStorage.getItem('skippedDeliveries');
      if (value !== null) {
        const ids = JSON.parse(value);
        const keyedDeliveries = keyBy(deliveriesData || [], 'id');
        for (const id of ids) {
          const delivery = keyedDeliveries[id];
          if (delivery) {
            skippedDeliveryIds.push(delivery.id);
            dispatch({
              type: 'skipToLast',
              payload: delivery
            });
          }
        }
      }
      setActiveSkippedDeliveryIds(skippedDeliveryIds);
    } catch (error: unknown) {
      handleErrorCheck(error, 'Loading data from local storage failed');
    }
  };

  const deliveryList = useMemo(() => {
    const deliveriesOrdered = orderBy(
      list.map((id) => keyedList[id]),
      ['priority', 'shortId']
    );
    const skipped = skippedToLast.map((id) => keyedList[id]);
    return [...deliveriesOrdered, ...skipped];
  }, [keyedList, list, skippedToLast]);

  const filteredDeliveriesByShift = useMemo(() => {
    const shiftDeliveriesIds = shift ? Object.keys(shift.routePlan) : [];
    return deliveryList.filter((d) => shiftDeliveriesIds.includes(d.id));
  }, [deliveryList, shift]);

  const { searchDeliveries: deliveries, allDeliveriesCount } = useFilteredDeliveries(filteredDeliveriesByShift, searchText);

  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [tabsTotalLength, setTabsTotalLength] = useState<DeliveryStatusCounts>({
    new: 0,
    pending: 0,
    delivered: 0,
    totalDeliveries: 0
  });

  const handleDeliveryTimeChange = (deliveryTime: DeliveryTime) => {
    setFilters({ ...filters, deliveryTime });
    deliveryTimeBottomSheetRef.current?.close();
  };

  const countFilteredDeliveries = (tab: number) => {
    return deliveries.filter((delivery) => {
      if (tab === 0) {
        return (
          filters.deliveryTime === delivery.time &&
          (!delivery.deliveryStatus ||
            (delivery.deliveryStatus === DDeliveryStatus.delivering &&
              (!shiftRoute?.[delivery.id] ||
                !shiftRoute[delivery.id].actions?.some(
                  (action) => action.type !== RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES
                ))))
        );
      } else if (tab === 1) {
        return (
          filters.deliveryTime === delivery.time &&
          delivery.deliveryStatus === DDeliveryStatus.delivering &&
          shiftRoute &&
          shiftRoute[delivery.id] &&
          shiftRoute[delivery.id].actions?.some(
            (action) => action.type !== RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES
          )
        );
      } else {
        return delivery.deliveryStatus === DDeliveryStatus.delivered;
      }
    });
  };

  const filterDeliveries = (tab?: number): Delivery[] => {
    if (tab === 0) {
      return countFilteredDeliveries(0);
    } else if (tab === 1) {
      return countFilteredDeliveries(1);
    } else {
      return countFilteredDeliveries(2);
    }
  };

  const filteredDeliveries = useMemo(() => filterDeliveries(selectedTab), [shift, selectedTab, shiftRoute, deliveries]);

  // Location permission monitoring
  const { showLocationPopup, permissionIssue, checkLocationPermission, openLocationSettings } = useLocationPermission({
    isShiftStarted: isShiftStarted || isShiftSkipped,
    checkInterval: 120000 // Check every 2 minutes
  });

  useEffect(() => {
    const newDeliveries = countFilteredDeliveries(0).length;
    const pendingDeliveries = countFilteredDeliveries(1).length;
    const doneDeliveries = countFilteredDeliveries(2).length;
    const totalDeliveries = allDeliveriesCount;
    setTabsTotalLength({
      new: newDeliveries,
      pending: pendingDeliveries,
      delivered: doneDeliveries,
      totalDeliveries: totalDeliveries
    });
  }, [shift, deliveries]);

  const handleFinishShift = useFinishShift({
    deliveryTime: filters.deliveryTime,
    day: filters.day,
    currentDriverId: currentDriver.id,
    setFinishShiftPopUp
  });

  const { handleMarkAsDelivered } = useDeliveryActions({
    dispatch,
    handleFinishShift,
    country: currentDriver.country
  });

  const handleUpdateDelivery = async (id: string, attr: UpdateDeliveryReq) => {
    if (isShiftStarted || isShiftSkipped) {
      try {
        await handleMarkAsDelivered(id, attr, tabsTotalLength, searchText);
      } catch (error: unknown) {
        handleErrorCheck(error, 'Something went wrong with update Delivery');
      }
    } else {
      setShowShiftWarnPopUp(true);
    }
  };

  const navigationToCoolerBagManagement = (delivery: Delivery) => {
    const handleMarkAsDeliveredFromCoolerBag = async (markedDelivery: Delivery, coolerBagAttr: UpdateDeliveryReq) => {
      setPendingCoolerBagAttr(coolerBagAttr);
      setPodDelivery(markedDelivery);
      setIsPODModalVisible(true);
    };
    navigation.navigate(ROUTES.CoolerBagManagement, { delivery, handleMarkAsDelivered: handleMarkAsDeliveredFromCoolerBag });
  };

  const skipShift = () => {
    setSnapPointIndex(0);
    setIsInSetRouteStage(false);
    setIsShiftSkipped(true);
    accountSettingRef.current?.close();
  };

  const barcodeScanned = async (code: string) => {
    setIsScanModeActive(false);
    setScannedId(code);
    setIsDetailsModalActive(true);
  };

  useEffect(() => {
    verifyVersion();
    startLiveTracking();
    IdleTimerManager.setIdleTimerDisabled(true);
    return () => {
      IdleTimerManager.setIdleTimerDisabled(false);
    };
  }, []);

  const closeItemDetailsModal = () => {
    setIsDetailsModalActive(false);
    setScannedId(null);
  };

  const openLink = async () => {
    if (newVersionLink) {
      await Linking.openURL(newVersionLink);
      BackHandler.exitApp();
    } else {
      handleErrorCheck(
        '',
        'Something went wrong with new app link, please contact logistics managers to provide new APK for this app'
      );
    }
  };

  const handleDelivered = async (item: Delivery) => {
    if (isShiftStarted || isShiftSkipped) {
      // Open POD modal instead of directly marking as delivered
      setPodDelivery(item);
      setIsPODModalVisible(true);
    } else {
      setShowShiftWarnPopUp(true);
    }
  };

  // const handleDeliveredV2 = async (deliveryId: string) => {
  //   if (isShiftStarted || isShiftSkipped) {
  //     await handleUpdateDelivery(deliveryId, {
  //       deliveryStatus: DDeliveryStatus.delivered
  //     });
  //   } else {
  //     setShowShiftWarnPopUp(true);
  //   }
  // };

  const handleRefresh = async () => {
    try {
      const data = await refetch();
      if (data.data) {
        dispatch({ type: 'set', payload: data.data });
      }
      await refetchShift();
    } catch (error) {
      handleErrorCheck(error, 'Something went wrong with refresh');
    }
  };

  const requestAddressChange = async (id: string, attr: LatLng) => {
    updateAddress(id, attr);
  };

  const handleCallUser = (item: Delivery) => {
    Linking.openURL(`tel:${item.phoneNumber}`);
  };

  const handleAddingNote = async (delivery: Delivery, note: string, images?: string[]) => {
    try {
      await addNote(delivery.userId, note, delivery.deliveryAddress.id, images);
      delivery.deliveryAddress.driverNote = note;
      delivery.deliveryAddress.driverImages = images;
      dispatch({
        type: 'update',
        payload: delivery
      });
      snackbarShow('Note successfully added', false);
    } catch (error: unknown) {
      handleErrorCheck(error, 'Something went wrong with adding note');
    }
    subActionRef.current?.close();
    setSelectedDelivery(undefined);
    refetch();
  };

  const skipToLastDelivery = async (item: Delivery) => {
    dispatch({
      type: 'skipToLast',
      payload: item
    });
    try {
      const data = [...activeSkippedDeliveryIds, item.id];
      setActiveSkippedDeliveryIds(data);
      await AsyncStorage.setItem('skippedDeliveries', JSON.stringify(data));
    } catch (error: unknown) {
      handleErrorCheck(error, 'Writing data to local storage failed with error', false);
    }
  };

  const logout = async () => {
    try {
      await Auth.signOut();
      stopLiveTracking();
    } catch (error: unknown) {
      handleErrorCheck(error, 'Something went with sign-out');
    }
  };

  const continueShift = async () => {
    if (shift) {
      try {
        const newActions = shift.driverActions;
        newActions.splice(newActions.length - 1, 1);
        await updateShift(shift.id, { driverActions: newActions });
        await refetchShift();
      } catch (error: unknown) {
        handleErrorCheck(error, 'Something went wrong with continue shift');
      }
    }
  };

  useEffect(() => {
    if (!shift) {
      setSnapPointIndex(0);
      return;
    }
    if (shift.driverActions.length === 0) {
      setSnapPointIndex(1);
      return;
    }
    const last = shift.driverActions[shift.driverActions.length - 1];
    switch (last.type) {
      case ShiftActionType.STARTED_SHIFT:
        setSnapPointIndex(2);
        break;
      case ShiftActionType.STARTED_DELIVERING:
        setSnapPointIndex(0);
        break;
      case ShiftActionType.FINISHED_SHIFT:
        break;
      default:
        setSnapPointIndex(1);
    }
  }, [shift]);

  const selectPreferredRoute = () => {
    setSnapPointIndex(0);
    setIsInSetRouteStage(true);
  };

  const finishShift = async () => {
    if (filterDeliveries.length > 0) {
      setFinishShiftPopUp(true);
      return;
    }
    await handleFinishShift();
  };

  const updatePrioritiesBasedOnPrefRoute = async (prefRoute: PreferredRouteItem[] | undefined, eta: Dictionary<Range>) => {
    if (prefRoute) {
      const keyed = keyBy(prefRoute, 'id');
      const newData = (deliveriesData ?? []).map((d) => ({
        ...d,
        priority: keyed[d.id]?.priority,
        eta: eta[d.id]
      }));
      AsyncStorage.setItem(`deliveries ${filters.deliveryTime} ${filters.day} ${currentDriver.id}`, JSON.stringify(newData));
      dispatch({ type: 'set', payload: newData });
    } else {
      const updatedDeliveries = await refetch();
      const newData = (updatedDeliveries.data ?? []).map((d) => ({
        ...d,
        eta: eta[d.id]
      }));
      AsyncStorage.setItem(`deliveries ${filters.deliveryTime} ${filters.day} ${currentDriver.id}`, JSON.stringify(newData));
      dispatch({ type: 'set', payload: newData });
    }
  };

  const handleUpdateShift = async (
    action: ShiftActions,
    prefRoute?: PreferredRouteItem[] | undefined,
    driverPosition?: LatLng
  ) => {
    if (shift) {
      const newActions = [...shift.driverActions, action];
      try {
        const response = await updateShift(shift.id, {
          driverActions: newActions,
          preferredRoute: prefRoute,
          driverPosition
        });

        if (action.type === ShiftActionType.STARTED_DELIVERING) {
          updatePrioritiesBasedOnPrefRoute(prefRoute, response.eta);
        }
        await refetchShift();
        setSnapPointIndex(snapPointIndex < 2 ? snapPointIndex + 1 : 0);
      } catch (error: unknown) {
        if (error instanceof AxiosError && error.response?.status === 406) {
          handleErrorCheck(error, 'It is not allowed to start shift yet');
        } else {
          handleErrorCheck(error, 'Something went wrong with updating shift. Skip shift starting process');
        }
        throw error;
      }
    }
  };

  const handleAddActions = async (action: string, deliveryId: string, note?: string, newLocation?: string) => {
    try {
      await addActions(deliveryId, [
        action === 'pinLocation'
          ? {
              newLocation: newLocation ?? '',
              createdAt: '',
              type: RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES,
              note: note
            }
          : {
              note,
              createdAt: '',
              type: subActionsInfo.title as Exclude<
                RouteItemActionType,
                RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES
              >
            }
      ]);
      await refetchShift();
      subActionRef.current?.close();
      setSelectedDelivery(undefined);
    } catch (error: unknown) {
      handleErrorCheck(error, 'Something went wrong with Add Action');
    }
  };

  const handleConfirmAction = async (note?: string, googleLink?: string) => {
    if (googleLink && subActionsInfo.title === RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES) {
      if (selectedDelivery) {
        handleAddActions('pinLocation', selectedDelivery.id, note, googleLink);
      }
    } else if (subActionsInfo.title === 'Add Driver Note') {
      if (selectedDelivery) {
        handleAddingNote(selectedDelivery, note ?? '');
      }
    } else {
      if (selectedDelivery) {
        await addActions(selectedDelivery.id, [
          {
            note,
            createdAt: '',
            type: subActionsInfo.title as Exclude<
              RouteItemActionType,
              RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES
            >
          }
        ]);
      }
    }
  };

  const handleSubActionData = (subAction: SubActionType) => {
    if (subAction === SubActionType.SkipToLast) {
      return skipToLastDelivery(selectedDelivery!).finally(() => {
        updateDeliveryModalRef.current?.close();
        setSelectedDelivery(undefined);
      });
    }
    const { title, subTitle, info } = mapSubActionToDetails(subAction);
    setSubActionsInfo({ title, subTitle, info });
    updateDeliveryModalRef.current?.close();
    unableToDeliverModalRef.current?.close();

    if (title === RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES) {
      setUpdatePinLocationPopup(true);
    } else if (title) {
      subActionRef.current?.open();
    }
  };

  const handleOnCloseSheet = () => {
    setSubActionsInfo({ title: '', subTitle: '', info: '' });
    setSelectedDelivery(undefined);
  };

  const openDriverImagesPreviewBottomSheet = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    driverImagesRef.current?.open();
  };

  const closeDriverImagesBottomSheet = () => {
    driverImagesRef.current?.close();
    setSelectedDelivery(undefined);
  };

  const [isWhatsAppOptionsVisible, setWhatsAppOptionsVisible] = useState(false);
  const [selectedWhatsAppDelivery, setSelectedWhatsAppDelivery] = useState<Delivery | null>(null);

  // POD Modal State
  const [isPODModalVisible, setIsPODModalVisible] = useState(false);
  const [podDelivery, setPodDelivery] = useState<Delivery | null>(null);
  // Cooler bag attrs pending POD confirmation (set when navigating from CoolerBagManagement)
  const [pendingCoolerBagAttr, setPendingCoolerBagAttr] = useState<UpdateDeliveryReq | null>(null);

  const openWhatsAppOptions = (delivery: Delivery) => {
    setSelectedWhatsAppDelivery(delivery);
    setWhatsAppOptionsVisible(true);
  };

  const closeWhatsAppOptions = () => {
    setWhatsAppOptionsVisible(false);
    setSelectedWhatsAppDelivery(null);
  };

  const handlePODConfirm = async (images: Asset[], note?: string) => {
    if (!podDelivery) return;

    const imageUrls = await uploadPODImages(podDelivery.id, images);

    await handleUpdateDelivery(podDelivery.id, {
      deliveryStatus: DDeliveryStatus.delivered,
      ...pendingCoolerBagAttr,
      pod: {
        images: imageUrls,
        note: note
      }
    });
    setIsPODModalVisible(false);
    setPodDelivery(null);
    setPendingCoolerBagAttr(null);
  };

  const handlePODCancel = () => {
    setIsPODModalVisible(false);
    setPodDelivery(null);
    setPendingCoolerBagAttr(null);
  };

  const handlePODSkip = async (podSkipReason: string) => {
    if (!podDelivery) return;

    await handleUpdateDelivery(podDelivery.id, {
      deliveryStatus: DDeliveryStatus.delivered,
      ...pendingCoolerBagAttr,
      pod: {
        images: [],
        note: podSkipReason
      }
    });
    setIsPODModalVisible(false);
    setPodDelivery(null);
    setPendingCoolerBagAttr(null);
  };

  return (
    <DeliveryContext.Provider
      value={{
        openDriverImagesPreviewBottomSheet,
        updateDelivery: handleUpdateDelivery,
        handleDelivered: handleDelivered,
        handleRefresh: handleRefresh,
        requestAddressChange: requestAddressChange,
        handleCallUser: handleCallUser,
        setShowShiftWarnPopUp: setShowShiftWarnPopUp,
        handleAddingNote: handleAddingNote,
        startedShift: isShiftSkipped ? true : isShiftStarted,
        selectedUserIdForAddressChange,
        setSelectedUserIdForAddressChange,
        isInSetRouteStage: isInSetRouteStage,
        setIsInSetRouteStage: setIsInSetRouteStage,
        skipToLastDelivery,
        openWhatsAppOptions
      }}
    >
      <SafeAreaView style={styles.safeAreaContainer}>
        {isDetailsModalActive && scannedId && (
          <ItemDetailsModal deliveryId={scannedId} closeModal={closeItemDetailsModal} visible={isDetailsModalActive} />
        )}

        {isScanModeActive && (
          <ScannerModal
            closeModal={() => setIsScanModeActive(false)}
            visible={isScanModeActive}
            barcodeScanned={barcodeScanned}
          />
        )}

        {showShiftWarnPopUp && (
          <PopUp
            visible={showShiftWarnPopUp}
            cancelPress={() => setShowShiftWarnPopUp(false)}
            confirmPress={() => setShowShiftWarnPopUp(false)}
            customButton={() => (
              <CustomButton buttonText="Ok" onButtonPress={() => setShowShiftWarnPopUp(false)} type="success" />
            )}
            popUpText="Click on Start shift to be able to start your journey."
          />
        )}

        {!isSupported && (
          <PopUp
            visible={!isSupported}
            cancelPress={BackHandler.exitApp}
            confirmPress={BackHandler.exitApp}
            customButton={() => <CustomButton buttonText="OK" onButtonPress={openLink} type="success" />}
            popUpText="We’ve released a new version of the app. Make sure to download the latest one."
          />
        )}

        {finishShiftPopUp && (
          <PopUp
            visible={finishShiftPopUp}
            cancelPress={() => setFinishShiftPopUp(false)}
            confirmPress={() => handleFinishShift()}
            popUpText={`You have ${tabsTotalLength.new + tabsTotalLength.pending} deliveries left, would you like to proceed?`}
          />
        )}

        {isInSetRouteStage ? (
          <PreferredRouteMap
            deliveries={filteredDeliveries}
            driverName={currentDriver.name}
            deliveryTime={filters.deliveryTime}
            handleUpdateShift={handleUpdateShift}
            setSnapPointIndex={setSnapPointIndex}
            isAutoRouteEnabled={false} // We need to toggle this flag to enable/disable auto route
          />
        ) : (
          <>
            <Header
              filters={filters}
              screenState={screenState}
              selectedTab={selectedTab}
              shiftLoading={shiftLoading}
              setSearchText={setSearchText}
              currentDriver={currentDriver}
              setScreenState={setScreenState}
              setSelectedTab={setSelectedTab}
              tabsTotalLength={tabsTotalLength}
              accountSettingRef={accountSettingRef}
              setIsScanModeActive={setIsScanModeActive}
              deliveryTimeBottomSheetRef={deliveryTimeBottomSheetRef}
            />

            <DeliveryScreenStateController
              searchText={searchText}
              actionModalRef={actionModalRef}
              confirmationModalRef={confirmationModalRef}
              coolerBagModalRef={coolerBagModalRef}
              coolerBagsRetrievedModalRef={coolerBagsRetrievedModalRef}
              continueShift={continueShift}
              currentDriver={currentDriver}
              deliveries={deliveries}
              isLoading={isLoading}
              screenState={screenState}
              selectedTab={selectedTab}
              shiftLoading={shiftLoading}
              isShiftStarted={isShiftStarted}
              isShiftFinished={isShiftFinished}
              displayCustomMarkers={displayCustomMarkers}
              deliveriesData={deliveriesData}
              tabsTotalLength={tabsTotalLength}
              finishShift={finishShift}
              filterDeliveries={filterDeliveries}
              shiftRoute={shiftRoute}
              filteredDeliveries={filteredDeliveries}
              setSelectedDelivery={setSelectedDelivery}
              navigationToCoolerBagManagement={navigationToCoolerBagManagement}
            />
          </>
        )}

        {updatePinLocationPopup && selectedDelivery && (
          <LocationPopup
            selectedUserIdForAddressChange={selectedDelivery.id}
            setSelectedUserIdForAddressChange={() => setUpdatePinLocationPopup(false)}
          />
        )}

        <ConfirmationBottomSheet
          modelRef={confirmationModalRef}
          desc="Are you sure you would like to mark this delivery as delivered ?"
          selectedDelivery={selectedDelivery!}
          title="Confirm Delivery"
          handleDelivered={handleDelivered}
          onClose={() => {
            setSelectedDelivery(undefined);
            confirmationModalRef.current?.close();
          }}
        />

        <DriverImagesBottomSheet
          modelRef={driverImagesRef}
          selectedDelivery={selectedDelivery}
          closeModal={closeDriverImagesBottomSheet}
        />

        <ShiftController
          shift={shift}
          driverName={currentDriver.name}
          snapPointIndex={snapPointIndex}
          isLoadingDeliveries={!isLoading}
          handleUpdateShift={handleUpdateShift}
          visible={!isShiftStarted && !isLoading}
          selectPreferredRoute={selectPreferredRoute}
        />
        <AccountSettingBottomSheet
          shift={shift}
          logout={logout}
          skipShift={skipShift}
          displayCustomMarkers={displayCustomMarkers}
          modelRef={accountSettingRef}
          setDisplayCustomMarkers={setDisplayCustomMarkers}
        />

        <ActionBottomSheet
          selectedDelivery={selectedDelivery}
          modelRef={actionModalRef}
          updateDeliveryModalRef={updateDeliveryModalRef}
          unableToDeliverModalRef={unableToDeliverModalRef}
          onClose={() => {
            setSelectedDelivery(undefined);
            actionModalRef.current?.close();
          }}
        />
        <UnableToDeliverBottomSheet handleSubActionData={handleSubActionData} modelRef={unableToDeliverModalRef} />
        <UpdateDeliveryBottomSheet handleSubActionData={handleSubActionData} modelRef={updateDeliveryModalRef} />
        <SubActionBottomSheet
          modelRef={subActionRef}
          actionInfo={subActionsInfo}
          allowPhotographicNotes={shift?.allowPhotographicNotes || false}
          selectedDelivery={selectedDelivery}
          handleConfirmAction={handleConfirmAction}
          handleOnCloseSheet={() => handleOnCloseSheet()}
        />

        <WhatsAppOptionsSheet
          isVisible={isWhatsAppOptionsVisible}
          onClose={closeWhatsAppOptions}
          item={selectedWhatsAppDelivery}
        />

        <PODCaptureModal
          visible={isPODModalVisible}
          delivery={podDelivery}
          onConfirm={handlePODConfirm}
          onCancel={handlePODCancel}
          onSkip={handlePODSkip}
        />

        <DeliveryTimeBottomSheet
          modalRef={deliveryTimeBottomSheetRef}
          selectedDeliveryTime={filters.deliveryTime}
          onSelectDeliveryTime={handleDeliveryTimeChange}
        />

        {/* Location Permission Popup */}
        <LocationPermissionPopup
          visible={showLocationPopup}
          permissionIssue={permissionIssue}
          onOpenSettings={openLocationSettings}
          onRetry={checkLocationPermission}
        />
      </SafeAreaView>
    </DeliveryContext.Provider>
  );
};

export default Deliveries;
