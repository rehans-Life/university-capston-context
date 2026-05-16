import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: 'white', position: 'relative' },
  topBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingHorizontal: 10
  },
  driverNameView: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 'auto',
    marginTop: 12
  },
  driverNameText: {
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 18
  },
  actionTopBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    marginHorizontal: 8
  },
  scanView: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
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

export const whatsappBottomSheetStyles = StyleSheet.create({
  titleStyle: {
    fontSize: 24,
    // fontWeight: '700',
    fontFamily: 'Lato-Bold',
    textTransform: 'none'
  },
  optionsContainer: {
    padding: 20
  },
  optionButton: {
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  lastOptionButton: {
    borderBottomWidth: 0 // Remove bottom border for the last item
  },
  optionText: {
    fontSize: 16
  }
});
