import { createContext, Context } from 'react';

import { Delivery, LatLng, UpdateDeliveryReq } from '@calo/driver-types';

interface DeliveryContextValue {
  updateDelivery: (id: string, attr: UpdateDeliveryReq) => Promise<void>;
  handleDelivered: (item: Delivery) => Promise<void>;
  handleRefresh: () => Promise<void>;
  requestAddressChange: (id: string, attr: LatLng) => Promise<void>;
  handleCallUser: (item: Delivery) => void;
  setShowShiftWarnPopUp: (toShow: boolean) => void;
  selectedUserIdForAddressChange: string;
  setSelectedUserIdForAddressChange: (userId: string) => void;
  handleAddingNote: (item: Delivery, note: string, images?: string[]) => Promise<void>;
  startedShift: boolean;
  isInSetRouteStage: boolean;
  setIsInSetRouteStage: (state: boolean) => void;
  skipToLastDelivery: (item: Delivery) => Promise<void>;
  openDriverImagesPreviewBottomSheet: (item: Delivery) => void;
  openWhatsAppOptions: (item: Delivery) => void;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export const initialDeliveryContextValue: DeliveryContextValue = {
  updateDelivery: async (_id: string, _attr: UpdateDeliveryReq) => {},
  handleDelivered: async (item: Delivery) => {},
  handleRefresh: async () => {},
  requestAddressChange: async (id: string, attr: LatLng) => {},
  handleCallUser: (item: Delivery) => {},
  setShowShiftWarnPopUp: (toShow: boolean) => {},
  selectedUserIdForAddressChange: '',
  setSelectedUserIdForAddressChange: (userId: string) => {},
  handleAddingNote: async (item: Delivery, note: string) => {},
  startedShift: false,
  isInSetRouteStage: false,
  setIsInSetRouteStage: (state: boolean) => {},
  skipToLastDelivery: async (item: Delivery) => {},
  openDriverImagesPreviewBottomSheet: (item: Delivery) => {},
  openWhatsAppOptions: (item: Delivery) => {}
};

const DeliveryContext: Context<DeliveryContextValue> = createContext(initialDeliveryContextValue);

export default DeliveryContext;
