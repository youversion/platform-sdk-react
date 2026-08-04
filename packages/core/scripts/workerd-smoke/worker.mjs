import { resolveHtmlAdapters } from '../../src/bible-html-adapters.ts';
import { transformBibleHtml } from '../../src/bible-html-transformer.ts';

/**
 * Edge smoke against the shipped path: dynamic `import('linkedom')` inside
 * `resolveHtmlAdapters`, then the real transform. A hand-rolled linkedom
 * DOMParser check would stay green while our adapters broke.
 */
const RAW = `<div><div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>In the beginning<span class="yv-n f"><span class="ft">A note</span></span>.</div><table><tr><td>a</td></tr><tr><td>b</td><td>c</td></tr></table></div>`;

export default {
  async fetch() {
    try {
      const adapters = await resolveHtmlAdapters();
      const { html } = transformBibleHtml(RAW, adapters);
      if (
        !html.includes('data-yv-transformed') ||
        !html.includes('data-verse-footnote')
      ) {
        return new Response(`FAIL ${html}`, { status: 500 });
      }
      return new Response('OK');
    } catch (e) {
      return new Response(
        `FAIL: ${e instanceof Error ? e.message : String(e)}`,
        { status: 500 },
      );
    }
  },
};
