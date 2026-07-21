import { describe, it, expect } from 'vitest';
import { buildPassageIds, collapseVerseRuns } from './usfm-ranges';

describe('collapseVerseRuns', () => {
  it('returns an empty list for no verses', () => {
    expect(collapseVerseRuns([])).toEqual([]);
  });

  it('collapses a fully contiguous selection into one run', () => {
    expect(collapseVerseRuns([16, 17, 18])).toEqual([{ start: 16, end: 18 }]);
  });

  it('splits non-contiguous selections into separate runs', () => {
    expect(collapseVerseRuns([1, 3, 4, 8])).toEqual([
      { start: 1, end: 1 },
      { start: 3, end: 4 },
      { start: 8, end: 8 },
    ]);
  });

  it('sorts and de-duplicates before collapsing', () => {
    expect(collapseVerseRuns([18, 16, 17, 16])).toEqual([{ start: 16, end: 18 }]);
  });

  it('drops non-positive verse numbers', () => {
    expect(collapseVerseRuns([0, -1, 2, 3])).toEqual([{ start: 2, end: 3 }]);
  });
});

describe('buildPassageIds', () => {
  it('emits a single-verse USFM for a run of one', () => {
    expect(buildPassageIds('JHN', '3', [16])).toEqual(['JHN.3.16']);
  });

  it('emits a range USFM for a contiguous run', () => {
    expect(buildPassageIds('JHN', '3', [16, 17, 18])).toEqual(['JHN.3.16-18']);
  });

  it('emits one passage id per run for mixed selections', () => {
    expect(buildPassageIds('JHN', '3', [16, 17, 18, 20])).toEqual(['JHN.3.16-18', 'JHN.3.20']);
  });

  it('returns an empty list for an empty selection', () => {
    expect(buildPassageIds('JHN', '3', [])).toEqual([]);
  });
});
