import { AutoRouteItem } from '../../../../libs/interfaces';
import {
  buildComplianceAnalysis,
  calculateAverageLegTimeDifference,
  calculateAveragePositionError,
  calculateKendallTauCompliance,
  calculateOverallScore,
  calculateTimeWindowCompliance,
  calculateTravelTimeLegDifferences,
  categorizeDeviation,
  generateAlerts
} from '../helper';

const createRouteItem = (id: string, priority: number, withinWindow = true): AutoRouteItem => ({
  id,
  name: `Delivery ${id}`,
  priority,
  lat: 0,
  lng: 0,
  withinWindow
});

const createDeliveryCompliance = (
  id: string,
  plannedOrder: number,
  actualOrder: number,
  positionDeviation: number,
  deviationCategory: 'perfect' | 'minor' | 'moderate' | 'major'
) => ({
  id,
  name: `D${id}`,
  plannedOrder,
  actualOrder,
  positionDeviation,
  deviationCategory,
  withinWindow: true
});

describe('Route Compliance Analysis Helper', () => {
  describe('categorizeDeviation', () => {
    it('should return "perfect" for deviation of 0', () => {
      expect(categorizeDeviation(0)).toBe('perfect');
    });

    it('should return "minor" for deviations ±1-2', () => {
      expect(categorizeDeviation(1)).toBe('minor');
      expect(categorizeDeviation(-1)).toBe('minor');
      expect(categorizeDeviation(2)).toBe('minor');
      expect(categorizeDeviation(-2)).toBe('minor');
    });

    it('should return "moderate" for deviations ±3-5', () => {
      expect(categorizeDeviation(3)).toBe('moderate');
      expect(categorizeDeviation(-3)).toBe('moderate');
      expect(categorizeDeviation(5)).toBe('moderate');
      expect(categorizeDeviation(-5)).toBe('moderate');
    });

    it('should return "major" for deviations >5', () => {
      expect(categorizeDeviation(6)).toBe('major');
      expect(categorizeDeviation(-6)).toBe('major');
      expect(categorizeDeviation(10)).toBe('major');
    });
  });

  describe('calculateKendallTauCompliance', () => {
    it('should return 100% for identical orders', () => {
      const planned = [1, 2, 3, 4, 5];
      const actual = [1, 2, 3, 4, 5];
      expect(calculateKendallTauCompliance(planned, actual)).toBe(100);
    });

    it('should return 0% for completely reversed orders', () => {
      const planned = [1, 2, 3, 4, 5];
      const actual = [5, 4, 3, 2, 1];
      expect(calculateKendallTauCompliance(planned, actual)).toBe(0);
    });

    it('should return 100% for single element', () => {
      expect(calculateKendallTauCompliance([1], [1])).toBe(100);
    });

    it('should return 100% for empty arrays', () => {
      expect(calculateKendallTauCompliance([], [])).toBe(100);
    });

    it('should return intermediate value for partial disorder', () => {
      const planned = [1, 2, 3, 4];
      const actual = [1, 3, 2, 4]; // One swap
      const result = calculateKendallTauCompliance(planned, actual);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });
  });

  describe('calculateAveragePositionError', () => {
    it('should return 100% for empty array', () => {
      expect(calculateAveragePositionError([])).toBe(100);
    });

    it('should return 100% for single element', () => {
      const deliveries = [createDeliveryCompliance('1', 1, 1, 0, 'perfect')];
      expect(calculateAveragePositionError(deliveries)).toBe(100);
    });

    it('should return 100% for perfect compliance', () => {
      const deliveries = [
        createDeliveryCompliance('1', 1, 1, 0, 'perfect'),
        createDeliveryCompliance('2', 2, 2, 0, 'perfect')
      ];
      expect(calculateAveragePositionError(deliveries)).toBe(100);
    });

    it('should calculate correct percentage for mixed deviations', () => {
      // Scenario: 7,1,2,3,4,5,6,8 - delivery 7 moved to front
      // Total error: 12, n=8, avgError = 1.5, maxError = 4
      // Score = 100 * (1 - 1.5/4) = 63%
      const deliveries = [
        createDeliveryCompliance('1', 1, 2, 1, 'minor'),
        createDeliveryCompliance('2', 2, 3, 1, 'minor'),
        createDeliveryCompliance('3', 3, 4, 1, 'minor'),
        createDeliveryCompliance('4', 4, 5, 1, 'minor'),
        createDeliveryCompliance('5', 5, 6, 1, 'minor'),
        createDeliveryCompliance('6', 6, 7, 1, 'minor'),
        createDeliveryCompliance('7', 7, 1, -6, 'major'),
        createDeliveryCompliance('8', 8, 8, 0, 'perfect')
      ];
      expect(calculateAveragePositionError(deliveries)).toBe(63);
    });

    it('should cap at 0% when avg error exceeds max', () => {
      const deliveries = [
        createDeliveryCompliance('1', 1, 3, 2, 'minor'),
        createDeliveryCompliance('2', 2, 1, -1, 'minor')
      ];
      // |2| + |-1| = 3, n=2, avgError = 1.5, maxError = 1
      // Score = 100 * (1 - 1.5/1) = -50% -> capped at 0%
      expect(calculateAveragePositionError(deliveries)).toBe(0);
    });
  });

  describe('calculateTimeWindowCompliance', () => {
    it('should return 100% when all deliveries within window', () => {
      const deliveries = [{ withinWindow: true }, { withinWindow: true }, { withinWindow: true }];
      expect(calculateTimeWindowCompliance(deliveries)).toBe(100);
    });

    it('should return 0% when no deliveries within window', () => {
      const deliveries = [{ withinWindow: false }, { withinWindow: false }];
      expect(calculateTimeWindowCompliance(deliveries)).toBe(0);
    });

    it('should return correct percentage for mixed deliveries', () => {
      const deliveries = [
        { withinWindow: true },
        { withinWindow: false },
        { withinWindow: true },
        { withinWindow: false }
      ];
      expect(calculateTimeWindowCompliance(deliveries)).toBe(50);
    });

    it('should return 100% for empty array', () => {
      expect(calculateTimeWindowCompliance([])).toBe(100);
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate correct weighted score', () => {
      // (60 * 0.4) + (80 * 0.4) + (100 * 0.2) = 24 + 32 + 20 = 76
      expect(calculateOverallScore(60, 80, 100)).toBe(76);
    });

    it('should return 100 for perfect scores', () => {
      expect(calculateOverallScore(100, 100, 100)).toBe(100);
    });

    it('should return 0 for zero scores', () => {
      expect(calculateOverallScore(0, 0, 0)).toBe(0);
    });
  });

  describe('calculateAverageLegTimeDifference', () => {
    it('should return undefined for empty comparisons array', () => {
      expect(calculateAverageLegTimeDifference([])).toBeUndefined();
    });

    it('should calculate average for single comparison', () => {
      const comparisons = [
        {
          fromDeliveryId: 'd1',
          toDeliveryId: 'd2',
          fromDeliveryName: 'D1',
          toDeliveryName: 'D2',
          predictedTravelTimeMinutes: 10,
          actualTravelTimeMinutes: 15,
          differenceMinutes: 5,
          differencePercent: 50
        }
      ];
      expect(calculateAverageLegTimeDifference(comparisons)).toBe(5);
    });

    it('should calculate average for multiple comparisons', () => {
      const comparisons = [
        {
          fromDeliveryId: 'd1',
          toDeliveryId: 'd2',
          fromDeliveryName: 'D1',
          toDeliveryName: 'D2',
          predictedTravelTimeMinutes: 10,
          actualTravelTimeMinutes: 15,
          differenceMinutes: 5,
          differencePercent: 50
        },
        {
          fromDeliveryId: 'd2',
          toDeliveryId: 'd3',
          fromDeliveryName: 'D2',
          toDeliveryName: 'D3',
          predictedTravelTimeMinutes: 15,
          actualTravelTimeMinutes: 12,
          differenceMinutes: -3,
          differencePercent: -20
        }
      ];
      // (5 + (-3)) / 2 = 1
      expect(calculateAverageLegTimeDifference(comparisons)).toBe(1);
    });

    it('should handle negative average (faster than predicted)', () => {
      const comparisons = [
        {
          fromDeliveryId: 'd1',
          toDeliveryId: 'd2',
          fromDeliveryName: 'D1',
          toDeliveryName: 'D2',
          predictedTravelTimeMinutes: 20,
          actualTravelTimeMinutes: 10,
          differenceMinutes: -10,
          differencePercent: -50
        },
        {
          fromDeliveryId: 'd2',
          toDeliveryId: 'd3',
          fromDeliveryName: 'D2',
          toDeliveryName: 'D3',
          predictedTravelTimeMinutes: 15,
          actualTravelTimeMinutes: 10,
          differenceMinutes: -5,
          differencePercent: -33
        }
      ];
      // (-10 + (-5)) / 2 = -7.5
      expect(calculateAverageLegTimeDifference(comparisons)).toBe(-7.5);
    });

    it('should round to 2 decimal places', () => {
      const comparisons = [
        {
          fromDeliveryId: 'd1',
          toDeliveryId: 'd2',
          fromDeliveryName: 'D1',
          toDeliveryName: 'D2',
          predictedTravelTimeMinutes: 10,
          actualTravelTimeMinutes: 12,
          differenceMinutes: 2.33,
          differencePercent: 23
        },
        {
          fromDeliveryId: 'd2',
          toDeliveryId: 'd3',
          fromDeliveryName: 'D2',
          toDeliveryName: 'D3',
          predictedTravelTimeMinutes: 10,
          actualTravelTimeMinutes: 11,
          differenceMinutes: 1.33,
          differencePercent: 13
        },
        {
          fromDeliveryId: 'd3',
          toDeliveryId: 'd4',
          fromDeliveryName: 'D3',
          toDeliveryName: 'D4',
          predictedTravelTimeMinutes: 10,
          actualTravelTimeMinutes: 11,
          differenceMinutes: 1.33,
          differencePercent: 13
        }
      ];
      // (2.33 + 1.33 + 1.33) / 3 = 1.6633... -> 1.66
      expect(calculateAverageLegTimeDifference(comparisons)).toBe(1.66);
    });
  });

  describe('generateAlerts', () => {
    it('should generate critical alert when sequence compliance < 20%', () => {
      const metrics = {
        sequenceCompliance: 15,
        averagePositionError: 4.5,
        timeWindowCompliance: 80,
        completionRate: 100,
        overallScore: 50,
        averageLegTimeDifference: 0
      };
      const alerts = generateAlerts(metrics);
      expect(alerts).toContainEqual({
        type: 'sequence',
        severity: 'critical',
        message: 'Driver delivered route nearly in reverse order'
      });
    });

    it('should generate warning alert when sequence compliance < 50%', () => {
      const metrics = {
        sequenceCompliance: 40,
        averagePositionError: 2.5,
        timeWindowCompliance: 80,
        completionRate: 100,
        overallScore: 60,
        averageLegTimeDifference: 0
      };
      const alerts = generateAlerts(metrics);
      expect(alerts).toContainEqual({
        type: 'sequence',
        severity: 'warning',
        message: 'Significant route deviation detected'
      });
    });

    it('should generate time window alert when compliance < 50%', () => {
      const metrics = {
        sequenceCompliance: 80,
        averagePositionError: 1.0,
        timeWindowCompliance: 40,
        completionRate: 100,
        overallScore: 60,
        averageLegTimeDifference: 0
      };
      const alerts = generateAlerts(metrics);
      expect(alerts).toContainEqual({
        type: 'timeWindow',
        severity: 'warning',
        message: 'Majority of deliveries outside time window'
      });
    });

    it('should not generate alerts for good compliance', () => {
      const metrics = {
        sequenceCompliance: 80,
        averagePositionError: 0.5,
        timeWindowCompliance: 80,
        completionRate: 100,
        overallScore: 80,
        averageLegTimeDifference: 0
      };
      const alerts = generateAlerts(metrics);
      expect(alerts).toHaveLength(0);
    });

    it('should generate multiple alerts when applicable', () => {
      const metrics = {
        sequenceCompliance: 15,
        averagePositionError: 4.5,
        timeWindowCompliance: 40,
        completionRate: 100,
        overallScore: 30,
        averageLegTimeDifference: 0
      };
      const alerts = generateAlerts(metrics);
      expect(alerts).toHaveLength(2);
    });
  });

  describe('buildComplianceAnalysis', () => {
    it('should exclude Kitchen items (priority 0) from analysis', () => {
      const simulated = [createRouteItem('KITCHEN_PICKUP', 0), createRouteItem('d1', 1), createRouteItem('d2', 2)];
      const actual = [createRouteItem('KITCHEN_PICKUP', 0), createRouteItem('d1', 1), createRouteItem('d2', 2)];

      const result = buildComplianceAnalysis(simulated, actual, 2);
      expect(result.deliveries).toHaveLength(2);
      expect(result.deliveries.every((d) => d.plannedOrder !== 0)).toBe(true);
    });

    it('should calculate correct position deviation', () => {
      const simulated = [createRouteItem('d1', 1), createRouteItem('d2', 2), createRouteItem('d3', 3)];
      const actual = [createRouteItem('d1', 2), createRouteItem('d2', 1), createRouteItem('d3', 3)];

      const result = buildComplianceAnalysis(simulated, actual, 3);

      const d1 = result.deliveries.find((d) => d.id === 'd1');
      const d2 = result.deliveries.find((d) => d.id === 'd2');
      const d3 = result.deliveries.find((d) => d.id === 'd3');

      expect(d1?.positionDeviation).toBe(1); // actual 2 - planned 1
      expect(d2?.positionDeviation).toBe(-1); // actual 1 - planned 2
      expect(d3?.positionDeviation).toBe(0); // actual 3 - planned 3
    });

    it('should sort deliveries by plannedOrder', () => {
      const simulated = [createRouteItem('d3', 3), createRouteItem('d1', 1), createRouteItem('d2', 2)];
      const actual = [createRouteItem('d1', 1), createRouteItem('d2', 2), createRouteItem('d3', 3)];

      const result = buildComplianceAnalysis(simulated, actual, 3);

      expect(result.deliveries[0].plannedOrder).toBe(1);
      expect(result.deliveries[1].plannedOrder).toBe(2);
      expect(result.deliveries[2].plannedOrder).toBe(3);
    });

    it('should calculate correct completion rate', () => {
      const simulated = [createRouteItem('d1', 1), createRouteItem('d2', 2)];
      const actual = [createRouteItem('d1', 1)]; // Only 1 of 2 delivered

      const result = buildComplianceAnalysis(simulated, actual, 2);
      expect(result.metrics.completionRate).toBe(50);
    });

    it('should only include deliveries present in both routes', () => {
      const simulated = [createRouteItem('d1', 1), createRouteItem('d2', 2), createRouteItem('d3', 3)];
      const actual = [createRouteItem('d1', 1), createRouteItem('d3', 2)]; // d2 not delivered

      const result = buildComplianceAnalysis(simulated, actual, 3);
      expect(result.deliveries).toHaveLength(2);
      expect(result.deliveries.map((d) => d.id)).toEqual(['d1', 'd3']);
    });

    it('should categorize deviations correctly', () => {
      const simulated = [
        createRouteItem('d1', 1),
        createRouteItem('d2', 2),
        createRouteItem('d3', 3),
        createRouteItem('d4', 4)
      ];
      const actual = [
        createRouteItem('d1', 1), // 0 deviation - perfect
        createRouteItem('d2', 4), // +2 deviation - minor
        createRouteItem('d3', 7), // +4 deviation - moderate
        createRouteItem('d4', 11) // +7 deviation - major
      ];

      const result = buildComplianceAnalysis(simulated, actual, 4);

      expect(result.deliveries.find((d) => d.id === 'd1')?.deviationCategory).toBe('perfect');
      expect(result.deliveries.find((d) => d.id === 'd2')?.deviationCategory).toBe('minor');
      expect(result.deliveries.find((d) => d.id === 'd3')?.deviationCategory).toBe('moderate');
      expect(result.deliveries.find((d) => d.id === 'd4')?.deviationCategory).toBe('major');
    });

    it('should use simulated withinWindow when actual has no deliveredAt', () => {
      const simulated: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, withinWindow: true },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, withinWindow: true },
        { id: 'd3', name: 'D3', priority: 3, lat: 0, lng: 0, withinWindow: false }
      ];
      // Actual route has no deliveredAt, so withinWindow should fall back to simulated
      const actual: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, withinWindow: false },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, withinWindow: false },
        { id: 'd3', name: 'D3', priority: 3, lat: 0, lng: 0, withinWindow: false }
      ];

      const result = buildComplianceAnalysis(simulated, actual, 3);

      expect(result.deliveries.find((d) => d.id === 'd1')?.withinWindow).toBe(true);
      expect(result.deliveries.find((d) => d.id === 'd2')?.withinWindow).toBe(true);
      expect(result.deliveries.find((d) => d.id === 'd3')?.withinWindow).toBe(false);
      expect(result.metrics.timeWindowCompliance).toBe(67); // 2/3 = 66.67% rounded
    });

    it('should use actual withinWindow when actual has deliveredAt', () => {
      const simulated: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, withinWindow: true },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, withinWindow: true }
      ];
      // Actual route has deliveredAt, so it should use actual's withinWindow
      const actual: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, withinWindow: false, deliveredAt: '2024-01-01T10:00:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, withinWindow: true, deliveredAt: '2024-01-01T11:00:00Z' }
      ];

      const result = buildComplianceAnalysis(simulated, actual, 2);

      expect(result.deliveries.find((d) => d.id === 'd1')?.withinWindow).toBe(false);
      expect(result.deliveries.find((d) => d.id === 'd2')?.withinWindow).toBe(true);
      expect(result.metrics.timeWindowCompliance).toBe(50);
    });

    it('should include travel time leg comparisons in result', () => {
      const simulated: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:00:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:10:00Z' }
      ];
      const actual: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:05:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:20:00Z' }
      ];

      const result = buildComplianceAnalysis(simulated, actual, 2);
      expect(result.travelTimeLegComparisons).toBeDefined();
      expect(result.travelTimeLegComparisons).toHaveLength(1);
    });
  });

  describe('calculateTravelTimeLegDifferences', () => {
    it('should return empty array when no consecutive pairs exist', () => {
      const simulated: AutoRouteItem[] = [{ id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0 }];
      const actual: AutoRouteItem[] = [{ id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0 }];

      const result = calculateTravelTimeLegDifferences(simulated, actual);
      expect(result).toHaveLength(0);
    });

    it('should return empty array when deliveries are not consecutive in actual route', () => {
      const simulated: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:00:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:10:00Z' }
      ];
      // In actual, d2 was delivered first, so d1->d2 are not consecutive
      const actual: AutoRouteItem[] = [
        { id: 'd2', name: 'D2', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:05:00Z' },
        { id: 'd1', name: 'D1', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:15:00Z' }
      ];

      const result = calculateTravelTimeLegDifferences(simulated, actual);
      expect(result).toHaveLength(0);
    });

    it('should calculate travel time difference for consecutive deliveries', () => {
      const simulated: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:00:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:10:00Z' }
      ];
      const actual: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:05:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:20:00Z' }
      ];

      const result = calculateTravelTimeLegDifferences(simulated, actual);

      expect(result).toHaveLength(1);
      expect(result[0].fromDeliveryId).toBe('d1');
      expect(result[0].toDeliveryId).toBe('d2');
      expect(result[0].predictedTravelTimeMinutes).toBe(10); // 10 minutes predicted
      expect(result[0].actualTravelTimeMinutes).toBe(15); // 15 minutes actual
      expect(result[0].differenceMinutes).toBe(5); // 5 minutes slower
      expect(result[0].differencePercent).toBe(50); // 50% slower
    });

    it('should calculate multiple leg comparisons for longer routes', () => {
      const simulated: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:00:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:10:00Z' },
        { id: 'd3', name: 'D3', priority: 3, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:25:00Z' }
      ];
      const actual: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:05:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:12:00Z' },
        { id: 'd3', name: 'D3', priority: 3, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:22:00Z' }
      ];

      const result = calculateTravelTimeLegDifferences(simulated, actual);

      expect(result).toHaveLength(2);
      // First leg: d1 -> d2
      expect(result[0].fromDeliveryId).toBe('d1');
      expect(result[0].toDeliveryId).toBe('d2');
      expect(result[0].predictedTravelTimeMinutes).toBe(10);
      expect(result[0].actualTravelTimeMinutes).toBe(7);
      expect(result[0].differenceMinutes).toBe(-3); // 3 minutes faster

      // Second leg: d2 -> d3
      expect(result[1].fromDeliveryId).toBe('d2');
      expect(result[1].toDeliveryId).toBe('d3');
      expect(result[1].predictedTravelTimeMinutes).toBe(15);
      expect(result[1].actualTravelTimeMinutes).toBe(10);
      expect(result[1].differenceMinutes).toBe(-5); // 5 minutes faster
    });

    it('should exclude kitchen items from comparison', () => {
      const simulated: AutoRouteItem[] = [
        { id: 'KITCHEN_PICKUP', name: 'Kitchen', priority: 0, lat: 0, lng: 0, deliveredAt: '2024-01-01T09:50:00Z' },
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:00:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:10:00Z' }
      ];
      const actual: AutoRouteItem[] = [
        { id: 'KITCHEN_PICKUP', name: 'Kitchen', priority: 0, lat: 0, lng: 0, deliveredAt: '2024-01-01T09:55:00Z' },
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:05:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:15:00Z' }
      ];

      const result = calculateTravelTimeLegDifferences(simulated, actual);

      expect(result).toHaveLength(1);
      expect(result[0].fromDeliveryId).toBe('d1');
      expect(result[0].toDeliveryId).toBe('d2');
    });

    it('should skip legs with missing timestamps', () => {
      const simulated: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:00:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0 } // Missing deliveredAt
      ];
      const actual: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:05:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:15:00Z' }
      ];

      const result = calculateTravelTimeLegDifferences(simulated, actual);
      expect(result).toHaveLength(0);
    });

    it('should handle negative difference (faster than predicted)', () => {
      const simulated: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:00:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:20:00Z' }
      ];
      const actual: AutoRouteItem[] = [
        { id: 'd1', name: 'D1', priority: 1, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:05:00Z' },
        { id: 'd2', name: 'D2', priority: 2, lat: 0, lng: 0, deliveredAt: '2024-01-01T10:10:00Z' }
      ];

      const result = calculateTravelTimeLegDifferences(simulated, actual);

      expect(result).toHaveLength(1);
      expect(result[0].predictedTravelTimeMinutes).toBe(20);
      expect(result[0].actualTravelTimeMinutes).toBe(5);
      expect(result[0].differenceMinutes).toBe(-15); // 15 minutes faster
      expect(result[0].differencePercent).toBe(-75); // 75% faster
    });
  });
});
