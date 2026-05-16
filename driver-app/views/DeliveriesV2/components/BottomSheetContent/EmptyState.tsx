import React from 'react';
import { View, Text } from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';

import { colors } from '@components/theme';

import { styles } from './styles';

interface EmptyStateProps {
  icon: string;
  text: string;
  subtext?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, text, subtext }) => (
  <View style={styles.emptyState}>
    <Icon name={icon} size={48} color={colors.grey[400]} />
    <Text style={styles.emptyStateText}>{text}</Text>
    {subtext && <Text style={styles.emptyStateSubtext}>{subtext}</Text>}
  </View>
);
