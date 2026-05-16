export type DeviationCategory = 'perfect' | 'minor' | 'moderate' | 'major';

export interface DeliveryComplianceItem {
  id: string;
  name: string;
  plannedOrder: number;
  actualOrder: number;
  positionDeviation: number;
  deviationCategory: DeviationCategory;
  withinWindow: boolean;
}

export interface ComplianceAlert {
  type: 'sequence' | 'timeWindow';
  severity: 'warning' | 'critical';
  message: string;
}

export interface RouteComplianceMetrics {
  sequenceCompliance: number;
  averagePositionError: number;
  timeWindowCompliance: number;
  completionRate: number;
  overallScore: number;
  averageLegTimeDifference?: number;
}

export interface RouteComplianceAnalysis {
  deliveries: DeliveryComplianceItem[];
  metrics: RouteComplianceMetrics;
  alerts: ComplianceAlert[];
  travelTimeLegComparisons: TravelTimeLegComparison[];
}

export interface TravelTimeLegComparison {
  fromDeliveryId: string;
  toDeliveryId: string;
  fromDeliveryName: string;
  toDeliveryName: string;
  predictedTravelTimeMinutes: number;
  actualTravelTimeMinutes: number;
  differenceMinutes: number;
  differencePercent: number;
}
