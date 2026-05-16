import { Button } from '@mui/material';
import { caloTheme } from 'assets/images/theme/calo';
import { RoutesTable } from 'components/RoutesTable/RoutesTable';
import L from 'leaflet';
import 'leaflet-polylinedecorator';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { AutoRouteItem } from 'lib/interfaces';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import DirectionArrows from './DirectionArrows';

// Fix default Leaflet markers
const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow });
L.Marker.prototype.options.icon = DefaultIcon;

// Numbered marker icon for deliveries
const getNumberedMarkerIcon = (index: number) =>
  L.divIcon({
    className: 'custom-sequence-icon',
    html: `
      <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="12" fill="#28a745" stroke="black" stroke-width="2"/>
        <text x="14" y="18" font-size="14" fill="white" text-anchor="middle" font-family="Arial">${index + 1}</text>
      </svg>
  `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

const KitchenMarkerIcon = L.divIcon({
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

interface SimpleSimulatedRoutesProps {
  kitchenPosition: { lat: number; lng: number };
  initialDeliveries: AutoRouteItem[];
  country: string;
  isAssigning?: boolean;
  onAssign?: (deliveries: AutoRouteItem[]) => void;
  onReorder?: (reorderedDeliveries: AutoRouteItem[]) => void;
}

const SimpleSimulatedRoutes = ({
  kitchenPosition,
  initialDeliveries,
  country,
  isAssigning = false,
  onAssign,
  onReorder
}: SimpleSimulatedRoutesProps) => {
  const [deliveries, setDeliveries] = useState<AutoRouteItem[]>(initialDeliveries);

  // Sync state when initialDeliveries prop changes
  useEffect(() => {
    setDeliveries(initialDeliveries);
  }, [initialDeliveries]);

  const handleReorderInternal = (reorderedDeliveries: AutoRouteItem[]) => {
    const kitchenPickup = deliveries.find((d) => d.id === 'KITCHEN_PICKUP');
    const deliveriesWithoutKitchen = reorderedDeliveries.filter((d) => d.id !== 'KITCHEN_PICKUP');
    const updatedDeliveries = deliveriesWithoutKitchen.map((delivery, index) => ({
      ...delivery,
      priority: index + 1
    }));

    const fullDeliveries = kitchenPickup ? [kitchenPickup, ...updatedDeliveries] : updatedDeliveries;
    setDeliveries(fullDeliveries);
    if (onReorder) {
      onReorder(fullDeliveries);
    }
  };

  const handleAssignRoute = () => {
    if (onAssign) {
      onAssign(deliveries);
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          gap: '8px',
          overflow: 'hidden'
        }}
      >
        {/* Left Column: Map */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Header */}
          <div
            style={{
              flexShrink: 0,
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '600',
              color: caloTheme.palette.primary.main,
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.95)',
              borderBottom: '1px solid #ccc',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Route Map ({deliveries.length} deliveries)
          </div>

          {/* Map */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <MapContainer center={[kitchenPosition.lat, kitchenPosition.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

              {/* Kitchen Marker */}
              <Marker position={[kitchenPosition.lat, kitchenPosition.lng]} icon={KitchenMarkerIcon} zIndexOffset={1000}>
                <Popup>
                  Kitchen Location <br />
                  Lat: {kitchenPosition.lat} <br />
                  Lng: {kitchenPosition.lng}
                </Popup>
              </Marker>

              {/* Delivery Markers */}
              {deliveries
                .filter((stop) => stop.lat !== undefined && stop.lng !== undefined && stop.id !== 'KITCHEN_PICKUP')
                .map((stop: AutoRouteItem, idx: number) => (
                  <Marker
                    key={`delivery-${stop.id}-${idx}`}
                    position={[stop.lat as number, stop.lng as number]}
                    icon={getNumberedMarkerIcon(idx)}
                  >
                    <Popup>
                      <strong>#{idx + 1}</strong> <br />
                      ID: {stop.id} <br />
                      Name: {stop.name} <br />
                      Priority: {stop.priority}
                    </Popup>
                  </Marker>
                ))}

              {/* Route Line */}
              {deliveries.length > 0 && (
                <>
                  <Polyline
                    positions={[
                      [kitchenPosition.lat, kitchenPosition.lng],
                      ...deliveries
                        .filter((s) => s.lat !== undefined && s.lng !== undefined && s.id !== 'KITCHEN_PICKUP')
                        .map((s: AutoRouteItem) => [s.lat as number, s.lng as number] as [number, number])
                    ]}
                    color="#3b82f6"
                    weight={3}
                    interactive={false}
                  />
                  <DirectionArrows
                    positions={[
                      [kitchenPosition.lat, kitchenPosition.lng],
                      ...deliveries
                        .filter((s) => s.lat !== undefined && s.lng !== undefined && s.id !== 'KITCHEN_PICKUP')
                        .map((s: AutoRouteItem) => [s.lat as number, s.lng as number] as [number, number])
                    ]}
                    color="#3b82f6"
                  />
                </>
              )}
            </MapContainer>
          </div>
        </div>

        {/* Right Column: Table + Assign Button */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {/* Table Header */}
          <div
            style={{
              flexShrink: 0,
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '600',
              color: caloTheme.palette.primary.main,
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.95)',
              borderBottom: '1px solid #ccc',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Deliveries List
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <RoutesTable
              data={deliveries}
              isDraggable={true}
              onReorder={handleReorderInternal}
              country={country}
              keyPrefix="simple"
            />
          </div>

          {/* Assign Route Button */}
          {onAssign && (
            <Button
              disabled={isAssigning || deliveries.length === 0}
              onClick={handleAssignRoute}
              sx={{
                position: 'sticky',
                bottom: '12px',
                margin: '12px',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: caloTheme.palette.primary.main,
                '&:hover': {
                  backgroundColor: caloTheme.palette.primary.dark
                },
                '&.Mui-disabled': {
                  backgroundColor: '#bdbdbd',
                  color: '#f5f5f5',
                  boxShadow: 'none',
                  cursor: 'not-allowed'
                }
              }}
            >
              {isAssigning ? 'Assigning...' : 'Assign Route'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleSimulatedRoutes;
