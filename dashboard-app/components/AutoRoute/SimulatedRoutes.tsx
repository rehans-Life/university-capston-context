import { Button } from '@mui/material';
import { caloTheme } from 'assets/images/theme/calo';
import { RoutesTable } from 'components/RoutesTable/RoutesTable';
import { useAssignRoute } from 'hooks/useAssignRoute';
import L from 'leaflet';
import 'leaflet-polylinedecorator';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { getMarkerIcon } from 'lib/helpers/automatedRouting';
import { AutoRouteItem } from 'lib/interfaces';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import DirectionArrows from './DirectionArrows';
import { LoadingOverlay } from './LoadingOverlay/LoadingOverlay';
import { InitialDeliveryItem, SimulatedRoutesProps } from './types';

// Fix default Leaflet markers
const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow });
L.Marker.prototype.options.icon = DefaultIcon;

// Red marker icon for mock deliveries
const RedMarkerIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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

const SimulatedRoutes = ({
  routeID,
  kitchenPosition,
  initialDeliveries,
  deliveries,
  lookbackDays,
  stats,
  isLoading,
  setDeliveries,
  autoRoutePlanData,
  handleCancelPolling,
  fileName,
  customKitchenLocation,
  country
}: SimulatedRoutesProps) => {
  const mutation = useAssignRoute(routeID, deliveries, fileName, autoRoutePlanData);

  const handleAssignRoute = () => {
    if (!autoRoutePlanData) return;
    mutation.mutate();
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Loading Overlay */}
      <LoadingOverlay isRunning={isLoading} onCancel={handleCancelPolling} />
      {/* Main Content */}
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          gap: '8px',
          overflow: 'hidden',
          opacity: isLoading ? 0.3 : 1,
          transition: 'opacity 0.3s ease'
        }}
      >
        {/* Left Column: Stats + Map */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Top Stats Bar */}
          <div
            style={{
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255, 255, 255, 0.95)',
              borderBottom: '1px solid #ccc',
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {/* Header Title */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: '600',
                color: caloTheme.palette.primary.main,
                padding: '6px 10px',
                borderBottom: '1px solid #e0e0e0',
                letterSpacing: '0.3px'
              }}
            >
              Simulated Deliveries
            </div>
            {/* Stats Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '8px 10px',
                fontSize: '11px',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Delivery Time:</span>
                <span style={{ color: caloTheme.palette.primary.main, fontWeight: '700' }}>
                  {stats.simulatedDeliveryDuration}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Time:</span>
                <span style={{ color: caloTheme.palette.primary.main, fontWeight: '700' }}>{stats.simulatedTime}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Deliveries:</span>
                <span style={{ color: caloTheme.palette.primary.main, fontWeight: '700' }}>
                  {stats.simulatedDeliveriesCompleted}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Within Window:</span>
                <span style={{ color: caloTheme.palette.primary.main, fontWeight: '700' }}>{stats.simulatedWithinWindow}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Lookback Days:</span>
                <span style={{ color: caloTheme.palette.primary.main, fontWeight: '700' }}>{lookbackDays}</span>
              </div>
            </div>
          </div>

          {/* Map */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <MapContainer center={[kitchenPosition.lat, kitchenPosition.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

              {deliveries.length > 0 ? (
                <>
                  {deliveries
                    .filter((stop) => stop.lat !== undefined && stop.lng !== undefined)
                    .map((stop: AutoRouteItem, idx: number) => {
                      return (
                        <Marker
                          key={`delivery-${idx}`}
                          position={[stop.lat as number, stop.lng as number]}
                          icon={getMarkerIcon(stop)}
                        >
                          <Popup>
                            deliveryId: {stop.id} <br />
                            Name: {stop.name} <br />
                            Priority: {stop.priority} <br />
                            DeliveredAt: {stop.deliveredAt ? stop.deliveredAt.slice(11, 19) : '-'} <br />
                            Index: {idx}
                          </Popup>
                        </Marker>
                      );
                    })}
                  <Polyline
                    positions={deliveries
                      .filter((s) => s.lat !== undefined && s.lng !== undefined)
                      .map((s: AutoRouteItem) => [s.lat as number, s.lng as number])}
                    color="blue"
                    weight={4}
                    interactive={false}
                  />
                  <DirectionArrows
                    positions={deliveries
                      .filter((s) => s.lat !== undefined && s.lng !== undefined)
                      .map((s: AutoRouteItem) => [s.lat as number, s.lng as number])}
                    color="blue"
                  />
                  {customKitchenLocation && (
                    <Marker
                      key="custom-kitchen"
                      position={[customKitchenLocation.lat, customKitchenLocation.lng]}
                      icon={CustomKitchenMarkerIcon}
                      zIndexOffset={1000}
                    >
                      <Popup>
                        Custom Kitchen Location <br />
                        Lat: {customKitchenLocation.lat} <br />
                        Lng: {customKitchenLocation.lng}
                      </Popup>
                    </Marker>
                  )}
                </>
              ) : (
                <>
                  {Object.values(initialDeliveries)?.map((stop: InitialDeliveryItem, idx: number) => {
                    const markerIcon = stop.id === 'KITCHEN' ? KitchenMarkerIcon : RedMarkerIcon;
                    return (
                      <Marker key={`delivery-${idx}`} position={[stop.origin.lat, stop.origin.lng]} icon={markerIcon}>
                        <Popup>
                          deliveryId: {stop?.id} <br />
                          Lat: {stop?.origin.lat} <br />
                          Lng: {stop?.origin.lng}
                        </Popup>
                      </Marker>
                    );
                  })}
                  {customKitchenLocation && (
                    <Marker
                      key="custom-kitchen"
                      position={[customKitchenLocation.lat, customKitchenLocation.lng]}
                      icon={CustomKitchenMarkerIcon}
                      zIndexOffset={1000}
                    >
                      <Popup>
                        Custom Kitchen Location <br />
                        Lat: {customKitchenLocation.lat} <br />
                        Lng: {customKitchenLocation.lng}
                      </Popup>
                    </Marker>
                  )}
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
              position: 'sticky',
              top: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.95)',
              borderBottom: '1px solid #ccc',
              padding: '7px',
              zIndex: 10
            }}
          >
            <div
              style={{
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: 'bold',
                color: caloTheme.palette.primary.main
              }}
            >
              Deliveries List
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* <RoutesTable
              data={deliveries}
              isDraggable={country === 'GB' ? false : true}
              onReorder={setDeliveries}
              country={country}
            /> */}
            <RoutesTable data={deliveries} isDraggable={false} onReorder={setDeliveries} country={country} />
          </div>

          {/* Assign Route Button */}
          <Button
            disabled={!autoRoutePlanData || mutation.isLoading || !!autoRoutePlanData.routes[0]?.error}
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
              '&.Mui-disabled': {
                backgroundColor: '#bdbdbd',
                color: '#f5f5f5',
                boxShadow: 'none',
                cursor: 'not-allowed'
              }
            }}
          >
            {mutation.isLoading ? 'Assigning...' : 'Assign Route'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SimulatedRoutes;
