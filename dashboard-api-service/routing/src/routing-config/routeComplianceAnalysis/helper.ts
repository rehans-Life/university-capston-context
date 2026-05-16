import { AutoRouteItem } from '../../../libs/interfaces';
import {
  ComplianceAlert,
  DeliveryComplianceItem,
  DeviationCategory,
  RouteComplianceAnalysis,
  RouteComplianceMetrics,
  TravelTimeLegComparison
} from './interfaces';

/**
 * Categorize position deviation based on absolute difference
 */
export function categorizeDeviation(deviation: number): DeviationCategory {
  const absDeviation = Math.abs(deviation);
  if (absDeviation === 0) return 'perfect';
  if (absDeviation <= 2) return 'minor';
  if (absDeviation <= 5) return 'moderate';
  return 'major';
}

/**
 * Calculate Kendall Tau correlation coefficient as a percentage (0-100%)
 * Measures how well the actual order preserves the relative ordering of planned route
 *
 * @param plannedOrders - Array of planned order positions
 * @param actualOrders - Array of actual order positions (must match plannedOrders by index)
 * @returns Sequence compliance percentage (0-100)
 */
export function calculateKendallTauCompliance(plannedOrders: number[], actualOrders: number[]): number {
  const n = plannedOrders.length;
  if (n < 2) return 100;

  let concordantPairs = 0;
  let discordantPairs = 0;

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const plannedDiff = plannedOrders[i] - plannedOrders[j];
      const actualDiff = actualOrders[i] - actualOrders[j];

      if (plannedDiff * actualDiff > 0) {
        concordantPairs++;
      } else if (plannedDiff * actualDiff < 0) {
        discordantPairs++;
      }
    }
  }

  const totalPairs = concordantPairs + discordantPairs;
  if (totalPairs === 0) return 100;

  // Kendall tau = (concordant - discordant) / totalPairs
  // Ranges from -1 to 1, we convert to 0-100% scale
  const tau = (concordantPairs - discordantPairs) / totalPairs;
  // Convert from [-1, 1] to [0, 100]
  return Math.round(((tau + 1) / 2) * 100);
}

/**
 * Calculate average position error as a percentage (0-100%)
 * 100% = perfect (0 avg error), 0% = completely off (avg error >= half of route length)
 */
export function calculateAveragePositionError(deliveries: DeliveryComplianceItem[]): number {
  if (deliveries.length < 2) return 100;

  const totalError = deliveries.reduce((sum, d) => sum + Math.abs(d.positionDeviation), 0);
  const avgError = totalError / deliveries.length;
  const maxError = deliveries.length / 2;

  const score = 100 * (1 - avgError / maxError);
  return Math.max(0, Math.round(score));
}

/**
 * Calculate time window compliance percentage
 */
export function calculateTimeWindowCompliance(deliveries: { withinWindow: boolean }[]): number {
  if (deliveries.length === 0) return 100;
  const withinWindowCount = deliveries.filter((d) => d.withinWindow).length;
  return Math.round((withinWindowCount / deliveries.length) * 100);
}

/**
 * Calculate overall compliance score using weighted formula
 */
export function calculateOverallScore(
  sequenceCompliance: number,
  timeWindowCompliance: number,
  completionRate: number
): number {
  return Math.round(sequenceCompliance * 0.4 + timeWindowCompliance * 0.4 + completionRate * 0.2);
}

/**
 * Generate compliance alerts based on metrics
 */
export function generateAlerts(metrics: RouteComplianceMetrics): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];

  if (metrics.sequenceCompliance < 20) {
    alerts.push({
      type: 'sequence',
      severity: 'critical',
      message: 'Driver delivered route nearly in reverse order'
    });
  } else if (metrics.sequenceCompliance < 50) {
    alerts.push({
      type: 'sequence',
      severity: 'warning',
      message: 'Significant route deviation detected'
    });
  }

  if (metrics.timeWindowCompliance < 50) {
    alerts.push({
      type: 'timeWindow',
      severity: 'warning',
      message: 'Majority of deliveries outside time window'
    });
  }

  return alerts;
}

/**
 * Calculate average leg time difference from travel time leg comparisons
 * Returns the average of differenceMinutes across all legs, rounded to 2 decimal places
 * Returns undefined if there are no comparisons
 *
 * @param comparisons - Array of travel time leg comparisons
 * @returns Average difference in minutes (positive = slower than predicted, negative = faster), or undefined if no data
 */
export function calculateAverageLegTimeDifference(comparisons: TravelTimeLegComparison[]): number | undefined {
  if (comparisons.length === 0) return undefined;

  const totalDifference = comparisons.reduce((sum, c) => sum + c.differenceMinutes, 0);
  return Math.round((totalDifference / comparisons.length) * 100) / 100;
}

/**
 * Calculate travel time leg differences between consecutive deliveries
 * Only includes legs where both deliveries are consecutive in both simulated and actual routes
 *
 * @param simulatedRoute - Planned route items with priority as order and deliveredAt (ETA)
 * @param actualRoute - Actual route items with priority as delivery order and deliveredAt
 * @returns Array of travel time leg comparisons
 */
export function calculateTravelTimeLegDifferences(
  simulatedRoute: AutoRouteItem[],
  actualRoute: AutoRouteItem[]
): TravelTimeLegComparison[] {
  const comparisons: TravelTimeLegComparison[] = [];

  const isCustomerDelivery = (item: AutoRouteItem) => item.priority !== 0 && !item.id.startsWith('KITCHEN');
  const filteredSimulated = simulatedRoute.filter(isCustomerDelivery);
  const filteredActual = actualRoute.filter(isCustomerDelivery);

  const sortedSimulated = [...filteredSimulated].sort((a, b) => a.priority - b.priority);
  const sortedActual = [...filteredActual].sort((a, b) => a.priority - b.priority);

  const actualDeliveryMap = new Map<string, { priority: number; deliveredAt?: string; name: string }>();
  for (const item of sortedActual) {
    actualDeliveryMap.set(item.id, {
      priority: item.priority,
      deliveredAt: item.deliveredAt,
      name: item.name
    });
  }

  for (let i = 0; i < sortedSimulated.length - 1; i++) {
    const fromSimulated = sortedSimulated[i];
    const toSimulated = sortedSimulated[i + 1];

    const fromActual = actualDeliveryMap.get(fromSimulated.id);
    const toActual = actualDeliveryMap.get(toSimulated.id);

    if (!fromActual || !toActual) {
      continue;
    }

    if (toActual.priority !== fromActual.priority + 1) {
      continue;
    }

    if (!fromSimulated.deliveredAt || !toSimulated.deliveredAt) {
      continue;
    }
    if (!fromActual.deliveredAt || !toActual.deliveredAt) {
      continue;
    }

    const predictedFromTime = new Date(fromSimulated.deliveredAt).getTime();
    const predictedToTime = new Date(toSimulated.deliveredAt).getTime();
    const predictedTravelTimeMinutes = (predictedToTime - predictedFromTime) / (1000 * 60);

    const actualFromTime = new Date(fromActual.deliveredAt).getTime();
    const actualToTime = new Date(toActual.deliveredAt).getTime();
    const actualTravelTimeMinutes = (actualToTime - actualFromTime) / (1000 * 60);

    const differenceMinutes = actualTravelTimeMinutes - predictedTravelTimeMinutes;
    let differencePercent = 0;
    if (predictedTravelTimeMinutes > 0) {
      differencePercent = Math.round((differenceMinutes / predictedTravelTimeMinutes) * 100);
    } else if (actualTravelTimeMinutes > 0) {
      differencePercent = 100;
    }

    comparisons.push({
      fromDeliveryId: fromSimulated.id,
      toDeliveryId: toSimulated.id,
      fromDeliveryName: fromSimulated.name,
      toDeliveryName: toSimulated.name,
      predictedTravelTimeMinutes: Math.round(predictedTravelTimeMinutes * 100) / 100,
      actualTravelTimeMinutes: Math.round(actualTravelTimeMinutes * 100) / 100,
      differenceMinutes: Math.round(differenceMinutes * 100) / 100,
      differencePercent
    });
  }

  return comparisons;
}

/**
 * Build compliance analysis from simulated and actual routes
 * @param simulatedRoute - Planned route items with priority as order
 * @param actualRoute - Actual route items with priority as delivery order
 * @param totalPlannedDeliveries - Total number of planned deliveries (for completion rate)
 */
export function buildComplianceAnalysis(
  simulatedRoute: AutoRouteItem[],
  actualRoute: AutoRouteItem[],
  totalPlannedDeliveries: number
): RouteComplianceAnalysis {
  // Filter out Kitchen items (priority 0 or KITCHEN* id) from both routes to only include customer deliveries
  const isCustomerDelivery = (item: AutoRouteItem) => item.priority !== 0 && !item.id.startsWith('KITCHEN');
  const filteredSimulated = simulatedRoute.filter(isCustomerDelivery);
  const filteredActual = actualRoute.filter(isCustomerDelivery);

  // Create lookup map for actual route by id
  const actualOrderMap = new Map<string, { order: number; withinWindow: boolean; hasDeliveredAt: boolean }>();
  for (const item of filteredActual) {
    actualOrderMap.set(item.id, {
      order: item.priority,
      withinWindow: item.withinWindow ?? false,
      hasDeliveredAt: !!item.deliveredAt
    });
  }

  // Build delivery compliance items joined by id
  const deliveryItems: DeliveryComplianceItem[] = [];
  const plannedOrders: number[] = [];
  const actualOrders: number[] = [];

  for (const simulatedItem of filteredSimulated) {
    const actualData = actualOrderMap.get(simulatedItem.id);
    if (actualData) {
      const deviation = actualData.order - simulatedItem.priority;
      // Use actual withinWindow if delivery has timestamp, otherwise fall back to simulated
      const withinWindow = actualData.hasDeliveredAt ? actualData.withinWindow : simulatedItem.withinWindow ?? false;
      deliveryItems.push({
        id: simulatedItem.id,
        name: simulatedItem.name,
        plannedOrder: simulatedItem.priority,
        actualOrder: actualData.order,
        positionDeviation: deviation,
        deviationCategory: categorizeDeviation(deviation),
        withinWindow
      });
      plannedOrders.push(simulatedItem.priority);
      actualOrders.push(actualData.order);
    }
  }

  // Sort by plannedOrder
  deliveryItems.sort((a, b) => a.plannedOrder - b.plannedOrder);

  const travelTimeLegComparisons = calculateTravelTimeLegDifferences(simulatedRoute, actualRoute);

  // Calculate metrics
  const sequenceCompliance = calculateKendallTauCompliance(plannedOrders, actualOrders);
  const averagePositionError = calculateAveragePositionError(deliveryItems);
  const timeWindowCompliance = calculateTimeWindowCompliance(deliveryItems);
  const completionRate =
    totalPlannedDeliveries > 0 ? Math.round((filteredActual.length / totalPlannedDeliveries) * 100) : 100;
  const overallScore = calculateOverallScore(sequenceCompliance, timeWindowCompliance, completionRate);
  const averageLegTimeDifference = calculateAverageLegTimeDifference(travelTimeLegComparisons);

  const metrics: RouteComplianceMetrics = {
    sequenceCompliance,
    averagePositionError,
    timeWindowCompliance,
    completionRate,
    overallScore,
    averageLegTimeDifference
  };

  const alerts = generateAlerts(metrics);

  return {
    deliveries: deliveryItems,
    metrics,
    alerts,
    travelTimeLegComparisons
  };
}
