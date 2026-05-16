import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { colors } from '@components/theme';

import { DeliveryStatusCounts } from '../../types/interfaces';

interface FloatingStatusTabsProps {
  selectedTab: number;
  tabsTotalLength: DeliveryStatusCounts;
  onSelectStatus: (index: number) => void;
}

const FloatingStatusTabs: React.FC<FloatingStatusTabsProps> = ({ selectedTab, tabsTotalLength, onSelectStatus }) => {
  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          onPress={() => onSelectStatus(0)}
          style={[styles.tab, selectedTab === 0 && styles.tabActive]}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, selectedTab === 0 ? styles.tabTextActive : styles.tabTextInactive]}>
            New ({tabsTotalLength.new}/{tabsTotalLength.totalDeliveries})
          </Text>
          {selectedTab === 0 && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectStatus(1)}
          style={[styles.tab, selectedTab === 1 && styles.tabActive]}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, selectedTab === 1 ? styles.tabTextActive : styles.tabTextInactive]}>
            Pending ({tabsTotalLength.pending}/{tabsTotalLength.totalDeliveries})
          </Text>
          {selectedTab === 1 && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectStatus(2)}
          style={[styles.tab, selectedTab === 2 && styles.tabActive]}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, selectedTab === 2 ? styles.tabTextActive : styles.tabTextInactive]}>
            Delivered ({tabsTotalLength.delivered}/{tabsTotalLength.totalDeliveries})
          </Text>
          {selectedTab === 2 && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.system.white,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.grey[200]
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'relative',
    borderRadius: 8,
    minHeight: 40
  },
  tabActive: {
    backgroundColor: colors.grey[50]
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16
  },
  tabTextActive: {
    color: colors.grey[900],
    fontWeight: '700'
  },
  tabTextInactive: {
    color: colors.grey[600]
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 3,
    backgroundColor: colors.caloGreen[500],
    borderRadius: 2
  }
});

export default FloatingStatusTabs;
