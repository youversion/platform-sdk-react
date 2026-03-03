import { describe, it, expect, test } from 'vitest';
import { getDayOfYear } from './getDayOfYear';

describe('getDayOfYear', () => {
  // Group 1: Standard days
  test.for([
    { date: new Date(2025, 0, 1), expected: 1, label: 'Jan 1' },
    { date: new Date(2025, 0, 2), expected: 2, label: 'Jan 2' },
    { date: new Date(2025, 1, 1), expected: 32, label: 'Feb 1' },
    { date: new Date(2025, 6, 4), expected: 184, label: 'Jul 4 (non-leap)' },
    { date: new Date(2025, 11, 31), expected: 365, label: 'Dec 31 (non-leap)' },
  ])('should return $expected for $label', ({ date, expected }, { expect }) => {
    expect(getDayOfYear(date)).toBe(expected);
  });

  // Group 2: Leap year handling
  test.for([
    { date: new Date(2024, 1, 28), expected: 59, label: 'Feb 28 (leap)' },
    { date: new Date(2024, 1, 29), expected: 60, label: 'Feb 29 (leap)' },
    { date: new Date(2024, 2, 1), expected: 61, label: 'Mar 1 (leap)' },
    { date: new Date(2025, 2, 1), expected: 60, label: 'Mar 1 (non-leap)' },
    { date: new Date(2024, 11, 31), expected: 366, label: 'Dec 31 (leap)' },
  ])('should return $expected for $label', ({ date, expected }, { expect }) => {
    expect(getDayOfYear(date)).toBe(expected);
  });

  // Group 3: Time-of-day stability
  test.for([
    { date: new Date(2025, 0, 1, 0, 0, 0), expected: 1, label: 'midnight' },
    { date: new Date(2025, 0, 1, 23, 59, 59), expected: 1, label: 'end of day' },
    { date: new Date(2025, 5, 15, 12, 0, 0), expected: 166, label: 'noon Jun 15' },
  ])('should return $expected at $label', ({ date, expected }, { expect }) => {
    expect(getDayOfYear(date)).toBe(expected);
  });

  // Group 4: Edge cases
  it('should handle century non-leap year (1900)', () => {
    expect(getDayOfYear(new Date(1900, 2, 1))).toBe(60);
  });

  it('should handle century leap year (2000)', () => {
    expect(getDayOfYear(new Date(2000, 2, 1))).toBe(61);
  });

  it('should handle far future dates', () => {
    expect(getDayOfYear(new Date(2100, 0, 1))).toBe(1);
  });
});
