/**
 * ReasonPopup Component
 * ====================
 *
 * Reusable modal that asks for a text reason with Confirm/Cancel.
 * Used for: far-from-delivery confirmation, out-of-sequence delivery, etc.
 */

import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import Button from '@components/Button';
import { colors } from '@components/theme';

export interface ReasonPopupProps {
  visible: boolean;
  title: string;
  message: string | React.ReactNode;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
  placeholder?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const ReasonPopup: React.FC<ReasonPopupProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
  placeholder = 'Enter reason',
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel'
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim() && !loading) {
      onConfirm(reason.trim());
    }
  };

  const handleCancel = () => {
    if (!loading) {
      setReason('');
      onCancel();
    }
  };

  useEffect(() => {
    if (!visible) {
      setReason('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.backdrop} onTouchEnd={handleCancel}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true} onTouchEnd={(e) => e.stopPropagation()}>
          <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            {typeof message === 'string' ? <Text style={styles.message}>{message}</Text> : message}
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor={colors.grey[500]}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
            <View style={styles.buttonContainer}>
              <Button
                onButtonPress={handleCancel}
                buttonText={cancelButtonText}
                type="outlined"
                disabled={loading}
                customButtonStyle={[styles.button, styles.cancelButton]}
                customTextStyle={styles.buttonText}
              />
              <Button
                onButtonPress={handleConfirm}
                buttonText={confirmButtonText}
                type="contained"
                disabled={!reason.trim() || loading}
                loading={loading}
                customButtonStyle={[
                  styles.button,
                  styles.confirmButton,
                  {
                    backgroundColor: reason.trim() ? colors.caloGreen[600] : colors.grey[300],
                    borderColor: reason.trim() ? colors.caloGreen[600] : colors.grey[300]
                  }
                ]}
                customTextStyle={styles.buttonText}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '90%',
    maxWidth: 400
  },
  container: {
    backgroundColor: colors.system.white,
    borderRadius: 16,
    padding: 20
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.grey[900],
    marginBottom: 12
  },
  message: {
    fontSize: 14,
    color: colors.grey[700],
    marginBottom: 16,
    lineHeight: 20
  },
  input: {
    borderWidth: 1,
    borderColor: colors.grey[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.grey[900],
    backgroundColor: colors.grey[50],
    minHeight: 100,
    marginBottom: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 8
  },
  cancelButton: {
    borderColor: colors.grey[300]
  },
  confirmButton: {
    backgroundColor: colors.caloGreen[600]
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600'
  }
});

export default ReasonPopup;
