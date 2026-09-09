# SDK Demo feature map

User-facing surfaces in `examples/vite-react`. Drive with `node .cursor/skills/verify-sdk-demo/scripts/drive.mjs <feature>`.

| Feature | Drive id | How a user gets there |
| --- | --- | --- |
| [Bible Reader](bible-reader.md) | `bible-reader` | Default page; nav **Bible Reader** |
| [Verse of the Day](verse-of-the-day.md) | `verse-of-the-day` | Nav **Verse of the Day** |
| [Bible Card](bible-card.md) | `bible-card` | Nav **Bible Card** |
| [Sign in](sign-in.md) | *(manual / account)* | Navbar **Sign in**; or tap a verse then a highlight color |
| [Theme](theme.md) | `theme` | Navbar **Toggle theme** |

There is no client router. `App` swaps `bible-reader` \| `votd` \| `bible-card` in memory. A proof that only loads the default reader is incomplete when the change also touches VOTD, the card, auth, or theme.
