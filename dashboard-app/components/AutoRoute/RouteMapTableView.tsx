import { LocationOnRounded as LocationPinIcon, TableChartRounded as TableIcon } from '@mui/icons-material';
import { caloTheme } from 'assets/images/theme/calo';
import RoutesTable from 'components/RoutesTable';
import L from 'leaflet';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { getMarkerIcon } from 'lib/helpers/automatedRouting';
import { AutoRouteItem, DeliveryComplianceItem, TravelTimeLegComparison } from 'lib/interfaces';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import DirectionArrows from './DirectionArrows';
import { InitialDeliveries, InitialDeliveryItem } from './types';

// Red marker icon for initial deliveries
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

interface RouteMapTableViewProps {
  routes: AutoRouteItem[];
  deliveries: AutoRouteItem[];
  initialDeliveries: InitialDeliveries;
  isMapView: boolean;
  setIsMapView: (value: boolean) => void;
  kitchenPosition: { lat: number; lng: number };
  keyPrefix: 'sim' | 'act';
  title: string;
  stats: {
    deliveryDuration: string;
    time: string;
    deliveriesCompleted: string;
    withinWindow: string | number;
  };
  togglePosition: 'left' | 'right';
  complianceData?: DeliveryComplianceItem[];
  travelTimeData?: TravelTimeLegComparison[];
  country: string;
}

const RouteMapTableView = ({
  routes,
  deliveries,
  initialDeliveries,
  isMapView,
  setIsMapView,
  kitchenPosition,
  keyPrefix,
  title,
  stats,
  togglePosition,
  complianceData,
  travelTimeData,
  country
}: RouteMapTableViewProps) => {
  const renderToggleSwitch = () => {
    return (
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          padding: '3px',
          background: '#f1f5f9',
          borderRadius: '6px',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Sliding Background */}
        <div
          style={{
            position: 'absolute',
            top: '3px',
            left: isMapView ? '3px' : 'calc(50% - 3px)',
            width: 'calc(50% - 3px)',
            height: 'calc(100% - 6px)',
            background: caloTheme.palette.primary.main,
            borderRadius: '4px',
            transition: 'left 0.3s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />

        {/* Map Option */}
        <button
          onClick={() => setIsMapView(true)}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '2px 12px',
            background: 'transparent',
            border: 'none',
            color: isMapView ? 'white' : '#64748b',
            fontWeight: '600',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'color 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <LocationPinIcon sx={{ fontSize: 14 }} />
        </button>

        {/* Table Option */}
        <button
          onClick={() => setIsMapView(false)}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '2px 12px',
            background: 'transparent',
            border: 'none',
            color: isMapView ? '#64748b' : 'white',
            fontWeight: '600',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'color 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <TableIcon sx={{ fontSize: 14 }} />
        </button>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Sticky Stats Bar */}
      <div
        style={{
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            borderBottom: '1px solid #e0e0e0'
          }}
        >
          {/* Toggle Switch - position based on prop */}
          {togglePosition === 'left' && <div style={{ flex: '0 0 auto' }}>{renderToggleSwitch()}</div>}

          {/* Center: Title */}
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '600',
              color: caloTheme.palette.primary.main,
              letterSpacing: '0.3px'
            }}
          >
            {title}
          </div>

          {/* Toggle Switch - position based on prop */}
          {togglePosition === 'right' && <div style={{ flex: '0 0 auto' }}>{renderToggleSwitch()}</div>}
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
            <span style={{ color: caloTheme.palette.primary.main, fontWeight: '700' }}>{stats.deliveryDuration}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Time:</span>
            <span style={{ color: caloTheme.palette.primary.main, fontWeight: '700' }}>{stats.time}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Deliveries:</span>
            <span style={{ color: caloTheme.palette.primary.main, fontWeight: '700' }}>{stats.deliveriesCompleted}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Within Window:</span>
            <span style={{ color: caloTheme.palette.primary.main, fontWeight: '700' }}>{stats.withinWindow}</span>
          </div>
        </div>
      </div>

      {/* Map or Table View */}
      {isMapView ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <MapContainer center={[kitchenPosition.lat, kitchenPosition.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {routes.length > 0 ? (
              <>
                {routes.map((stop: AutoRouteItem, idx: number) => (
                  <Marker key={`${keyPrefix}-${idx}`} position={[stop.lat!, stop.lng!]} icon={getMarkerIcon(stop)}>
                    <Popup>
                      ID: {stop.id} <br />
                      Name: {stop.name} <br />
                      Priority: {stop.priority} <br />
                      Delivered At: {stop.deliveredAt ? stop.deliveredAt.slice(11, 19) : '-'} <br />
                      Avg Delivered At: {stop?.avgDeliveredAt ? stop.avgDeliveredAt.slice(11, 19) : '-'} <br />
                      Index: {idx}
                    </Popup>
                  </Marker>
                ))}
                <Polyline
                  positions={routes.map((s: AutoRouteItem) => [s.lat!, s.lng!])}
                  color="blue"
                  weight={4}
                  interactive={false}
                />
                <DirectionArrows positions={routes.map((s: AutoRouteItem) => [s.lat!, s.lng!])} color="blue" />
              </>
            ) : (
              <>
                {Object.values(initialDeliveries)?.map((stop: InitialDeliveryItem, idx: number) => {
                  const markerIcon = stop.id === 'KITCHEN' ? KitchenMarkerIcon : RedMarkerIcon;
                  return (
                    <Marker key={`${keyPrefix}-initial-${idx}`} position={[stop.origin.lat, stop.origin.lng]} icon={markerIcon}>
                      <Popup>
                        deliveryId: {stop?.id} <br />
                        Lat: {stop?.origin.lat} <br />
                        Lng: {stop?.origin.lng}
                      </Popup>
                    </Marker>
                  );
                })}
              </>
            )}
          </MapContainer>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <RoutesTable
            isDraggable={false}
            data={deliveries}
            onReorder={() => {}}
            keyPrefix={keyPrefix}
            complianceData={complianceData}
            travelTimeData={travelTimeData}
            country={country}
          />
        </div>
      )}
    </div>
  );
};

export default RouteMapTableView;
