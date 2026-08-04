import { DOMParser } from 'linkedom';

/**
 * Minimal edge smoke: linkedom must parse + query in workerd.
 * Catches the class of failure where a DOM lib bundles cleanly then dies at runtime.
 */
export default {
  async fetch() {
    const doc = new DOMParser().parseFromString(
      `<html><body>
        <div class="p">
          <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Hi
          <span class="yv-n f"><span class="ft">note</span></span>.
        </div>
        <table><tr><td>a</td></tr><tr><td>b</td><td>c</td></tr></table>
      </body></html>`,
      'text/html',
    );

    const marks = doc.querySelectorAll('.yv-v[v]').length;
    const footnote = doc.querySelector('.yv-n.f');
    const closest = footnote?.closest('.p, p, div.p');
    const rows = doc.querySelectorAll('table tr').length;
    const replaced = doc.createElement('span');
    replaced.setAttribute('data-ok', '1');
    footnote?.replaceWith(replaced);

    if (marks !== 1 || !closest || rows < 2 || !doc.querySelector('[data-ok="1"]')) {
      return new Response(
        `FAIL marks=${marks} closest=${Boolean(closest)} rows=${rows}`,
        { status: 500 },
      );
    }

    return new Response(`OK marks=${marks} rows=${rows}`);
  },
};
