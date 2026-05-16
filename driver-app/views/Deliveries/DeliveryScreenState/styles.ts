import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2' // Example background color
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white' // Assuming a white background for these views
  },
  finishShiftButton: {
    borderRadius: 8,
    marginHorizontal: 24,
    marginBottom: 32,
    paddingVertical: 12, // Example padding inside the button
    paddingHorizontal: 20, // Example padding inside the button
    backgroundColor: '#007bff', // Example button color
    color: 'white', // Text color inside the button
    fontSize: 18, // Text font size inside the button
    fontWeight: 'bold', // Text weight inside the button
    textAlign: 'center' // Align text inside the button
  },
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
  deliveriesTextIndicator: {
    height: '80%',
    textAlignVertical: 'center',
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 32,
    color: '#B1B1B1',
    fontFamily: 'Lato'
  }
});
