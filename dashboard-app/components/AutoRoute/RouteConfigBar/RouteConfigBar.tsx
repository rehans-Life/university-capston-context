import { caloTheme } from 'assets/images/theme/calo';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { WindowType } from 'lib/enums';
import { SidebarValues } from 'lib/interfaces';
import { useRef, useState } from 'react';
import { getCurrentPresetIndex, WEIGHT_LABELS, WEIGHT_PRESETS } from './CostModelHelper';
import { KitchenLocationPicker } from './KitchenLocationPicker';
import { NextDayIndicator } from './NextDayIndicator';
import { styles } from './RouteConfigBar.styles';
import { getNextDayFlagUpdates } from './nextDayFlags';

// Fix default Leaflet markers
const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow });
L.Marker.prototype.options.icon = DefaultIcon;

interface RouteConfigBarProps {
  sidebarValues: SidebarValues;
  defaultKitchenLocation: { lat: number; lng: number };
  onChange: (values: Partial<SidebarValues>) => void;
  hasConfigChanged: boolean;
  shouldShowFirstSubslot: boolean;
  readOnly?: boolean;
}

const RouteConfigBar = ({
  sidebarValues,
  defaultKitchenLocation,
  onChange,
  hasConfigChanged,
  shouldShowFirstSubslot: isGBandEvening,
  readOnly = false
}: RouteConfigBarProps) => {
  const {
    windowType,
    windowSize,
    deliveryStartTime,
    deliveryEndTime,
    averageDeliveryTime,
    lookbackDays,
    travelDurationMultiple,
    useCustomKitchenLocation,
    customKitchenLocation,
    endAtKitchen,
    shiftStartTime,
    shiftEndTime,
    firstSubslotEndTime
  } = sidebarValues;

  const [showMapPicker, setShowMapPicker] = useState(false);
  const initialCustomLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const handleToggleKitchenLocation = (useCustom: boolean) => {
    onChange({ useCustomKitchenLocation: useCustom });
    if (useCustom) {
      // Store initial custom location when opening picker
      initialCustomLocationRef.current = customKitchenLocation;
      // Open map picker when toggling to custom location
      setShowMapPicker(true);
    } else {
      onChange({ customKitchenLocation: null });
      setShowMapPicker(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    onChange({ customKitchenLocation: { lat, lng } });
  };

  const handleSelectCustomLocation = () => {
    // Store initial custom location when opening picker
    initialCustomLocationRef.current = customKitchenLocation;
    setShowMapPicker(true);
  };

  const currentKitchenLocation =
    useCustomKitchenLocation && customKitchenLocation ? customKitchenLocation : defaultKitchenLocation;
  const handleWindowSize = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '') {
      onChange({ windowSize: 0 });
      return;
    }
    if (Number(v) < 0) return;
    onChange({ windowSize: Number(v) });
  };

  const handleAverageDeliveryTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '') {
      onChange({ averageDeliveryTime: 0 });
      return;
    }
    if (Number(v) < 0) return;
    onChange({ averageDeliveryTime: Number(v) });
  };
  const handleLookbackDays = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '') {
      onChange({ lookbackDays: 0 });
      return;
    }
    if (Number(v) < 0) return;
    onChange({ lookbackDays: Number(v) });
  };
  const handleTravelDurationMultiple = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '') {
      onChange({ travelDurationMultiple: 1 });
      return;
    }
    const numValue = Number(v);
    if (isNaN(numValue)) return;
    if (numValue < 0.1) return;
    if (numValue > 2) return;
    onChange({ travelDurationMultiple: numValue });
  };

  const currentPresetIndex = getCurrentPresetIndex(sidebarValues);

  const handleOptimizationSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = Number(e.target.value);
    const preset = WEIGHT_PRESETS[index];
    onChange({
      costModel: {
        ...sidebarValues.costModel,
        globalDurationCostPerHour: preset.globalDurationCostPerHour,
        costPerHourBeforeSoftStartTime: preset.costPerHourBeforeSoftStartTime,
        costPerHourAfterSoftEndTime: preset.costPerHourAfterSoftEndTime
      }
    });
  };

  const onCloseMapPicker = () => {
    // If there was a custom location before opening the picker, restore it
    // Otherwise, clear it and toggle back to default
    if (initialCustomLocationRef.current) {
      onChange({ customKitchenLocation: initialCustomLocationRef.current });
    } else {
      onChange({ customKitchenLocation: null, useCustomKitchenLocation: false });
    }
    initialCustomLocationRef.current = null;
    setShowMapPicker(false);
  };

  const onConfirmMapPicker = () => {
    initialCustomLocationRef.current = null;
    setShowMapPicker(false);
  };

  // Read next-day flags directly from sidebarValues (set by DB load or by onTimeChange)
  const { isDeliveryEndTimeNextDay, isShiftEndTimeNextDay, isSubslotTimeNextDay } = sidebarValues;

  // Helper: call onChange with the given time updates AND their recalculated next-day flags
  const onTimeChange = (
    timeUpdates: Partial<Pick<SidebarValues, 'shiftStartTime' | 'deliveryEndTime' | 'shiftEndTime' | 'firstSubslotEndTime'>>
  ) => {
    const flagUpdates = getNextDayFlagUpdates(timeUpdates, sidebarValues);
    onChange({ ...timeUpdates, ...flagUpdates });
  };

  return (
    <div style={styles.container}>
      {/* First Row: Shift Start/End Times and Delivery Start/End Times */}
      <div style={styles.mainBar}>
        <>
          {/* Shift Start Time */}
          <div style={styles.fieldContainer}>
            <label style={styles.label}>Kitchen Departure:</label>
            <input
              type="time"
              value={shiftStartTime}
              onChange={(e) => onTimeChange({ shiftStartTime: e.target.value })}
              style={styles.input}
              disabled={readOnly}
            />
          </div>

          {/* Delivery Start Time */}
          <div style={styles.fieldContainer}>
            <label style={styles.label}>Delivery Start:</label>
            <input
              type="time"
              value={deliveryStartTime}
              onChange={(e) => onChange({ deliveryStartTime: e.target.value })}
              style={styles.input}
              disabled={readOnly}
            />
          </div>

          {/* Delivery End Time */}
          <div style={styles.fieldContainer}>
            <label style={styles.label}>Delivery End:</label>
            <input
              type="time"
              value={deliveryEndTime}
              onChange={(e) => {
                const updates: Partial<SidebarValues> = { deliveryEndTime: e.target.value };
                if (!endAtKitchen) updates.shiftEndTime = e.target.value;
                if (!isGBandEvening) updates.firstSubslotEndTime = e.target.value;
                onTimeChange(updates);
              }}
              style={styles.input}
              disabled={readOnly}
            />
            <NextDayIndicator isNextDay={isDeliveryEndTimeNextDay} time={deliveryEndTime} shiftStartTime={shiftStartTime} />
          </div>

          {/* Shift End Time */}
          {endAtKitchen ? (
            <div style={styles.fieldContainer}>
              <label style={styles.label}>Kitchen Return</label>
              <input
                type="time"
                value={shiftEndTime}
                onChange={(e) => onTimeChange({ shiftEndTime: e.target.value })}
                style={styles.input}
                disabled={readOnly}
              />
              <NextDayIndicator isNextDay={isShiftEndTimeNextDay} time={shiftEndTime} shiftStartTime={shiftStartTime} />
            </div>
          ) : null}

          {/* First Subslot End Time */}
          {isGBandEvening ? (
            <div style={styles.fieldContainer}>
              <label style={styles.label}>First Subslot End:</label>
              <input
                type="time"
                value={firstSubslotEndTime || ''}
                onChange={(e) => onTimeChange({ firstSubslotEndTime: e.target.value })}
                style={styles.input}
                disabled={readOnly}
              />
              {firstSubslotEndTime && (
                <NextDayIndicator isNextDay={isSubslotTimeNextDay} time={firstSubslotEndTime} shiftStartTime={shiftStartTime} />
              )}
            </div>
          ) : null}

          {/* Ends At Kitchen Toggle*/}
          <div style={styles.fieldContainer}>
            <label style={styles.label}>End At Kitchen:</label>
            <div
              style={{ ...styles.endAtKitchenContainer, ...(readOnly && { pointerEvents: 'none', opacity: 0.6 }) }}
              onClick={() => {
                if (readOnly) return;
                const timeUpdates = { shiftEndTime: deliveryEndTime };
                const flagUpdates = getNextDayFlagUpdates(timeUpdates, sidebarValues);
                onChange({ endAtKitchen: !endAtKitchen, ...timeUpdates, ...flagUpdates });
              }}
            >
              <div style={styles.endAtKitchenToggle(endAtKitchen)}>
                <div style={styles.endAtKitchenKnob(endAtKitchen)} />
              </div>
              <span style={styles.endAtKitchenLabel}>{endAtKitchen ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>

          <div style={styles.divider} />
        </>
      </div>

      {/* Second Row: Window Options */}
      <div style={styles.mainBar}>
        {/* Window Type */}
        <div style={styles.fieldContainer}>
          <label style={styles.label}>Window Type:</label>
          <select
            value={windowType}
            onChange={(e) => onChange({ windowType: e.target.value as WindowType })}
            style={styles.select}
            disabled={readOnly}
          >
            <option value={WindowType.none}>None</option>
            <option value={WindowType.hard}>Hard</option>
            <option value={WindowType.soft}>Soft</option>
          </select>
        </div>

        {/* Window Size */}
        <div style={styles.fieldContainer}>
          <label style={styles.label}>Window Size:</label>
          <input type="number" value={windowSize} onChange={handleWindowSize} style={styles.inputNumber} disabled={readOnly} />
        </div>

        <div style={styles.divider} />

        {/* Average Delivery Time */}
        <div style={styles.fieldContainer}>
          <label style={styles.label}>Avg Delivery Time:</label>
          <input
            type="number"
            value={averageDeliveryTime}
            onChange={handleAverageDeliveryTime}
            style={styles.inputNumber}
            disabled={readOnly}
          />
          <label style={styles.label}>s</label>
        </div>

        <div style={styles.divider} />

        {/* Lookback Days */}
        <div style={styles.fieldContainer}>
          <label style={styles.label}>Lookback Days:</label>
          <input
            type="number"
            value={lookbackDays}
            onChange={handleLookbackDays}
            style={styles.inputNumber}
            disabled={readOnly}
          />
        </div>

        <div style={styles.divider} />

        {/* Kitchen Location Toggle */}
        <div style={styles.fieldContainer}>
          <label style={styles.label}>Kitchen:</label>
          <div
            style={{ ...styles.toggleContainer, ...(readOnly && { pointerEvents: 'none', opacity: 0.6 }) }}
            onClick={() => !readOnly && handleToggleKitchenLocation(!useCustomKitchenLocation)}
            title={useCustomKitchenLocation ? 'Using custom kitchen location' : 'Using default kitchen location'}
          >
            <div
              style={{
                ...styles.toggleOption,
                color: useCustomKitchenLocation ? styles.toggleOptionInactive.color : styles.toggleOptionActive.color
              }}
            >
              Default
            </div>
            <div
              style={{
                ...styles.toggleOption,
                color: useCustomKitchenLocation ? styles.toggleOptionActive.color : styles.toggleOptionInactive.color
              }}
            >
              Custom
            </div>
            <div style={styles.toggleSlider(useCustomKitchenLocation)} />
          </div>
          {readOnly
            ? null
            : customKitchenLocation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectCustomLocation();
                  }}
                  style={styles.customLocationButton}
                  title="Select custom kitchen location on map"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span style={styles.customLocationButtonText}>
                    {useCustomKitchenLocation && !customKitchenLocation
                      ? 'Please pick a location.'
                      : 'Custom location selected — click to change'}
                  </span>
                </button>
              )}
          {/* Warning message when config has changed - inline with kitchen controls */}
          {hasConfigChanged && (
            <div style={styles.warningMessage}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span style={styles.warningText}>Please re-simulate to see updated results.</span>
            </div>
          )}
          <div style={styles.divider} />
        </div>
      </div>

      {/* Third Row: Optimization Parameters */}
      <div style={styles.mainBar}>
        <div style={styles.fieldContainer}>
          <label style={styles.label}>Travel &times;:</label>
          <input
            type="number"
            value={travelDurationMultiple}
            onChange={handleTravelDurationMultiple}
            min={0.1}
            max={5}
            step={0.1}
            style={styles.inputNumber}
            disabled={readOnly}
          />
        </div>

        <div style={styles.divider} />

        {/* Optimization Slider */}
        <div style={styles.optimizationContainer}>
          <label style={styles.label}>Optimization:</label>
          <div style={styles.optimizationSliderWrapper}>
            <div style={styles.optimizationSliderRow}>
              <span style={styles.optimizationSliderLabel}>Consistency</span>
              <div style={styles.optimizationSliderTrack}>
                {/* Notches */}
                <div style={styles.optimizationNotchesContainer}>
                  {WEIGHT_PRESETS.map((_, idx) => (
                    <div
                      key={idx}
                      style={styles.optimizationNotch(
                        idx <= currentPresetIndex,
                        idx === currentPresetIndex,
                        caloTheme.palette.primary.main
                      )}
                    />
                  ))}
                </div>
                {/* Slider */}
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={currentPresetIndex}
                  onChange={handleOptimizationSliderChange}
                  style={styles.optimizationSliderInput(caloTheme.palette.primary.main)}
                />
              </div>
              <span style={styles.optimizationSliderLabel}>Cost</span>
            </div>
            <div style={styles.optimizationLabelContainer}>
              <span style={styles.optimizationLabelBadge(caloTheme.palette.primary.main, caloTheme.palette.primary50)}>
                {currentPresetIndex + 1}. {WEIGHT_LABELS[currentPresetIndex]}
              </span>
            </div>
          </div>
        </div>
        <div style={styles.divider} />
      </div>

      {/* Map Picker Modal */}
      <KitchenLocationPicker
        isOpen={showMapPicker && useCustomKitchenLocation}
        customKitchenLocation={customKitchenLocation}
        defaultKitchenLocation={defaultKitchenLocation}
        currentKitchenLocation={currentKitchenLocation}
        onMapClick={handleMapClick}
        onClose={onCloseMapPicker}
        onConfirm={onConfirmMapPicker}
      />
    </div>
  );
};

export default RouteConfigBar;
