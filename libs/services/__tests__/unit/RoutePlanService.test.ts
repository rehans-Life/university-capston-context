/* eslint-disable @typescript-eslint/no-explicit-any */
import { RoutePlanServiceService } from '../../RoutePlanService';

describe('RoutePlanServiceService.parseCode', () => {
  it('should parse a standard UK postal code with two parts', () => {
    const result = RoutePlanServiceService.parseCode('W1U 6AG');
    expect(result).toEqual({
      outwardPrefix: 'W',
      outwardDigit: 1,
      outwardSuffix: 'U',
      inwardDigit: 6,
      inwardLetters: 'AG'
    });
  });

  it('should parse a postal code without outward suffix', () => {
    const result = RoutePlanServiceService.parseCode('N81 9XY');
    expect(result).toEqual({
      outwardPrefix: 'N',
      outwardDigit: 81,
      outwardSuffix: '',
      inwardDigit: 9,
      inwardLetters: 'XY'
    });
  });

  it('should parse a postal code with multi-letter prefix', () => {
    const result = RoutePlanServiceService.parseCode('SW1A 2AA');
    expect(result).toEqual({
      outwardPrefix: 'SW',
      outwardDigit: 1,
      outwardSuffix: 'A',
      inwardDigit: 2,
      inwardLetters: 'AA'
    });
  });

  it('should handle a single-part postal code (outward only)', () => {
    const result = RoutePlanServiceService.parseCode('W1U');
    expect(result).toEqual({
      outwardPrefix: 'W',
      outwardDigit: 1,
      outwardSuffix: 'U',
      inwardDigit: 0,
      inwardLetters: ''
    });
  });

  it('should handle postal code with leading/trailing whitespace', () => {
    const result = RoutePlanServiceService.parseCode('  E1 6AN  ');
    expect(result).toEqual({
      outwardPrefix: 'E',
      outwardDigit: 1,
      outwardSuffix: '',
      inwardDigit: 6,
      inwardLetters: 'AN'
    });
  });

  it('should return defaults for non-parseable input', () => {
    const result = RoutePlanServiceService.parseCode('INVALID');
    expect(result).toEqual({
      outwardPrefix: 'INVALID',
      outwardDigit: 0,
      outwardSuffix: '',
      inwardDigit: 0,
      inwardLetters: ''
    });
  });

  it('should handle numeric-only outward code', () => {
    const result = RoutePlanServiceService.parseCode('EC2 5AA');
    expect(result).toEqual({
      outwardPrefix: 'EC',
      outwardDigit: 2,
      outwardSuffix: '',
      inwardDigit: 5,
      inwardLetters: 'AA'
    });
  });
});
