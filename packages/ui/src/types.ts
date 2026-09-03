// Types only. A value `export *` becomes `import * as core` in the UI barrel
// and pulls the whole core graph into every named import.
export type * from '@youversion/platform-core';
