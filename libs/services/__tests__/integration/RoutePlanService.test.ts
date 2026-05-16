/* eslint-disable @typescript-eslint/no-explicit-any */
import { RoutePlanServiceService } from '../../RoutePlanService';

jest.mock('@teamcalo/core', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

describe('RoutePlanServiceService (integration)', () => {
  describe('parseCode', () => {
    it('should correctly sort postal codes when used in batch', () => {
      const postalCodes = ['SW1A 2AA', 'E1 6AN', 'W1U 6AG', 'EC2 5AA', 'N81 9XY'];
      const parsed = postalCodes.map((pc) => ({
        original: pc,
        parsed: RoutePlanServiceService.parseCode(pc)
      }));

      const sorted = parsed.sort((a, b) => {
        if (a.parsed.outwardPrefix !== b.parsed.outwardPrefix) {
          return a.parsed.outwardPrefix.localeCompare(b.parsed.outwardPrefix);
        }
        if (a.parsed.outwardDigit !== b.parsed.outwardDigit) {
          return a.parsed.outwardDigit - b.parsed.outwardDigit;
        }
        return a.parsed.outwardSuffix.localeCompare(b.parsed.outwardSuffix);
      });

      // E < EC < N < SW < W (alphabetical prefix ordering)
      expect(sorted[0].original).toBe('E1 6AN');
      expect(sorted[1].original).toBe('EC2 5AA');
      expect(sorted[2].original).toBe('N81 9XY');
      expect(sorted[3].original).toBe('SW1A 2AA');
      expect(sorted[4].original).toBe('W1U 6AG');
    });

    it('should handle edge case postal codes consistently', () => {
      const edgeCases = ['A1 1AA', 'AA1 1AA', 'A1A 1AA', 'AA1A 1AA'];
      for (const pc of edgeCases) {
        const result = RoutePlanServiceService.parseCode(pc);
        expect(result).toBeDefined();
        expect(typeof result.outwardPrefix).toBe('string');
        expect(typeof result.outwardDigit).toBe('number');
      }
    });
  });
});
