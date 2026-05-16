import { SidebarValues } from 'lib/interfaces';

/**
 * WEIGHT_PRESETS — Route Optimization Strategy Mapping
 *
 * These presets control the trade-off between:
 *
 * 1. Route duration minimization (globalDurationCostPerHour)
 * 2. Soft time window penalties:
 *    - costPerHourBeforeSoftStartTime
 *    - costPerHourAfterSoftEndTime
 *
 * ---------------------------------------------------------------------------
 * DESIGN PRINCIPLES
 * ---------------------------------------------------------------------------
 *
 * 1) Ratio-Based Thinking (Not Absolute Values)
 *    The Google Route Optimization solver optimizes based on relative cost
 *    magnitudes. What matters is the ratio between:
 *
 *      timeWindowPenalty : durationPenalty
 *
 *    Example:
 *      { duration: 1, time: 5 }  → Time windows are 5× more important.
 *      { duration: 6, time: 1 }  → Duration is 6× more important.
 *
 *
 * 2) Exponential Separation for Solver Stability
 *    The solver often requires strong separation (≈10× or more) for one
 *    objective to clearly dominate another.
 *
 *    Therefore, weights are scaled exponentially (≈ ×3 progression)
 *    instead of linearly (e.g., 1,2,3,4).
 *
 *    This ensures:
 *      - Clear behavioral shifts between steps
 *      - Predictable solver outcomes
 *      - No ambiguous "almost balanced" states
 *
 *
 * 3) Behavioral Bias Toward Time Windows
 *    Historically, operations teams prioritize shorter routes over strict
 *    time window compliance.
 *
 *    These presets intentionally:
 *      - Provide smoother granularity on the time-window side (steps 1–3)
 *      - Require deliberate choice to aggressively optimize distance (6–7)
 *
 *    This nudges users toward respecting delivery promises while still
 *    allowing strong route compression when explicitly needed.
 *
 *
 * ---------------------------------------------------------------------------
 * SLIDER STRATEGY MEANING
 * ---------------------------------------------------------------------------
 *
 * Step 1 → Very Strict Time Windows (40× time bias)
 *          Time window violations are heavily penalized.
 *          Route duration increases if necessary to protect delivery promise.
 *
 * Step 2 → Strong Time Window Focus (15× bias)
 *          Significant protection of delivery windows.
 *
 * Step 3 → Moderate Time Windows (5× bias)
 *          Recommended operational default when delivery quality matters.
 *
 * Step 4 → Balanced (1:1)
 *          Equal weighting between duration and window adherence.
 *
 * Step 5 → Moderate Distance Efficiency (6× duration bias)
 *          Slight compression of routes at cost of soft window flexibility.
 *
 * Step 6 → High Distance Efficiency (18× duration bias)
 *          Strong route shortening. Time windows become secondary.
 *
 * Step 7 → Maximum Route Compression (45× duration bias)
 *          Aggressive distance minimization. Soft windows largely flexible.
 *
 *
 * ---------------------------------------------------------------------------
 * WHY VALUES LIKE 40 / 15 / 5 / 1 / 6 / 18 / 45?
 * ---------------------------------------------------------------------------
 *
 * - Provides exponential dominance shifts (~×3 progression)
 * - Ensures ≥10× separation at extremes (important for Google solver)
 * - Keeps middle states (3–5) operationally usable
 * - Avoids excessively large magnitudes (e.g., 1000+) that may destabilize
 *   objective scaling
 *
 *
 * ---------------------------------------------------------------------------
 * IMPORTANT NOTES
 * ---------------------------------------------------------------------------
 *
 * - These are strategic presets, not mathematical interpolations.
 * - Do NOT interpolate between steps. Each step represents a distinct
 *   operational mode.
 * - If solver behavior changes significantly due to API updates, revisit
 *   dominance ratios (not absolute numbers).
 *
 */

// Weight presets for the optimization slider
export const WEIGHT_PRESETS = [
  // 1 — Very Strict Time Windows (dominant)
  { globalDurationCostPerHour: 1, costPerHourBeforeSoftStartTime: 40, costPerHourAfterSoftEndTime: 40 },
  // 2 — Strong Time Window Focus
  { globalDurationCostPerHour: 1, costPerHourBeforeSoftStartTime: 15, costPerHourAfterSoftEndTime: 15 },
  // 3 — Moderate Time Windows (likely ops default)
  { globalDurationCostPerHour: 1, costPerHourBeforeSoftStartTime: 5, costPerHourAfterSoftEndTime: 5 },
  // 4 — Balanced
  { globalDurationCostPerHour: 1, costPerHourBeforeSoftStartTime: 1, costPerHourAfterSoftEndTime: 1 },
  // 5 — Moderate Distance Efficiency
  { globalDurationCostPerHour: 6, costPerHourBeforeSoftStartTime: 1, costPerHourAfterSoftEndTime: 1 },
  // 6 — High Distance Efficiency
  { globalDurationCostPerHour: 18, costPerHourBeforeSoftStartTime: 1, costPerHourAfterSoftEndTime: 1 },
  // 7 — Maximum Route Compression (distance dominant)
  { globalDurationCostPerHour: 45, costPerHourBeforeSoftStartTime: 1, costPerHourAfterSoftEndTime: 1 }
];

export const WEIGHT_LABELS = [
  'Very Strict Time Windows',
  'Strict Time Windows',
  'Moderate Time Windows',
  'Balanced',
  'Moderate Route Efficiency',
  'High Route Efficiency',
  'Maximum Route Efficiency'
];

// Find the current slider index based on cost model values
export const getCurrentPresetIndex = (sidebarValues: SidebarValues): number => {
  const { globalDurationCostPerHour, costPerHourBeforeSoftStartTime, costPerHourAfterSoftEndTime } = sidebarValues.costModel;
  const index = WEIGHT_PRESETS.findIndex(
    (preset) =>
      preset.globalDurationCostPerHour === globalDurationCostPerHour &&
      preset.costPerHourBeforeSoftStartTime === costPerHourBeforeSoftStartTime &&
      preset.costPerHourAfterSoftEndTime === costPerHourAfterSoftEndTime
  );
  return index >= 0 ? index : 3; // Default to "Balanced" (index 3) if no match
};
