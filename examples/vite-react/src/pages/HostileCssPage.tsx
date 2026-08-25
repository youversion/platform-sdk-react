import { useState } from 'react';
import { BibleCard, YouVersionAuthButton } from '@youversion/platform-react-ui';

interface HostileVector {
  key: string;
  label: string;
  expectation: string;
  example: string;
  css: string;
}

const HOSTILE_VECTORS: HostileVector[] = [
  {
    key: 'type-selectors',
    label: 'Type selectors',
    expectation: 'The plain button changes; the SDK button should not.',
    example: 'button, h1, h2 { … }',
    css: `
.hostile-zone button,
.hostile-zone [role='button'],
.hostile-zone h1,
.hostile-zone h2 {
  appearance: none !important;
  background: #b91c1c !important;
  border: 8px dashed #84cc16 !important;
  border-radius: 0 !important;
  color: #fff !important;
  font: 28px/1 fantasy !important;
  padding: 28px !important;
  text-transform: uppercase !important;
}`,
  },
  {
    key: 'inherited',
    label: 'Inherited properties',
    expectation: 'Host text changes; the SDK button should retain its typography.',
    example: '.hostile-zone { font-family: … }',
    css: `
.hostile-zone {
  color: #d600d6 !important;
  cursor: crosshair !important;
  font-family: 'Comic Sans MS', fantasy !important;
  font-size: 24px !important;
  font-style: italic !important;
  letter-spacing: 0.25em !important;
  line-height: 2.4 !important;
  text-transform: uppercase !important;
}`,
  },
  {
    key: 'universal-important',
    label: 'Universal selector with !important',
    expectation: 'Every reachable host element changes; shadow internals should not.',
    example: '* { … !important }',
    css: `
.hostile-zone * {
  color: #d600d6 !important;
  font-family: 'Comic Sans MS', fantasy !important;
  letter-spacing: 0.2em !important;
  text-transform: uppercase !important;
}`,
  },
  {
    key: 'shadow-host',
    label: 'Shadow-host box attack',
    expectation: 'The witness disappears; the SDK host should remain usable.',
    example: '[data-yv-shadow-host] { display: none !important }',
    css: `
.hostile-zone [data-yv-shadow-host],
.hostile-zone [data-host-box-witness] {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
  transform: scale(0.5) !important;
}`,
  },
  {
    key: 'host-pseudo-elements',
    label: 'Shadow-host pseudo-elements',
    expectation: 'The witness gains generated content; the SDK host should not.',
    example: '[data-yv-shadow-host]::before { content: … !important }',
    css: `
.hostile-zone [data-yv-shadow-host]::before,
.hostile-zone [data-yv-shadow-host]::after,
.hostile-zone [data-host-pseudo-witness]::before {
  content: 'HOSTILE' !important;
  display: block !important;
  background: #b91c1c !important;
  color: #fff !important;
  padding: 8px !important;
}`,
  },
  {
    key: 'font-face',
    label: '@font-face family collision (known limitation)',
    expectation:
      'Registers a document-level Inter collision that can reach the shadow tree; the visible result depends on locally installed fonts.',
    example: "@font-face { font-family: 'Inter'; … }",
    css: `
@font-face {
  font-family: 'Inter';
  src: local('Comic Sans MS'), local('Chalkboard SE');
}
@font-face {
  font-family: 'Untitled Serif';
  src: local('Comic Sans MS'), local('Chalkboard SE');
}`,
  },
];

export function HostileCssPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    'type-selectors': true,
    inherited: false,
    'universal-important': false,
    'shadow-host': false,
    'host-pseudo-elements': false,
    'font-face': false,
  });

  const toggle = (key: string) => {
    setEnabled((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="flex flex-col gap-8 p-6 md:p-12">
      {HOSTILE_VECTORS.filter((vector) => enabled[vector.key]).map((vector) => (
        <style key={vector.key}>{vector.css}</style>
      ))}

      <section className="rounded-lg border p-5">
        <h1 className="text-xl font-semibold">Automatic Shadow DOM isolation POC</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          This spike isolates <code>YouVersionAuthButton</code> and <code>BibleCard</code> (picker
          off) on Austin&apos;s existing shadow host, with a StyleX-only sheet. Host controls should
          look broken when an attack is active. The SDK button and card heading should stay stable.
          The font-face option demonstrates a known Shadow DOM limitation.
        </p>

        <fieldset className="mt-5 flex flex-col gap-3">
          <legend className="mb-2 font-medium">Hostile stylesheet vectors</legend>
          {HOSTILE_VECTORS.map((vector) => (
            <div
              key={vector.key}
              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <label className="flex items-start gap-3 text-sm">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={enabled[vector.key] ?? false}
                  onChange={() => toggle(vector.key)}
                />
                <span>
                  <span className="font-medium">{vector.label}</span>
                  <span className="block text-muted-foreground">{vector.expectation}</span>
                </span>
              </label>
              <code className="w-fit max-w-full overflow-x-auto whitespace-nowrap rounded bg-muted px-2 py-1 text-xs">
                {vector.example}
              </code>
            </div>
          ))}
        </fieldset>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-5 rounded-lg border border-dashed p-5">
          <h2 className="text-sm font-semibold">LIGHT DOM — SHOULD BE AFFECTED</h2>
          <div className="hostile-zone flex flex-col gap-5">
            <button type="button">Plain host-app button</button>
            <h2>Plain host heading</h2>
            <p>Plain host text for inherited-property attacks.</p>
            <div data-host-box-witness className="rounded border p-3">
              Host-box witness — this should disappear during the host attack.
            </div>
            <div data-host-pseudo-witness className="rounded border p-3">
              Pseudo-element witness — generated content should appear above this text.
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif' }}>
              Host text requesting Inter for the font-face collision.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-lg border p-5">
          <h2 className="text-sm font-semibold">SDK POC — SHOULD RESIST</h2>
          <div className="hostile-zone flex flex-col gap-5">
            <YouVersionAuthButton
              size="short"
              onAuthError={(error) => console.error('Auth error:', error)}
            />
            <BibleCard reference="JHN.3.16" versionId={3034} />
          </div>
          <p className="text-sm text-muted-foreground">
            BibleCard is measured with the version picker off so popover work stays on YPE-5138.
          </p>
        </section>
      </div>
    </div>
  );
}
