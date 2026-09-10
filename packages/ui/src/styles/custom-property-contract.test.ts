import { describe, expect, it } from 'vitest';
import { auditCustomProperties } from '../../scripts/custom-property-contract.js';

describe('auditCustomProperties', () => {
  it('inventories declarations, registrations, and nested references structurally', () => {
    const audit = auditCustomProperties(`
      /* var(--comment-lookalike) */
      @property --registered-duration {
        syntax: "<time>";
        inherits: false;
        initial-value: 0s;
      }
      @property --uninitialized-input {
        syntax: "*";
        inherits: true;
      }
      .example {
        --local-color: var(--registered-duration);
        color: var(--local-color);
        width: var(--outer-input, var(--inner-input, 1rem));
        height: var(--uninitialized-input);
        content: "var(--string-lookalike)";
      }
    `);

    expect(audit.declarations).toEqual(['--local-color', '--registered-duration']);
    expect(audit.references).toEqual([
      '--inner-input',
      '--local-color',
      '--outer-input',
      '--registered-duration',
      '--uninitialized-input',
    ]);
    expect(audit.unexplainedReferences).toEqual([
      '--inner-input',
      '--outer-input',
      '--uninitialized-input',
    ]);
  });

  it('accepts exact reviewed exceptions and rejects a new ambient reference', () => {
    const audit = auditCustomProperties(`
      .reader { max-width: var(--yv-reader-max-width, 65ch); }
      .popover { width: var(--radix-popover-content-available-width); }
      .unknown { border-radius: var(--radius); }
    `);

    expect(audit.unexplainedReferences).toEqual(['--radius']);
  });
});
