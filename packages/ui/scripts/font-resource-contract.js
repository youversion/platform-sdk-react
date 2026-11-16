const fontLayers = [
  'theme',
  'base',
  'components',
  'utilities',
  'yv-sdk-fonts',
  'yv-sdk-styles',
  'yv-sdk-theme',
  'yv-sdk-utilities',
  'yv-sdk-bible-reader',
];

export const FONT_LAYER_ORDER = `@layer ${fontLayers.join(', ')};`;

export const PUBLIC_FONT_LAYER_ORDER = `@layer properties,${fontLayers.join(',')};`;

export const GOOGLE_FONTS_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Source+Serif+4:wght@400;700&display=swap';

export const GOOGLE_FONTS_IMPORT = `@import url('${GOOGLE_FONTS_STYLESHEET}') layer(yv-sdk-fonts);`;
