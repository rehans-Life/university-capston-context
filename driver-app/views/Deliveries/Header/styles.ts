import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: 'white', position: 'relative' },
  topBarContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingHorizontal: 10
  },
  driverNameView: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginVertical: 'auto',
    marginTop: 6
  },
  driverNameText: {
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 19,
    marginLeft: 2
  },
  deliveryTimeText: {
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    marginLeft: 2,
    marginTop: 4
  },
  actionTopBarContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    marginHorizontal: 8,
    width: '100%'
  },
  scanView: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginHorizontal: 7
  },
  loadingIndicator: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deliveriesTextIndicator: {
    height: '80%',
    textAlignVertical: 'center',
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 32,
    color: '#3A3A3A',
    fontFamily: 'Lato'
  }
});
