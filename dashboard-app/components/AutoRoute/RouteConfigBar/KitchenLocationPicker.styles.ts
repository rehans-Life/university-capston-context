export const styles = {
  backdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 99999,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    zIndex: 100000,
    minWidth: '600px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '16px'
  },
  header: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '12px'
  },
  title: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: '4px'
  },
  selectedLocation: {
    fontSize: '12px',
    color: '#10b981',
    fontWeight: '500' as const
  },
  buttonGroup: {
    display: 'flex' as const,
    gap: '8px',
    alignItems: 'center' as const
  },
  confirmButton: {
    padding: '8px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none' as const,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer' as const,
    minWidth: '100px',
    transition: 'background 0.2s'
  },
  confirmButtonHover: {
    background: '#059669'
  },
  confirmButtonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed' as const
  },
  closeButton: {
    padding: '8px 12px',
    background: '#ef4444',
    color: 'white',
    border: 'none' as const,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer' as const,
    minWidth: '80px',
    transition: 'background 0.2s'
  },
  closeButtonHover: {
    background: '#dc2626'
  },
  instructions: {
    fontSize: '12px',
    color: '#6b7280',
    padding: '8px 12px',
    background: '#f3f4f6',
    borderRadius: '6px'
  },
  mapContainer: {
    height: '450px',
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden' as const,
    border: '2px solid #e5e7eb',
    position: 'relative' as const
  },
  map: {
    height: '100%',
    width: '100%'
  }
};
