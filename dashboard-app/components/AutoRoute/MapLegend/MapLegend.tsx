// Standalone Legend component (no Leaflet dependency)
interface MapLegendProps {
  showCustomKitchen?: boolean;
  isSimpleMode?: boolean;
}

export function MapLegend({ showCustomKitchen, isSimpleMode }: MapLegendProps) {
  return (
    <div
      style={{
        background: 'white',
        padding: '6px 12px',
        borderRadius: '6px',
        boxShadow: '0 0 4px rgba(0,0,0,0.15)',
        fontSize: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
    >
      <div style={{ fontWeight: '600', marginRight: '4px', fontSize: '10px' }}>Legend</div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div dangerouslySetInnerHTML={{ __html: greenCircleSVG('K') }} />
        <span style={{ marginLeft: '4px' }}>Kitchen</span>
      </div>

      {isSimpleMode ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div dangerouslySetInnerHTML={{ __html: greenCircleSVG(' ') }} />
          <span style={{ marginLeft: '4px' }}>Delivery</span>
        </div>
      ) : (
        <>
          {showCustomKitchen && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div dangerouslySetInnerHTML={{ __html: customKitchenCircleSVG('CK') }} />
              <span style={{ marginLeft: '4px' }}>Custom Kitchen</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div dangerouslySetInnerHTML={{ __html: greenCircleSVG(' ') }} />
            <span style={{ marginLeft: '4px' }}>Within Time Window</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div dangerouslySetInnerHTML={{ __html: greenHexSVG() }} />
            <span style={{ marginLeft: '4px' }}>Outside Time Window</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div dangerouslySetInnerHTML={{ __html: greenTriangleSVG() }} />
            <span style={{ marginLeft: '4px' }}>Skipped Delivery</span>
          </div>
        </>
      )}
    </div>
  );
}

// --- Small inline SVGs for legend preview ---
const greenCircleSVG = (text) => `
  <svg width="16" height="16">
    <circle cx="8" cy="8" r="6" fill="#28a745" stroke="black" stroke-width="0.8"/>
    <text x="8" y="11" font-size="8" fill="white" text-anchor="middle" font-family="Arial">${text}</text>
  </svg>
`;

const greenTriangleSVG = () => `
  <svg width="16" height="16">
    <polygon points="8,2 14,14 2,14" fill="#28a745" stroke="black" stroke-width="0.8"/>
  </svg>
`;

const greenHexSVG = () => `
  <svg width="16" height="16">
    <polygon points="8,2 13,6 13,10 8,14 3,10 3,6"
      fill="#28a745" stroke="black" stroke-width="0.8"/>
  </svg>
`;

const customKitchenCircleSVG = (text: string) => `
  <svg width="16" height="16">
    <circle cx="8" cy="8" r="6" fill="#ff9800" stroke="black" stroke-width="0.8"/>
    <text x="8" y="11" font-size="7" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">${text}</text>
  </svg>
`;
