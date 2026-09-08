import { describe, expect, it } from 'vitest';
import { stripLayerBlocks } from '../../scripts/strip-layer-blocks.js';

const A2_RULE = '[data-yv-sdk] *{appearance:revert-layer;-webkit-appearance:revert-layer}';

describe('stripLayerBlocks', () => {
  it('keeps unlayered A2 rules and drops layered lookalikes that fooled a brace scan', () => {
    const layeredTrap = `
@layer yv-sdk-styles {
  .x::before { content: "}"; }
  .trap { appearance: revert-layer; }
}
`;
    expect(stripLayerBlocks(layeredTrap)).not.toContain('revert-layer');
    expect(stripLayerBlocks(layeredTrap)).not.toContain('.trap');

    const escapedBraceTrap = `
@layer yv-sdk-styles {
  .foo\\} { appearance: revert-layer; }
}
`;
    expect(stripLayerBlocks(escapedBraceTrap)).not.toContain('revert-layer');

    const commentTrap = `
/* @layer yv-sdk-styles { */
${A2_RULE}
/* } */
`;
    const fromComment = stripLayerBlocks(commentTrap);
    expect(fromComment).toContain('appearance:revert-layer');
    expect(fromComment).toContain('-webkit-appearance:revert-layer');

    const quotedAtLayer = `
[data-yv-sdk] *::before { content: "@layer"; }
${A2_RULE}
`;
    const fromQuoted = stripLayerBlocks(quotedAtLayer);
    expect(fromQuoted).toContain('content: "@layer"');
    expect(fromQuoted).toContain('appearance:revert-layer');
    expect(fromQuoted).toContain('-webkit-appearance:revert-layer');

    const singleQuotedAtLayer = `
[data-yv-sdk] *::before { content: '@layer'; }
${A2_RULE}
`;
    expect(stripLayerBlocks(singleQuotedAtLayer)).toContain('appearance:revert-layer');

    const layerStatementThenA2 = `@layer yv-sdk-styles, yv-sdk-theme;${A2_RULE}`;
    const fromStatement = stripLayerBlocks(layerStatementThenA2);
    expect(fromStatement).not.toContain('@layer');
    expect(fromStatement).toContain(A2_RULE);

    const nestedLayer = `
@layer yv-sdk-styles {
  @layer utilities {
    .x::before { content: "}"; appearance: revert-layer; }
  }
}
${A2_RULE}
`;
    const fromNested = stripLayerBlocks(nestedLayer);
    expect(fromNested).not.toContain('.x::before');
    expect(fromNested).toContain(A2_RULE);
  });
});
