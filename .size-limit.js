/** CI gate for published consumer-bundle bytes. */
export default [
  {
    name: 'core / full barrel (esm)',
    path: 'packages/core/dist/index.js',
    // Measured brotlied size 24687 B; set to measured + ~10% per CONTRIBUTING.
    limit: '27.2 KB',
    ignore: ['jsdom'],
  },
  {
    name: 'core / ApiClient only',
    path: 'packages/core/dist/index.js',
    import: '{ ApiClient }',
    // Measured brotlied size 5123 B; set to measured + ~10% per CONTRIBUTING.
    limit: '5.7 KB',
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
    // Measured brotlied size 29918 B; set to measured + ~10% per CONTRIBUTING.
    limit: '32.9 KB',
    ignore: ['react', 'react-dom', '@tanstack/react-query'],
  },
  {
    name: 'hooks / useChapter only',
    path: 'packages/hooks/dist/index.js',
    import: '{ useChapter }',
    // Measured brotlied size 10540 B; set to measured + ~10% per CONTRIBUTING.
    limit: '11.6 KB',
    ignore: ['react', 'react-dom', '@tanstack/react-query'],
  },
  // YouVersionProvider and the full barrel include all bundled translations.
  // Keep measuring both, but omit their limits so translation growth does not
  // fail CI. Core, hooks, Separator, and CSS retain enforced size budgets.
  {
    name: 'ui / YouVersionProvider only',
    path: 'packages/ui/dist/index.js',
    import: '{ YouVersionProvider }',
    ignore: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  {
    name: 'ui / Separator only',
    path: 'packages/ui/dist/index.js',
    import: '{ Separator }',
    limit: '24 KB',
    ignore: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  {
    name: 'ui / full barrel',
    path: 'packages/ui/dist/index.js',
    ignore: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  {
    name: 'ui / tailwind.css',
    path: 'packages/ui/dist/tailwind.css',
    // Language picker wrap/truncate (whitespace-normal, max-w-full, w-auto).
    // Measured brotlied size 9502 B; set to measured + ~10% per CONTRIBUTING.
    limit: '10.5 KB',
  },
];
