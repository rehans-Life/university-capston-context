import { StyleSheet } from 'react-native';

import { colors } from '@components/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.system.white
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 300
  },
  headerWrapper: {
    paddingBottom: 8
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8
  },
  deliveriesList: {
    paddingHorizontal: 20,
    paddingTop: 8
  },
  deliveryCardWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12
  }
});
