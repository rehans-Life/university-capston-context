import L from 'leaflet';
import 'leaflet-polylinedecorator';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import RouteComplianceCard from 'views/DriversMetric/ExactDriverMetric/RouteComplianceCard';
import { LoadingOverlay } from './LoadingOverlay/LoadingOverlay';
import RouteMapTableView from './RouteMapTableView';
import { AllRoutesProps } from './types';

// Fix default marker icons
const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow });
L.Marker.prototype.options.icon = DefaultIcon;

const AllRoutes = ({
  kitchenPosition,
  initialDeliveries,
  isLoading,
  handleCancelPolling,
  simulatedRoutes,
  actualRoutes,
  stats,
  compliance,
  country
}: AllRoutesProps) => {
  const [toggleMapSimulated, setToggleMapSimulated] = useState(true);
  const [toggleMapActual, setToggleMapActual] = useState(true);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Loading Overlay */}
      <LoadingOverlay isRunning={isLoading} onCancel={handleCancelPolling} />

      {/* Route Compliance Card */}
      {compliance && <RouteComplianceCard compliance={compliance} />}

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
        {/* Left Column: Simulated Map + Stats */}
        <RouteMapTableView
          routes={simulatedRoutes}
          deliveries={simulatedRoutes}
          initialDeliveries={initialDeliveries}
          isMapView={toggleMapSimulated}
          setIsMapView={setToggleMapSimulated}
          kitchenPosition={kitchenPosition}
          keyPrefix="sim"
          title="Simulated Deliveries"
          stats={{
            deliveryDuration: stats.simulatedDeliveryDuration,
            time: stats.simulatedTime,
            deliveriesCompleted: stats.simulatedDeliveriesCompleted,
            withinWindow: stats.simulatedWithinWindow
          }}
          togglePosition="left"
          complianceData={compliance?.deliveries}
          travelTimeData={compliance?.travelTimeLegComparisons}
          country={country}
        />

        {/* Right Column: Actual Map + Stats */}
        <RouteMapTableView
          routes={actualRoutes}
          deliveries={actualRoutes}
          initialDeliveries={initialDeliveries}
          isMapView={toggleMapActual}
          setIsMapView={setToggleMapActual}
          kitchenPosition={kitchenPosition}
          keyPrefix="act"
          title="Actual Deliveries"
          stats={{
            deliveryDuration: stats.actualDeliveryDuration,
            time: stats.actualTime,
            deliveriesCompleted: stats.actualDeliveriesCompleted,
            withinWindow: stats.actualWithinWindow
          }}
          togglePosition="right"
          complianceData={compliance?.deliveries}
          travelTimeData={compliance?.travelTimeLegComparisons}
          country={country}
        />
      </div>
    </div>
  );
};

export default AllRoutes;
