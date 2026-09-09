# Sign in

YouVersion account session for the demo. Two different entry points request different grants.

## Sub-features

- Navbar **Sign in** (`YouVersionAuthButton` `size="short"`, scopes `profile` and `email` only)
- Navbar **Sign out** when `auth.isAuthenticated`
- Reader **highlight auth flow**: signed-out color tap → sign-in dialog (**INTRODUCING**, **Yes Please**, **No Thanks**); signed-in without highlights → data-exchange permission dialog
- Toolbar user menu (`data-testid="user-menu-trigger"`) inside `BibleReader` when auth is enabled on the provider

## How to get to it (user POV)

- **Profile/email only:** click **Sign in** in the header. Completing OAuth returns to `VITE_YVP_AUTH_REDIRECT_URL` (launch defaults this to the verification origin).
- **Highlights:** on the reader, tap a verse, tap a color. That is the grant path AGENTS.md describes. Navbar Sign in does not request `highlights`.

## Driving it with Playwright

There is no unattended `drive.mjs` command that finishes OAuth. Prove chrome only:

1. Unsigned: `getByRole('button', { name: /^sign in$/i })` is visible next to **Toggle theme**.
2. Click it only if you will complete the YouVersion login yourself. The tab leaves the demo (PKCE).
3. After a real return: header shows the user’s name when present and **Sign out**.
4. For highlights: select `.yv-v[v="1"]`, open **Verse actions**, click a color in **Highlight colors**. Signed out → dialog with **Yes Please**. Confirming starts the same redirect with `requested_permissions` including highlights.

**End state that proves navbar chrome:** Sign in is present and enabled while signed out. **End state that proves a session:** Sign out is present and scripture still loads. **End state that proves highlight consent:** after return, a color tap paints `.yv-v` with a background and does not re-open the dialog.

## Gotchas

- Redirect URL must be registered for the app key (docs mention `http://localhost:5173` for the human demo). Verification uses `http://127.0.0.1:5177` by default — OAuth will fail if that origin is not registered.
- Do not drive a shared origin that already has someone else’s session cookies.
- Pending highlight intent lives in `sessionStorage` (~10 min) across the redirect. An abandoned flow must not apply later.
- Highlights are account data, per Bible version, never local-only.
