---
'@youversion/platform-react-ui': patch
'@youversion/platform-core': patch
'@youversion/platform-react-hooks': patch
---

fix(ui): fix the css build so that it removes our css from all layers

- this fixes the issue where our sdk css was getting overridden due to
  the consuming app having css that is unlayered and unlayered css will
  always take precedence over layered css.
