import { StyleSheet } from 'react-native';

import { colors } from '@components/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.system.white
  },
  farFromDeliveryMessage: {
    fontSize: 14,
    color: colors.grey[700],
    marginBottom: 16,
    lineHeight: 20
  },
  farFromDeliveryDistance: {
    color: colors.orange[700],
    fontWeight: '700'
  }
});
