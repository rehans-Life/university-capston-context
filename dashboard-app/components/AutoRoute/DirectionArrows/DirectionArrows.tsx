import L from 'leaflet';
import 'leaflet-polylinedecorator';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { DirectionArrowsProps } from '../types';

const DirectionArrows: React.FC<DirectionArrowsProps> = ({ positions, color = 'red' }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !positions || positions.length < 2) return;

    // Draw the main route line
    const arrowLine = L.polyline(positions, { color }).addTo(map);

    // Add repeating arrowheads along the line
    const decorator = (L as any).polylineDecorator(arrowLine, {
      patterns: [
        {
          offset: 12,
          repeat: 50, // arrow spacing (px)
          symbol: (L as any).Symbol.arrowHead({
            pixelSize: 10,
            polygon: false,
            pathOptions: { stroke: true, color, weight: 2 }
          })
        }
      ]
    });

    decorator.addTo(map);

    // Cleanup when unmounted
    return () => {
      map.removeLayer(arrowLine);
      map.removeLayer(decorator);
    };
  }, [map, positions, color]);

  return null;
};

export default DirectionArrows;
