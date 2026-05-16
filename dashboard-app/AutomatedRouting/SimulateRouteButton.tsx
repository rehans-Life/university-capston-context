import { useCallback, useEffect, useRef, useState } from 'react';

interface SimulateRouteButtonProps {
  onSimulateRoute: () => void;
  onAnalyseRoute?: () => void;
  /** If true, Analyse Route is the primary button and Simulate Route is in dropdown. Default: false */
  analyseFirst?: boolean;
  /** If false, shows only the primary button without dropdown. Default: true */
  showDropdown?: boolean;
}

export const SimulateRouteButton = ({
  onSimulateRoute,
  onAnalyseRoute,
  analyseFirst = false,
  showDropdown = true
}: SimulateRouteButtonProps) => {
  const primaryAction = analyseFirst ? onAnalyseRoute! : onSimulateRoute;
  const secondaryAction = analyseFirst ? onSimulateRoute : onAnalyseRoute!;
  const primaryLabel = analyseFirst ? 'Analyse Route' : 'Simulate Route';
  const secondaryLabel = analyseFirst ? 'Simulate Route' : 'Analyse Route';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  return (
    <div
      ref={dropdownRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '6px',
        paddingRight: '6px',
        position: 'relative'
      }}
    >
      {/* Split Button Container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderRadius: '10px',
          background: 'linear-gradient(145deg, #10b981 0%, #059669 50%, #047857 100%)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(5, 150, 105, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Main Button */}
        <button
          onClick={primaryAction}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'transparent',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            outline: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          {analyseFirst ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
          {primaryLabel}
        </button>

        {/* Divider */}
        {showDropdown && (
          <div
            style={{
              width: '1px',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.25), rgba(255,255,255,0.1))',
              margin: '6px 0'
            }}
          />
        )}

        {/* Dropdown Arrow Button */}
        {showDropdown && (
          <button
            onClick={toggleDropdown}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 12px',
              background: isDropdownOpen ? 'rgba(0, 0, 0, 0.15)' : 'transparent',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {showDropdown && isDropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: '6px',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '10px',
            boxShadow: `
              0 0 0 1px rgba(0, 0, 0, 0.04),
              0 4px 12px rgba(0, 0, 0, 0.1),
              0 8px 24px -4px rgba(5, 150, 105, 0.15)
            `,
            overflow: 'hidden',
            zIndex: 50,
            padding: '4px'
          }}
        >
          <button
            onClick={() => {
              secondaryAction();
              setIsDropdownOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: 'transparent',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              outline: 'none'
            }}
          >
            {analyseFirst ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            )}
            {secondaryLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default SimulateRouteButton;
