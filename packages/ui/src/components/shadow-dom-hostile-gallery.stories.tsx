import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState, type ReactNode } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { ShadowRootHost } from '../lib/shadow-root-host';
import { ProfileAvatar } from './profile-avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';

const LAB_STYLES = `
  .shadow-lab {
    --lab-ink: #171914;
    --lab-paper: #f4f1e8;
    --lab-panel: #fffdf6;
    --lab-acid: #dfff43;
    --lab-orange: #ff6b35;
    min-block-size: 100vh;
    padding: clamp(1rem, 3vw, 2.5rem);
    color: var(--lab-ink);
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    background:
      linear-gradient(rgba(23, 25, 20, 0.055) 1px, transparent 1px),
      linear-gradient(90deg, rgba(23, 25, 20, 0.055) 1px, transparent 1px),
      var(--lab-paper);
    background-size: 24px 24px;
  }

  .shadow-lab * {
    box-sizing: border-box;
  }

  .shadow-lab__shell {
    inline-size: min(1180px, 100%);
    margin-inline: auto;
  }

  .shadow-lab__header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1.5rem;
    align-items: end;
    padding-block-end: 1.25rem;
    border-block-end: 3px solid var(--lab-ink);
  }

  .shadow-lab__eyebrow,
  .shadow-lab__panel-label,
  .shadow-lab__specimen-label {
    margin: 0;
    font: 700 0.7rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .shadow-lab__title {
    max-inline-size: 760px;
    margin: 0.45rem 0 0;
    font-size: clamp(2.25rem, 7vw, 5.75rem);
    font-weight: 800;
    letter-spacing: -0.07em;
    line-height: 0.88;
  }

  .shadow-lab__summary {
    max-inline-size: 35ch;
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.55;
  }

  .shadow-lab__status {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    margin-block-start: 0.75rem;
    padding: 0.5rem 0.7rem;
    border: 2px solid var(--lab-ink);
    background: var(--lab-acid);
    box-shadow: 4px 4px 0 var(--lab-ink);
    font: 700 0.72rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    text-transform: uppercase;
  }

  .shadow-lab__status-dot {
    inline-size: 0.65rem;
    block-size: 0.65rem;
    border: 2px solid var(--lab-ink);
    border-radius: 50%;
    background: var(--lab-orange);
  }

  .shadow-lab__controls {
    margin-block-start: 1.5rem;
    border: 2px solid var(--lab-ink);
    background: var(--lab-panel);
    box-shadow: 7px 7px 0 var(--lab-ink);
  }

  .shadow-lab__controls-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.8rem 1rem;
    border-block-end: 2px solid var(--lab-ink);
    background: var(--lab-ink);
    color: var(--lab-paper);
  }

  .shadow-lab__actions {
    display: flex;
    gap: 0.5rem;
  }

  .shadow-lab__action {
    min-block-size: 2rem;
    padding-inline: 0.75rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    color: inherit;
    background: transparent;
    font: 700 0.7rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    cursor: pointer;
  }

  .shadow-lab__action:hover,
  .shadow-lab__action:focus-visible {
    color: var(--lab-ink);
    background: var(--lab-acid);
    outline: 2px solid var(--lab-acid);
    outline-offset: 2px;
  }

  .shadow-lab__attack-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .shadow-lab__attack {
    position: relative;
    display: grid;
    gap: 0.35rem;
    min-block-size: 8.5rem;
    padding: 1rem;
    border-inline-end: 1px solid rgba(23, 25, 20, 0.35);
    cursor: pointer;
  }

  .shadow-lab__attack:last-child {
    border-inline-end: 0;
  }

  .shadow-lab__attack:has(input:checked) {
    background: color-mix(in srgb, var(--lab-acid) 42%, var(--lab-panel));
  }

  .shadow-lab__attack:focus-within {
    outline: 3px solid var(--lab-orange);
    outline-offset: -3px;
  }

  .shadow-lab__attack input {
    inline-size: 1.1rem;
    block-size: 1.1rem;
    margin: 0;
    accent-color: var(--lab-ink);
  }

  .shadow-lab__attack-name {
    font-size: 0.9rem;
    font-weight: 800;
  }

  .shadow-lab__attack code {
    color: #52564b;
    font: 0.68rem/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
    overflow-wrap: anywhere;
  }

  .shadow-lab__stage {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
    margin-block-start: 2rem;
  }

  .shadow-lab__specimen {
    min-inline-size: 0;
    border: 2px solid var(--lab-ink);
    background: var(--lab-panel);
  }

  .shadow-lab__specimen-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-block-end: 2px solid var(--lab-ink);
  }

  .shadow-lab__specimen:first-child .shadow-lab__specimen-header {
    background: #ffcfbf;
  }

  .shadow-lab__specimen:last-child .shadow-lab__specimen-header {
    background: var(--lab-acid);
  }

  .shadow-lab__tree-scope {
    font: 0.67rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .shadow-lab__specimen-body {
    min-block-size: 390px;
    padding: clamp(1rem, 2.5vw, 1.75rem);
  }

  @media (max-width: 900px) {
    .shadow-lab__header,
    .shadow-lab__stage {
      grid-template-columns: 1fr;
    }

    .shadow-lab__attack-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .shadow-lab__attack {
      border-block-end: 1px solid rgba(23, 25, 20, 0.35);
    }
  }

  @media (max-width: 540px) {
    .shadow-lab__attack-grid {
      grid-template-columns: 1fr;
    }

    .shadow-lab__attack {
      min-block-size: auto;
      border-inline-end: 0;
    }
  }
`;

const ATTACK_KEYS = ['preflight', 'inheritance', 'selectors', 'important', 'variables'] as const;

type AttackKey = (typeof ATTACK_KEYS)[number];
type EnabledAttacks = Record<AttackKey, boolean>;

interface HostAttack {
  css: string;
  name: string;
  sample: string;
}

const ATTACKS = {
  preflight: {
    name: 'Tailwind preflight',
    sample: 'button, input { font: inherit; background: transparent; }',
    css: `
      .hostile-stage *,
      .hostile-stage ::before,
      .hostile-stage ::after {
        box-sizing: border-box;
        border-width: 0;
        border-style: solid;
      }

      .hostile-stage button,
      .hostile-stage input,
      .hostile-stage textarea {
        margin: 0;
        padding: 0;
        color: inherit;
        background: transparent;
        border-radius: 0;
        font: inherit;
      }
    `,
  },
  inheritance: {
    name: 'Inherited typography',
    sample: 'font: italic 24px fantasy; letter-spacing: .18em;',
    css: `
      .hostile-stage {
        color: #7a00ff;
        font: italic 24px/2 fantasy;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
    `,
  },
  selectors: {
    name: 'Element selectors',
    sample: 'button, input, textarea { border: 8px dashed; }',
    css: `
      .hostile-stage button,
      .hostile-stage input,
      .hostile-stage textarea {
        border: 8px dashed #00a36c;
        border-radius: 0;
        color: #7a00ff;
        background: #fff200;
        box-shadow: 9px 9px 0 #7a00ff;
      }

      .hostile-stage hr {
        block-size: 12px;
        background: #00a36c;
      }
    `,
  },
  important: {
    name: '!important blast',
    sample: '* { color: hotpink !important; padding: 18px !important; }',
    css: `
      .hostile-stage .sdk-specimen * {
        color: #ff00a8 !important;
        font-family: fantasy !important;
        letter-spacing: 0.14em !important;
      }

      .hostile-stage .sdk-specimen button {
        padding: 18px 28px !important;
        border: 10px ridge #00e5ff !important;
        border-radius: 0 !important;
        background: #ff00a8 !important;
      }

      .hostile-stage .sdk-specimen input,
      .hostile-stage .sdk-specimen textarea {
        padding: 18px !important;
        background: #fff200 !important;
      }
    `,
  },
  variables: {
    name: 'Variable poisoning',
    sample: '* { --yv-primary: lime !important; --yv-spacing: 1.5rem !important; }',
    css: `
      .hostile-stage * {
        --yv-background: #fff200 !important;
        --yv-foreground: #ff00a8 !important;
        --yv-primary: #00e676 !important;
        --yv-primary-foreground: #7a00ff !important;
        --yv-border: #7a00ff !important;
        --yv-radius: 0 !important;
        --yv-spacing: 1.5rem !important;
      }
    `,
  },
} satisfies Record<AttackKey, HostAttack>;

const DEFAULT_ATTACKS = {
  preflight: true,
  inheritance: true,
  selectors: true,
  important: true,
  variables: true,
} satisfies EnabledAttacks;

interface ComponentSpecimenProps {
  scope: 'light' | 'shadow';
}

function ComponentSpecimen({ scope }: ComponentSpecimenProps): ReactNode {
  const emailId = `${scope}-demo-email`;
  const notesId = `${scope}-demo-notes`;

  return (
    <section
      data-testid={`${scope}-gallery`}
      data-yv-sdk
      data-yv-theme="light"
      className="sdk-specimen yv:grid yv:gap-5 yv:rounded-xl yv:border yv:border-border yv:bg-background yv:p-6 yv:font-sans yv:text-foreground yv:shadow-sm"
    >
      <div className="yv:flex yv:items-center yv:gap-3">
        <ProfileAvatar name="SDK Reader" />
        <div className="yv:grid yv:gap-0.5">
          <strong className="yv:text-sm yv:font-bold">SDK component gallery</strong>
          <span className="yv:text-xs yv:text-muted-foreground">
            Five component types / six instances
          </span>
        </div>
      </div>
      <Separator />
      <div className="yv:grid yv:gap-2">
        <label htmlFor={emailId} className="yv:text-sm yv:font-medium">
          Email address
        </label>
        <Input id={emailId} defaultValue="reader@example.com" />
      </div>
      <div className="yv:grid yv:gap-2">
        <label htmlFor={notesId} className="yv:text-sm yv:font-medium">
          Reading notes
        </label>
        <Textarea id={notesId} defaultValue="Keep this passage close." />
      </div>
      <div className="yv:flex yv:flex-wrap yv:gap-3">
        <Button type="button" data-testid={`${scope}-button`}>
          Continue
        </Button>
        <Button type="button" variant="outline">
          Save for later
        </Button>
      </div>
    </section>
  );
}

function ShadowSpecimen(): ReactNode {
  return (
    <ShadowRootHost>
      <ComponentSpecimen scope="shadow" />
    </ShadowRootHost>
  );
}

function HostileGallery(): ReactNode {
  const [enabledAttacks, setEnabledAttacks] = useState<EnabledAttacks>(DEFAULT_ATTACKS);
  const activeCount = ATTACK_KEYS.filter((key) => enabledAttacks[key]).length;
  const attackStyles = useMemo(
    () =>
      ATTACK_KEYS.filter((key) => enabledAttacks[key])
        .map((key) => ATTACKS[key].css)
        .join('\n'),
    [enabledAttacks],
  );

  const setAllAttacks = (enabled: boolean): void => {
    setEnabledAttacks({
      preflight: enabled,
      inheritance: enabled,
      selectors: enabled,
      important: enabled,
      variables: enabled,
    });
  };

  return (
    <main className="shadow-lab">
      <style>{`${LAB_STYLES}\n${attackStyles}`}</style>
      <div className="shadow-lab__shell">
        <header className="shadow-lab__header">
          <div>
            <p className="shadow-lab__eyebrow">Isolation lab / live specimen 01</p>
            <h1 className="shadow-lab__title">Hostile host. Stable components.</h1>
          </div>
          <div>
            <p className="shadow-lab__summary">
              Apply common host-page attacks to the same SDK gallery twice. The light-DOM copy
              degrades; the copy inside one shadow root keeps its intended styling.
            </p>
            <div className="shadow-lab__status" aria-live="polite">
              <span className="shadow-lab__status-dot" aria-hidden="true" />
              {activeCount} / {ATTACK_KEYS.length} attacks active
            </div>
          </div>
        </header>

        <section className="shadow-lab__controls" aria-labelledby="attack-controls-title">
          <div className="shadow-lab__controls-header">
            <h2 id="attack-controls-title" className="shadow-lab__panel-label">
              Host stylesheet attack vectors
            </h2>
            <div className="shadow-lab__actions">
              <button
                className="shadow-lab__action"
                type="button"
                data-testid="enable-all-attacks"
                onClick={() => setAllAttacks(true)}
              >
                Enable all
              </button>
              <button
                className="shadow-lab__action"
                type="button"
                data-testid="clear-all-attacks"
                onClick={() => setAllAttacks(false)}
              >
                Clear all
              </button>
            </div>
          </div>
          <div className="shadow-lab__attack-grid">
            {ATTACK_KEYS.map((key) => {
              const attack = ATTACKS[key];
              return (
                <label className="shadow-lab__attack" key={key}>
                  <input
                    type="checkbox"
                    data-testid={`attack-${key}`}
                    checked={enabledAttacks[key]}
                    onChange={(event) =>
                      setEnabledAttacks((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  <span className="shadow-lab__attack-name">{attack.name}</span>
                  <code>{attack.sample}</code>
                </label>
              );
            })}
          </div>
        </section>

        <section className="shadow-lab__stage hostile-stage" aria-label="Isolation comparison">
          <article className="shadow-lab__specimen">
            <header className="shadow-lab__specimen-header">
              <h2 className="shadow-lab__specimen-label">SDK gallery — unprotected</h2>
              <span className="shadow-lab__tree-scope">Light DOM / expected to break</span>
            </header>
            <div className="shadow-lab__specimen-body">
              <ComponentSpecimen scope="light" />
            </div>
          </article>

          <article className="shadow-lab__specimen">
            <header className="shadow-lab__specimen-header">
              <h2 className="shadow-lab__specimen-label">SDK gallery — isolated</h2>
              <span className="shadow-lab__tree-scope">ShadowRoot / expected to hold</span>
            </header>
            <div className="shadow-lab__specimen-body">
              <ShadowSpecimen />
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

const meta = {
  title: 'Spikes/Shadow DOM hostile host gallery',
  component: HostileGallery,
  parameters: {
    includeAuth: false,
    layout: 'fullscreen',
  },
  tags: ['integration', 'shadow-dom'],
} satisfies Meta<typeof HostileGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InteractiveAttackLab: Story = {
  play: async ({ canvasElement }) => {
    const ownerWindow = canvasElement.ownerDocument.defaultView;
    if (!ownerWindow) throw new Error('story window not available');

    const lightButton = canvasElement.querySelector<HTMLElement>('[data-testid="light-button"]');
    const shadowHost = canvasElement.querySelector<HTMLElement>('[data-yv-shadow-host]');
    if (!lightButton || !shadowHost) throw new Error('comparison specimens not rendered');

    const shadowRoot = await waitFor(() => {
      if (!shadowHost.shadowRoot) throw new Error('shadow root not attached');
      return shadowHost.shadowRoot;
    });
    const shadowButton = shadowRoot.querySelector<HTMLElement>('[data-testid="shadow-button"]');
    if (!shadowButton) throw new Error('shadow button not rendered');

    await waitFor(async () => {
      await expect(ownerWindow.getComputedStyle(lightButton).backgroundColor).toBe(
        'rgb(255, 0, 168)',
      );
      await expect(ownerWindow.getComputedStyle(shadowButton).backgroundColor).toBe(
        'rgb(18, 18, 18)',
      );
    });
    await expect(ownerWindow.getComputedStyle(shadowHost).display).toBe('contents');
    await expect(ownerWindow.getComputedStyle(shadowHost).opacity).toBe('1');

    const clearAll = canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="clear-all-attacks"]',
    );
    const enableAll = canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="enable-all-attacks"]',
    );
    const variablePoisoning = canvasElement.querySelector<HTMLInputElement>(
      '[data-testid="attack-variables"]',
    );
    if (!clearAll || !enableAll || !variablePoisoning) {
      throw new Error('attack controls not rendered');
    }

    await userEvent.click(clearAll);
    await waitFor(async () => {
      await expect(ownerWindow.getComputedStyle(lightButton).backgroundColor).toBe(
        'rgb(18, 18, 18)',
      );
      await expect(ownerWindow.getComputedStyle(shadowButton).backgroundColor).toBe(
        'rgb(18, 18, 18)',
      );
    });

    await userEvent.click(variablePoisoning);
    await waitFor(async () => {
      await expect(ownerWindow.getComputedStyle(lightButton).backgroundColor).toBe(
        'rgb(0, 230, 118)',
      );
      await expect(ownerWindow.getComputedStyle(shadowButton).backgroundColor).toBe(
        'rgb(18, 18, 18)',
      );
    });
    await userEvent.click(variablePoisoning);

    await userEvent.click(enableAll);
    await waitFor(async () => {
      await expect(ownerWindow.getComputedStyle(lightButton).backgroundColor).toBe(
        'rgb(255, 0, 168)',
      );
      await expect(ownerWindow.getComputedStyle(shadowButton).backgroundColor).toBe(
        'rgb(18, 18, 18)',
      );
    });
  },
};
