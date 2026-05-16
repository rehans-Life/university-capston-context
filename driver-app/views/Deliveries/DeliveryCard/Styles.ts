import { StyleSheet } from 'react-native';

import theme from '../../../../custom-theme.json';
import { GREEN_COLOR, NEUTRAL_50 } from '../../../types/constants';

export const styles = StyleSheet.create({
  topCardView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  item: {
    marginVertical: 8,
    paddingBottom: 6,
    borderRadius: 5
  },
  rowAlighSpaceBetween: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  rowBlock: {
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  pendingPanel: {
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 5
  },
  shadow: {
    shadowOffset: { width: 0, height: 6 },
    shadowColor: theme['color-basic-800'],
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 7,
    backgroundColor: theme['color-basic-100']
  },
  mainView: {
    flexDirection: 'row',
    flex: 1,
    paddingVertical: 6
  },
  shortIdView: {
    paddingLeft: 16,
    paddingVertical: 5,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  shortIdText: {
    marginRight: 14,
    fontFamily: 'Lato-Bold'
  },
  priorityText: {
    fontFamily: 'Roboto',
    backgroundColor: '#CDE7D9',
    borderRadius: 50,
    height: 32,
    width: 32,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    marginRight: 12,
    lineHeight: 19,
    fontWeight: '400',
    color: '#397555'
  },
  statusText: {
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Lato-Bold',
    color: '#DC2626'
  },
  driverNoteCard: {
    backgroundColor: theme['color-danger-transparent-100'],
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#FF6B6B'
  },
  driverNoteTitle: {
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 4
  },
  nameText: {
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Lato-Bold',
    color: '#2B2B2B'
  },
  phoneNumberText: {
    fontWeight: '600',
    color: 'black',
    fontSize: 16,
    lineHeight: 24
  },
  whatsappButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: GREEN_COLOR,
    width: 48,
    height: 48,
    borderRadius: 8,
    margin: 6,
    marginRight: 8,
    textAlignVertical: 'center',
    textAlign: 'center'
  },
  navigatorButton: {
    backgroundColor: theme['color-primary-500'],
    width: 48,
    height: 48,
    borderRadius: 8,
    marginVertical: 6,
    marginLeft: 6,
    textAlignVertical: 'center',
    textAlign: 'center'
  },
  actionsButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  showNameButton: {
    paddingVertical: 2,
    flexDirection: 'row'
  },
  showNameText: {
    color: GREEN_COLOR,
    fontSize: 14,
    fontWeight: '700'
  },
  ////////////////////////////////Delivery Instructions////////////////////////////////
  cardContainer: {
    backgroundColor: NEUTRAL_50,
    borderRadius: 6,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginHorizontal: 16,
    marginVertical: 4
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 4
  },
  headerText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: 'black'
  },
  instructionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  },
  cardContent: {
    marginTop: 10
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginRight: '10%',
    marginBottom: 4,
    marginHorizontal: 2
  },
  instructionText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginHorizontal: 4
  },
  noteSection: {
    marginTop: 12
  },
  noteText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20
  },
  noteContent: {
    marginTop: 4,
    fontSize: 16
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  instructionBox: {
    width: '48%',
    marginBottom: 12
  },
  ////////////////////////////////////////////////////////////////
  previewImageContainer: {
    marginBottom: 12,
    marginTop: 8,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    overflow: 'hidden'
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10
  }
});
