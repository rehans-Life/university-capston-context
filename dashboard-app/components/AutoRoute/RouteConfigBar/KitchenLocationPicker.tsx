import L from 'leaflet';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { styles } from './KitchenLocationPicker.styles';
import { MapClickHandler } from './MapClickHandler';

// Custom Kitchen marker icon (matches SimulatedRoutes.tsx)
const CustomKitchenMarkerIcon = L.divIcon({
  className: 'custom-kitchen-icon',
  html: `
    <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#ff9800" stroke="black" stroke-width="2"/>
      <text x="14" y="18" font-size="12" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">CK</text>
    </svg>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Default kitchen location marker icon (matches SimulatedRoutes.tsx KitchenMarkerIcon)
const DefaultKitchenMarkerIcon = L.divIcon({
  className: 'custom-sequence-icon',
  html: `
    <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#28a745" stroke="black" stroke-width="2"/>
      <text x="14" y="18" font-size="14" fill="white" text-anchor="middle" font-family="Arial">K</text>
    </svg>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

interface KitchenLocationPickerProps {
  isOpen: boolean;
  customKitchenLocation: { lat: number; lng: number } | null;
  defaultKitchenLocation: { lat: number; lng: number };
  currentKitchenLocation: { lat: number; lng: number };
  onMapClick: (lat: number, lng: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const KitchenLocationPicker = ({
  isOpen,
  customKitchenLocation,
  defaultKitchenLocation,
  currentKitchenLocation,
  onMapClick,
  onClose,
  onConfirm
}: KitchenLocationPickerProps) => {
  const [isCloseButtonHovered, setIsCloseButtonHovered] = useState(false);
  const [isConfirmButtonHovered, setIsConfirmButtonHovered] = useState(false);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop - darker and prevents interaction with background */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Select Custom Kitchen Location</div>
            {customKitchenLocation && (
              <div style={styles.selectedLocation}>
                Selected: Lat {customKitchenLocation.lat.toFixed(6)}, Lng {customKitchenLocation.lng.toFixed(6)}
              </div>
            )}
          </div>
          <div style={styles.buttonGroup}>
            <button
              onClick={onClose}
              style={{
                ...styles.closeButton,
                background: isCloseButtonHovered ? styles.closeButtonHover.background : styles.closeButton.background
              }}
              onMouseEnter={() => setIsCloseButtonHovered(true)}
              onMouseLeave={() => setIsCloseButtonHovered(false)}
            >
              Close
            </button>
            <button
              onClick={onConfirm}
              style={{
                ...styles.confirmButton,
                background: customKitchenLocation
                  ? isConfirmButtonHovered
                    ? styles.confirmButtonHover.background
                    : styles.confirmButton.background
                  : styles.confirmButtonDisabled.background,
                cursor: customKitchenLocation ? styles.confirmButton.cursor : styles.confirmButtonDisabled.cursor
              }}
              onMouseEnter={() => setIsConfirmButtonHovered(true)}
              onMouseLeave={() => setIsConfirmButtonHovered(false)}
              disabled={customKitchenLocation === null}
            >
              Confirm
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div style={styles.instructions}>
          <strong>Instructions:</strong> Click anywhere on the map to set the kitchen location. The orange marker (CK) shows your
          selected location. The green marker (K) shows the default kitchen location for reference.
        </div>

        {/* Map */}
        <div style={styles.mapContainer}>
          <MapContainer center={[currentKitchenLocation.lat, currentKitchenLocation.lng]} zoom={13} style={styles.map}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapClickHandler onMapClick={onMapClick} />
            {customKitchenLocation && (
              <Marker position={[customKitchenLocation.lat, customKitchenLocation.lng]} icon={CustomKitchenMarkerIcon} />
            )}
            {/* Show default kitchen location as a reference marker */}
            <Marker position={[defaultKitchenLocation.lat, defaultKitchenLocation.lng]} icon={DefaultKitchenMarkerIcon} />
          </MapContainer>
        </div>
      </div>
    </>,
    document.body
  );
};
