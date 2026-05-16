export const styles = {
  container: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '2px'
  },
  mainBar: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '6px',
    flexWrap: 'wrap' as const,
    padding: '4px 8px',
    background: '#f9fafb',
    borderRadius: '4px',
    border: '1px solid #e5e7eb'
  },
  fieldContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '4px'
  },
  label: {
    fontWeight: '500' as const,
    color: '#6b7280',
    fontSize: '11px',
    whiteSpace: 'nowrap' as const
  },
  input: {
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    fontSize: '11px',
    color: '#374151',
    background: 'white',
    outline: 'none' as const
  },
  inputNumber: {
    width: '50px',
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    fontSize: '11px',
    color: '#374151',
    background: 'white',
    outline: 'none' as const
  },
  select: {
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    fontSize: '11px',
    color: '#374151',
    background: 'white',
    cursor: 'pointer' as const,
    outline: 'none' as const
  },
  divider: {
    width: '1px',
    height: '16px',
    background: '#d1d5db'
  },
  toggleContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    padding: '1px',
    cursor: 'pointer' as const,
    position: 'relative' as const,
    height: '22px'
  },
  toggleOption: {
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: '500' as const,
    transition: 'color 0.2s',
    whiteSpace: 'nowrap' as const,
    zIndex: 2,
    position: 'relative' as const
  },
  toggleOptionActive: {
    color: '#374151'
  },
  toggleOptionInactive: {
    color: '#9ca3af'
  },
  toggleSlider: (isCustom: boolean) => ({
    position: 'absolute' as const,
    top: '1px',
    left: isCustom ? '50%' : '1px',
    width: 'calc(50% - 1px)',
    height: 'calc(100% - 2px)',
    background: isCustom ? '#10b981' : '#6b7280',
    borderRadius: '11px',
    transition: 'left 0.2s ease',
    zIndex: 0
  }),
  customLocationButton: {
    padding: '2px 6px',
    background: '#10b981',
    color: 'white',
    border: 'none' as const,
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '500' as const,
    cursor: 'pointer' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: '4px',
    display: 'flex' as const
  },
  customLocationButtonText: {
    fontWeight: '500' as const
  },
  warningMessage: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '4px',
    padding: '2px 8px',
    background: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#92400e',
    whiteSpace: 'nowrap' as const
  },
  warningText: {
    fontWeight: '500' as const
  },
  endAtKitchenContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
    padding: '6px 12px',
    background: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer' as const,
    transition: 'background 0.2s',
    height: '38px'
  },
  endAtKitchenToggle: (isEnabled: boolean) => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    position: 'relative' as const,
    transition: 'background-color 0.3s',
    flexShrink: 0,
    backgroundColor: isEnabled ? '#10b981' : '#d1d5db'
  }),
  endAtKitchenKnob: (isEnabled: boolean) => ({
    width: '20px',
    height: '20px',
    borderRadius: '10px',
    backgroundColor: 'white',
    position: 'absolute' as const,
    top: '2px',
    left: isEnabled ? '22px' : '2px',
    transition: 'left 0.3s'
  }),
  endAtKitchenLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500' as const
  },
  // Optimization Slider Styles
  optimizationContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '12px',
    flex: 1
  },
  optimizationSliderWrapper: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    flex: 1,
    minWidth: '280px'
  },
  optimizationSliderRow: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '8px'
  },
  optimizationSliderLabel: {
    fontSize: '10px',
    color: '#6b7280',
    whiteSpace: 'nowrap' as const
  },
  optimizationSliderTrack: {
    flex: 1,
    position: 'relative' as const
  },
  optimizationNotchesContainer: {
    position: 'absolute' as const,
    top: '50%',
    left: '0',
    right: '0',
    transform: 'translateY(-50%)',
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    padding: '0 2px',
    pointerEvents: 'none' as const
  },
  optimizationNotch: (isActive: boolean, isCurrent: boolean, primaryColor: string) => ({
    width: '2px',
    height: isCurrent ? '14px' : '8px',
    backgroundColor: isActive ? primaryColor : '#d1d5db',
    borderRadius: '1px',
    transition: 'all 0.15s ease'
  }),
  optimizationSliderInput: (primaryColor: string) => ({
    width: '100%',
    height: '6px',
    cursor: 'pointer' as const,
    accentColor: primaryColor,
    background: 'transparent',
    position: 'relative' as const,
    zIndex: 1
  }),
  optimizationLabelContainer: {
    display: 'flex' as const,
    justifyContent: 'center' as const,
    marginTop: '4px'
  },
  optimizationLabelBadge: (primaryColor: string, backgroundColor: string) => ({
    fontSize: '11px',
    fontWeight: 600,
    color: primaryColor,
    backgroundColor: backgroundColor,
    padding: '2px 8px',
    borderRadius: '4px'
  })
};
