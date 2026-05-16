import React from 'react';
import { View, Text } from 'react-native';

import { styles } from './styles';

interface ExpandedViewHeaderProps {
  deliveryCount: number;
  driverName: string;
}

export const ExpandedViewHeader: React.FC<ExpandedViewHeaderProps> = ({ deliveryCount, driverName }) => (
  <View style={styles.titleContainer}>
    <Text style={styles.allDeliveriesTitle}>All Deliveries ({deliveryCount})</Text>
    <View style={styles.driverNameContainer}>
      <Text style={styles.driverNameLabel}>Driver name: </Text>
      <Text style={styles.driverNameText}>{driverName}</Text>
    </View>
  </View>
);
