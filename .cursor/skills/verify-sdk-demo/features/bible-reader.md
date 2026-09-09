# Bible Reader

Full-height reader: John 1 in version `3034` by default, with a bottom toolbar for chapter, version, and settings. This is the demo landing page.

## Sub-features

- Chapter next / previous (`JHN.1` → `JHN.2` on first Next)
- Book + chapter picker (popover heading **Books**, search placeholder **Search**, chapter grid; intro cells use `data-testid="intro-chapter-button"`)
- Version picker (abbreviation on the trigger; language trigger aria **Select language**)
- Reader settings: font size (`increase-font-size` / `decrease-font-size`), font family (Inter / Untitled Serif / Source Serif), line spacing (`line-spacing`)
- Verse tap selects `.yv-v[v]` and opens **Verse actions** (copy, share, highlight colors when live)
- Highlight apply / clear (self-contained; needs a signed-in user with the **highlights** permission — not the navbar Sign in scopes)

## How to get to it (user POV)

1. Open the demo origin. The first screen is already the reader.
2. Or click **Bible Reader** in the desktop header (or hamburger **Toggle menu** on narrow viewports).

## Driving it with Playwright

```bash
node .cursor/skills/verify-sdk-demo/scripts/drive.mjs bible-reader
```

Recipe the helper runs:

1. Confirm desktop nav **Bible Reader**, no missing-app-key alert.
2. Wait for `[data-slot="yv-bible-renderer"]` and `.yv-v[v]`.
3. Screenshot (`01-john-1.png`).
4. Read the **Change Bible book and chapter** button label.
5. Click **Next chapter**.
6. Wait out `role="status"` **Loading passage** if it appears; wait until the chapter-picker label changes.
7. Screenshot (`02-after-next-chapter.png`).

Further probes (not in the helper; use the same page):

- `getByRole('button', { name: /change bible version/i })` then pick another abbreviation; renderer text/copyright should follow.
- `getByRole('button', { name: /settings/i })` → **Reader Settings**; click `getByTestId('increase-font-size')` and read `localStorage['youversion-platform:reader:font-size']`.
- Click `.yv-v[v="1"]`; expect `.yv-v-selected` and `getByRole('dialog', { name: /verse actions/i })`.

**End state that proves it:** chapter-picker label is no longer the John 1 label; renderer still has verse wrappers; loading status is gone.

## Gotchas

- Missing or empty `VITE_YVP_APP_KEY` replaces the entire app (no navbar, no reader).
- Desktop nav is `hidden` below the `md` breakpoint — keep the 1280×800 viewport or open the hamburger.
- Next on John 1 is John 2, not a new book. Previous on John 1 goes to the prior book’s last chapter and may disable at the start of the canon.
- `HIGHLIGHTS_LIVE` is on in this package. Color taps while signed out open the sign-in dialog (`Yes Please` / `No Thanks`), not a silent write. Navbar Sign in does **not** request the highlights permission.
- Highlights are per Bible version. Changing version hides another version’s marks.
- Toolbar version button shows **Loading Bible version** while metadata is in flight — wait for **Change Bible version** before asserting the abbreviation.
- Do not attach to a human’s `localhost:5173` session; reader `localStorage` and auth tokens are origin-scoped.
