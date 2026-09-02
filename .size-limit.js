/**
 * CI gate for published partner-bundle bytes.
 *
 * Official `@size-limit/esbuild` does not set `splitting`. esbuild then inlines
 * `import()`, so the UI Provider row includes every locale catalog. That is the
 * honest number for an esbuild partner who does not split. Do not enable
 * `splitting` here to make the gate look like a Vite first-paint. Vite partners
 * still split those `import()`s. See `scripts/measure-import-size.mjs`.
 */
export default [
  {
    name: 'core / full barrel (esm)',
    path: 'packages/core/dist/index.js',
    limit: '21 KB',
    ignore: ['jsdom'],
  },
  {
    name: 'core / ApiClient only',
    path: 'packages/core/dist/index.js',
    import: '{ ApiClient }',
    limit: '8 KB',
    ignore: ['jsdom'],
  },
  {
    name: 'core / browser entry',
    path: 'packages/core/dist/browser.js',
    limit: '2 KB',
    ignore: ['jsdom'],
  },
  {
    name: 'core / server entry',
    path: 'packages/core/dist/server.js',
    limit: '2 KB',
    ignore: ['jsdom'],
  },
  {
    name: 'hooks / full barrel',
    path: 'packages/hooks/dist/index.js',
    limit: '26 KB',
    ignore: ['react', 'react-dom', '@tanstack/react-query'],
  },
  {
    name: 'hooks / useChapter only',
    path: 'packages/hooks/dist/index.js',
    import: '{ useChapter }',
    limit: '15 KB',
    ignore: ['react', 'react-dom', '@tanstack/react-query'],
  },
  {
    name: 'ui / YouVersionProvider only',
    path: 'packages/ui/dist/index.js',
    import: '{ YouVersionProvider }',
    limit: '18 KB',
    ignore: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  {
    name: 'ui / full barrel',
    path: 'packages/ui/dist/index.js',
    limit: '175 KB',
    ignore: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  {
    name: 'ui / chrome.css',
    path: 'packages/ui/dist/chrome.css',
    limit: '2 KB',
  },
  {
    name: 'ui / tailwind.css',
    path: 'packages/ui/dist/tailwind.css',
    limit: '9 KB',
  },
  {
    name: 'ui / bible-reader.css',
    path: 'packages/ui/dist/bible-reader.css',
    limit: '3 KB',
  },
];
