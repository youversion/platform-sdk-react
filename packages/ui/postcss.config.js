import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

const removeLayersPlugin = () => ({
  postcssPlugin: 'postcss-remove-layers',
  AtRule: {
    layer: (atRule) => {
      // Unwrap the contents and remove the @layer wrapper
      console.log('Found @layer:', atRule.params);
      atRule.replaceWith(atRule.nodes);
    },
  },
});
removeLayersPlugin.postcss = true;

export default {
  plugins: [tailwindcss, autoprefixer, removeLayersPlugin, cssnano],
};
