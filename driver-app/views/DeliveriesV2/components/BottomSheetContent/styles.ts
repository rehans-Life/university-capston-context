import { StyleSheet } from 'react-native';

import { colors } from '@components/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey[50]
  },
  collapsedContainer: {
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1
  },
  tabsWrapper: {
    paddingTop: 8,
    paddingBottom: 8
  },
  collapsedCardWrapper: {
    paddingHorizontal: 20
  },
  allDeliveriesContainer: {
    flex: 1
  },
  expandedListHeader: {
    paddingTop: 12
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingTop: 8
  },
  allDeliveriesTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.grey[900],
    letterSpacing: -0.5
  },
  driverNameContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  driverNameLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.grey[600]
  },
  driverNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey[900]
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grey[100],
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    height: 48
  },
  searchIcon: {
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.grey[900],
    paddingVertical: 0
  },
  clearButton: {
    marginLeft: 8,
    padding: 4
  },
  deliveryCardWrapper: {
    paddingHorizontal: 20,
    marginBottom: 4
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.grey[700],
    marginTop: 16
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.grey[500],
    marginTop: 8
  }
});
