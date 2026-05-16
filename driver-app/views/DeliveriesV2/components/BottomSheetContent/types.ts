import { TextInput } from 'react-native';

import type { BottomSheetFlatListMethods } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetScrollable/types';

import { Delivery, RouteItem } from '@calo/driver-types';

import { DeliveryStatusCounts } from '../../../../types/interfaces';

export interface BottomSheetContentProps {
  bottomSheetIndex: number;
  filteredDeliveries: Delivery[];
  selectedTab: number;
  statusCounts: DeliveryStatusCounts;
  searchText: string;
  firstCardHeight: number | null;
  deliveryDistances?: Record<string, number>;
  onTabSelect: (tab: number) => void;
  onSearchChange: (text: string) => void;
  onStartDelivery: (deliveryId: string) => Promise<void>;
  onCardLayout: (height: number) => void;
  searchInputRef: React.RefObject<TextInput>;
  onOpenDriverImages: (delivery: Delivery) => void;
  setSelectedDelivery: (delivery: Delivery | undefined) => void;
  navigateToCoolerBagManagement: (delivery: Delivery) => void;
  onOpenActionModal?: (delivery: Delivery) => void;
  onOpenWhatsApp?: (delivery: Delivery) => void;
  shiftRoute?: Record<string, RouteItem>;
  onOutOfSequenceDelivery?: (deliveryId: string) => void;
  checkIfOutOfSequence?: (deliveryId: string) => boolean;
  deliveriesListRef: React.RefObject<BottomSheetFlatListMethods>;
}
