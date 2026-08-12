---
'@youversion/platform-react-ui': patch
---

Paint and clear non-palette highlight colors in the web Bible reader.

Apply stays limited to the five SDK palette colors. Valid non-palette API hex now paints on the reader and appears in the remove tray at its exact color with the checkmark. Invalid hex is dropped from paint and the tray. Clear keeps the existing ANY rule for mixed selections.
