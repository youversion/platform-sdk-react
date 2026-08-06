import { describe, expect, it } from 'vitest';

import {
  ALL_HOSTILE_GROUPS,
  HOSTILE_GROUPS,
  resolveHostileGroups,
  type HostileGroup,
} from './hostile-host';
import {
  TRACKED_PROPERTIES,
  diffSnapshots,
  formatLeakReport,
  leakedProperties,
  snapshotComputedStyles,
  summarizeLeaks,
  type StyleSnapshot,
} from './style-diff';

/** Builds a snapshot by hand, so the diff logic is tested without a browser. */
function snapshot(entries: Record<string, Record<string, string>>): StyleSnapshot {
  return new Map(Object.entries(entries));
}

describe('diffSnapshots', () => {
  it('reports nothing when the two snapshots agree', () => {
    const clean = snapshot({ div: { color: 'rgb(0, 0, 0)', 'font-size': '16px' } });
    const hostile = snapshot({ div: { color: 'rgb(0, 0, 0)', 'font-size': '16px' } });

    expect(diffSnapshots(clean, hostile)).toEqual([]);
  });

  it('reports the element, property, and both values for a changed property', () => {
    const clean = snapshot({ 'div > p': { color: 'rgb(0, 0, 0)' } });
    const hostile = snapshot({ 'div > p': { color: 'rgb(255, 0, 255)' } });

    expect(diffSnapshots(clean, hostile)).toEqual([
      { path: 'div > p', property: 'color', clean: 'rgb(0, 0, 0)', hostile: 'rgb(255, 0, 255)' },
    ]);
  });

  it('reports every changed property on the same element separately', () => {
    const clean = snapshot({ div: { 'padding-top': '0px', 'box-sizing': 'border-box' } });
    const hostile = snapshot({ div: { 'padding-top': '16px', 'box-sizing': 'content-box' } });

    expect(diffSnapshots(clean, hostile)).toHaveLength(2);
  });

  it('skips paths that exist in only one snapshot, since the shape changed', () => {
    const clean = snapshot({ div: { color: 'rgb(0, 0, 0)' } });
    const hostile = snapshot({ span: { color: 'rgb(255, 0, 255)' } });

    expect(diffSnapshots(clean, hostile)).toEqual([]);
  });

  it('skips a property missing from the hostile snapshot', () => {
    const clean = snapshot({ div: { color: 'rgb(0, 0, 0)', 'font-size': '16px' } });
    const hostile = snapshot({ div: { color: 'rgb(0, 0, 0)' } });

    expect(diffSnapshots(clean, hostile)).toEqual([]);
  });
});

describe('leakedProperties', () => {
  it('de-duplicates across elements and sorts', () => {
    const clean = snapshot({
      div: { color: 'rgb(0, 0, 0)', 'box-sizing': 'border-box' },
      'div > p': { color: 'rgb(0, 0, 0)', 'box-sizing': 'border-box' },
    });
    const hostile = snapshot({
      div: { color: 'rgb(0, 255, 0)', 'box-sizing': 'content-box' },
      'div > p': { color: 'rgb(0, 255, 0)', 'box-sizing': 'border-box' },
    });

    expect(leakedProperties(diffSnapshots(clean, hostile))).toEqual(['box-sizing', 'color']);
  });

  it('returns an empty list for an empty leak set', () => {
    expect(leakedProperties([])).toEqual([]);
  });
});

describe('summarizeLeaks and formatLeakReport', () => {
  it('counts leaks per property, most frequent first', () => {
    const leaks = [
      { path: 'a', property: 'color', clean: '1', hostile: '2' },
      { path: 'b', property: 'color', clean: '1', hostile: '2' },
      { path: 'a', property: 'box-sizing', clean: '1', hostile: '2' },
    ];

    expect(summarizeLeaks(leaks)).toEqual([
      { property: 'color', count: 2 },
      { property: 'box-sizing', count: 1 },
    ]);
  });

  it('says so plainly when there are no leaks', () => {
    expect(formatLeakReport('BibleCard', [])).toBe('BibleCard: no leaks');
  });

  it('names the label and the leak count', () => {
    const report = formatLeakReport('BibleCard', [
      { path: 'a', property: 'color', clean: '1', hostile: '2' },
    ]);

    expect(report).toContain('BibleCard: 1 leak(s)');
    expect(report).toContain('color x1');
  });
});

describe('snapshotComputedStyles', () => {
  it('keys the root by its tag name alone', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    expect([...snapshotComputedStyles(root).keys()]).toEqual(['div']);

    root.remove();
  });

  it('keys descendants by their ancestor chain', () => {
    const root = document.createElement('div');
    root.innerHTML = '<ul><li><button></button></li></ul>';
    document.body.appendChild(root);

    expect([...snapshotComputedStyles(root).keys()]).toEqual([
      'div',
      'div > ul',
      'div > ul > li',
      'div > ul > li > button',
    ]);

    root.remove();
  });

  it('indexes same-tag siblings and leaves the first one unindexed', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p></p><p></p><p></p>';
    document.body.appendChild(root);

    expect([...snapshotComputedStyles(root).keys()]).toEqual([
      'div',
      'div > p',
      'div > p[1]',
      'div > p[2]',
    ]);

    root.remove();
  });

  it('counts sibling index per tag, not per position', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p></p><span></span><p></p>';
    document.body.appendChild(root);

    expect([...snapshotComputedStyles(root).keys()]).toEqual([
      'div',
      'div > p',
      'div > span',
      'div > p[1]',
    ]);

    root.remove();
  });

  it('skips style and script elements, which have no visible box', () => {
    const root = document.createElement('div');
    root.innerHTML = '<style></style><p></p>';
    document.body.appendChild(root);

    expect([...snapshotComputedStyles(root).keys()]).toEqual(['div', 'div > p']);

    root.remove();
  });

  it('records every tracked property for each element', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const values = snapshotComputedStyles(root).get('div');

    expect(Object.keys(values ?? {})).toEqual([...TRACKED_PROPERTIES]);

    root.remove();
  });
});

describe('hostile-host groups', () => {
  it('covers every class of hostile CSS the ticket names', () => {
    expect(ALL_HOSTILE_GROUPS).toEqual([
      'preflight',
      'bareElements',
      'aggressiveReset',
      'inheritedTypography',
      'important',
    ]);
  });

  it('gives every group non-empty CSS', () => {
    for (const group of ALL_HOSTILE_GROUPS) {
      expect(HOSTILE_GROUPS[group].trim().length).toBeGreaterThan(0);
    }
  });

  it("widens 'all' into the full group list", () => {
    expect(resolveHostileGroups('all')).toEqual(ALL_HOSTILE_GROUPS);
  });

  it('passes an explicit group list through unchanged', () => {
    const groups: HostileGroup[] = ['aggressiveReset', 'important'];

    expect(resolveHostileGroups(groups)).toEqual(groups);
  });
});
