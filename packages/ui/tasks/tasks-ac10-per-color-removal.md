# AC 10: Per-Color Highlight Removal

## Relevant Files

- `src/components/verse-action-popover.tsx` - Main popover component; needs callback signature change
- `src/components/verse-action-popover.test.tsx` - Unit tests for the popover
- `src/components/verse.stories.tsx` - Contains VerseActionPopoverDemo that wires up the callbacks

### Notes

- Unit tests are placed alongside source files
- Run tests with `pnpm test` from packages/ui or `pnpm --filter @youversion/platform-react-ui test`

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`.

## Tasks

- [ ] 1.0 Update popover callback signature to support per-color removal
  - [ ] 1.1 Change `onClearHighlights: () => void` to `onClearHighlight: (color: string) => void` in props type
  - [ ] 1.2 Update prop destructuring in component function signature
  - [ ] 1.3 Update exports if the type is exported

- [ ] 2.0 Update ColorCircle click handler to pass color to clear callback
  - [ ] 2.1 Modify the onClick handler to call `onClearHighlight(color)` instead of `onClearHighlights()`
  - [ ] 2.2 Verify the color variable is accessible in the click handler scope

- [ ] 3.0 Update demo/story to handle per-color removal
  - [ ] 3.1 Update `handleClearHighlights` in VerseActionPopoverDemo to accept `color: string` parameter
  - [ ] 3.2 Filter removal logic to only delete verses matching the specific color
  - [ ] 3.3 Keep popover open if other highlighted verses remain selected (AC 8a)
  - [ ] 3.4 Dismiss popover only when no highlights remain in selection (AC 8)

- [ ] 4.0 Add/update unit tests for per-color removal behavior
  - [ ] 4.1 Update existing tests to use new `onClearHighlight` signature
  - [ ] 4.2 Add test: clicking yellow X calls `onClearHighlight('e6d163')`
  - [ ] 4.3 Add test: clicking different color X buttons calls callback with correct color
  - [ ] 4.4 Verify all 26+ existing tests still pass

- [ ] 5.0 Verify build and all tests pass
  - [ ] 5.1 Run `pnpm test` and confirm all tests pass
  - [ ] 5.2 Run `pnpm build` and confirm no type/build errors
  - [ ] 5.3 Manually verify in Storybook that per-color removal works
