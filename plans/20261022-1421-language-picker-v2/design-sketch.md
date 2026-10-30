# Bible picker v2, PR1

Sketch for phases 01, 02, and 03. Types and module ownership only. PR1 stays in the current card. Phase 04 is PR2.

## View

```ts
type PickerView = 'versions' | 'languages' | 'languageSearch'
```

`view` names the mounted screen. The Suggested/All tab is a separate field, so Back from `languageSearch` can return to `languages` and keep the tab. Phase 01.

## Context fields that change

```ts
view: PickerView
languageSearchQuery: string
headerOwnsChrome: boolean
```

`headerOwnsChrome` is true only on the SDK popover shell. Standalone `BibleLanguagePickerContent` draws the search icon inside the languages panel when the flag is false. The shell sets the flag so the icon is drawn once. Phase 01.

Back from `languageSearch` clears `languageSearchQuery` and keeps the tab. Back from `languages` clears the query through the existing `closeLanguagePanel` path. When `open` becomes false, the query clears and the next language screen is `languages`. Version `searchQuery` still clears on close. Phase 02.

## PopoverContent

```ts
showClose?: boolean // default true
```

| View | showClose | Header slot |
| --- | --- | --- |
| versions | true | Pill in phase 01. Empty after phase 02, when the language row replaces the pill. |
| languages | false | Search icon. Sets `view` to `languageSearch`. |
| languageSearch | false | Empty. The field is in the body and takes focus. |

Reader settings and every other popover keep the default, so Close stays. Phase 01.

## Transitions

| From | Action | Result |
| --- | --- | --- |
| versions | Language control, or the phase 02 language row | `languages` |
| languages | Back | `versions`, query cleared |
| languages | Search icon | `languageSearch` |
| languages | Pick a language | Set id, clear search, `onRequestClose` |
| languageSearch | Back | `languages`, query cleared, tab kept |
| languageSearch | Pick a language | Set id, clear search, `onRequestClose` |
| any | `open` becomes false | Query cleared. Next language screen is `languages` |

The search field exists only on `languageSearch`. One view is mounted, and the dialog has one heading. Phase 01. Prefer no crossfade. A leftover transition uses `motion-reduce:transition-none`.

## Module map

`packages/ui/src/components/bible-version-picker/`. Delete `bible-version-picker.tsx` in the same change so `./bible-version-picker` resolves to the folder. Phase 01.

- `index.tsx` holds Root, Trigger, context, recent-version helpers, and the public exports. `RECENT_VERSIONS_KEY` and `BibleVersionPickerLanguageTrigger` stay exported.
- `version-list.tsx` holds the versions body. Phase 02 moves version search to the top, places the language row under it, and removes the bottom version search. After that, `headerChild` is empty.
- `language-panel.tsx` holds `LanguagePanel`, `BibleLanguagePickerContent`, and the Suggested/All tabs. Phase 03 sets high-contrast pill classes on `TabsList` and `TabsTrigger` here.
- `language-row.tsx` holds `LanguageRow`. Phase 03 adds this signature in that file.

```ts
function languageRowNames(language): { primary: string; secondary?: string }
```

Primary is the native name, then English, then the id. Secondary is English when it differs from primary. The versions row may call the helper so the selected name matches the list. Sorting stays on `getLanguageDisplayName`.

## Rejected

**`isLanguagesOpen`.** A boolean names two screens. A second flag then allows search-while-versions. `view` already names the mounted screen, so phase 01 step 6 drops the boolean once call sites read `view`.

**Two-layer crossfade.** The old pair of panels was versions and languages. A third screen has no layer, and the hidden layer stays in the accessibility tree. Mount the active view only. The test that expects two animated panels moves to phase 06. Phase 01.
