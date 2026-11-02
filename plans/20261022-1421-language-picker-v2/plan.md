# Language Picker v2

Match Figma Languages Overlay v2 (2026-10-22). UI structure only. No download, audio, or font work.

**Source:** [Languages Overlay Current vs v2](https://www.figma.com/design/temXvWs3FR8DZdM8C17ajf/YVP---Reader-SDK-Design-v2?node-id=4966-6915) node `4966:6915`.

**Standards:** [AGENTS.md](../../AGENTS.md), [packages/ui/AGENTS.md](../../packages/ui/AGENTS.md), [docs/i18n-guidelines.md](../../docs/i18n-guidelines.md), [docs/testing.md](../../docs/testing.md), [docs/release-hardening-decisions.md](../../docs/release-hardening-decisions.md) Decision 4. This repo has no `docs/development-rules.md`.

## Decisions

- Ship changelog items 1–7. Detail in [reports/synthesis.md](reports/synthesis.md).
- Q1–Q5 are assumptions: keep highlight, Back plus card Close plus sheet overlay dismiss, high-contrast pills, existing `data-yv-theme`, API counts only.
- Language rows: native primary + English secondary, inline. Current English-first `justify-between` is the bug.
- Item 7: try `PopoverContent` `sizeVariant` `card|sheet` first. Internal Sheet on Radix Dialog if Floating UI blocks full-bleed. PR2.
- PR1 = phases 01–03 + popover tests + **minor** changeset. Works in today's card.
- Phase 01 splits the 1103-line picker. Later phases edit the new modules.
- Copy changes land in platform-localization. Do not hand-edit `locales/*.json`.

## Phases

- [ ] [01 Panel state + search view](phase-01-panel-state-and-search.md) — 3 views, header search, drop bottom language filter, extract modules
- [ ] [02 Versions entry + search](phase-02-versions-entry-and-search.md) — top search, language row, hide header pill, drop bottom version search
- [ ] [03 Language rows + tabs](phase-03-language-rows-and-tabs.md) — native+English inline, taller rows, high-contrast pills
- [ ] [04 Responsive shell](phase-04-responsive-shell.md) — card at `sm+`, full-viewport under `max-sm` (PR2)
- [ ] [05 i18n](phase-05-i18n-and-localization.md) — reuse keys, upstream value-edit, wire `language` + `searchLanguages`
- [ ] [06 Tests, stories, changeset](phase-06-tests-stories-changeset.md)

01–03 and the popover half of 06 ship as PR1. 04 plus sheet stories ship as PR2. Fold 04 into PR1 only after the phase 01 file split. 05 is a sibling-repo PR. UI code calls existing keys, so English stays the current `en.json` until sync.

## Out of scope

Download, audio, edit-recent frames. Invented region glosses. Aktiv Grotesk. Locale-file edits. Public prop removals. A made-up versions subtitle.

## Unresolved

Q1–Q5 are locked assumptions. Leftover questions: [reports/synthesis.md](reports/synthesis.md#unresolved-questions).
