/**
 * ListHeader Component
 * ====================
 * 
 * PURPOSE:
 * Header component for the expanded deliveries list view.
 * Contains status tabs, delivery count header, and search input.

 */

import React from 'react';
import { View, TextInput } from 'react-native';

import { DeliveryStatusCounts } from '../../../../types/interfaces';
import FloatingStatusTabs from '../../FloatingStatusTabs';

import { SearchInput } from './SearchInput';
import { styles } from './styles';

interface ListHeaderProps {
  selectedTab: number;
  statusCounts: DeliveryStatusCounts;
  onTabSelect: (index: number) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  searchInputRef: React.RefObject<TextInput>;
}

export const ListHeader: React.FC<ListHeaderProps> = React.memo(
  ({ selectedTab, statusCounts, onTabSelect, searchText, onSearchChange, searchInputRef }) => (
    <View style={styles.expandedListHeader}>
      <View style={styles.tabsWrapper}>
        <FloatingStatusTabs selectedTab={selectedTab} tabsTotalLength={statusCounts} onSelectStatus={onTabSelect} />
      </View>
      <SearchInput value={searchText} onChangeText={onSearchChange} searchInputRef={searchInputRef} />
    </View>
  )
);

ListHeader.displayName = 'ListHeader';
