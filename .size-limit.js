/** CI gate for published consumer-bundle bytes. */
export default [
  {
    name: 'core / full barrel (esm)',
    path: 'packages/core/dist/index.js',
    limit: '21.5 KB',
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
    limit: '27 KB',
    ignore: ['react', 'react-dom', '@tanstack/react-query'],
  },
  {
    name: 'hooks / useChapter only',
    path: 'packages/hooks/dist/index.js',
    import: '{ useChapter }',
    limit: '12.2 KB',
    ignore: ['react', 'react-dom', '@tanstack/react-query'],
  },
  {
    name: 'ui / YouVersionProvider only',
    path: 'packages/ui/dist/index.js',
    import: '{ YouVersionProvider }',
    limit: '54 KB',
    ignore: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  {
    name: 'ui / Separator only',
    path: 'packages/ui/dist/index.js',
    import: '{ Separator }',
    limit: '19 KB',
    ignore: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  {
    name: 'ui / full barrel',
    path: 'packages/ui/dist/index.js',
    limit: '175 KB',
    ignore: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  {
    name: 'ui / tailwind.css',
    path: 'packages/ui/dist/tailwind.css',
    limit: '9.5 KB',
  },
];
