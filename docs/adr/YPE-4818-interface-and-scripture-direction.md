# YPE-4818 - Interface and Scripture direction

Status: **Accepted**
Component: `@youversion/platform-react-ui`, with YVDOM direction metadata from `@youversion/platform-core`
Sister: Swift SDK Bible reader and picker behavior

This ADR records the two direction domains used by React Bible UI. Glossary:
`CONTEXT.md` (**Interface direction**, **Scripture direction**).

## Context

An Arabic interface can display an English Bible, and an English interface can
display an Arabic Bible. Picker language chooses which Bible versions to list;
it does not identify the app's UI locale. One inherited CSS direction therefore
cannot correctly control all three concerns.

Radix direction context controls Radix behavior, but it does not emit a DOM
element or establish CSS direction for ordinary descendants. SDK boundaries and
portals need real `dir` attributes.

## Decisions

- **Interface direction** controls SDK chrome, component geometry, rows,
  controls, directional icons, and portaled surfaces. Resolution order is an
  explicit provider `direction`, the resolved SDK UI locale including browser
  detection, then LTR. SSR uses the LTR fallback until browser locale detection
  completes.
- **Scripture direction** controls Bible content, Scripture typography,
  references, and Scripture-owned footnotes. Resolution order is an explicit
  surface `scriptureDirection`, transformed YVDOM direction, then HTML `auto`.
  Direction does not require a metadata request.
- Bible picker `languageId` and `defaultLanguageId` only select version
  discovery language. They never control interface direction.
- Every SDK-owned public Bible surface, standalone picker composition, and
  portal emits a real `dir`. The provider does not add a wrapper because that
  would change consumer layout.
- Semantic start and end use logical CSS. Canonical arrays, chapter ids,
  navigation targets, accessible names, and explicit physical popover sides do
  not reverse.
- Dynamic API strings use bidi isolation with `bdi dir="auto"`. Search fields
  use `dir="auto"`, while their icon placement remains interface-defined.
- Host callback UI is host-owned and receives no SDK direction wrapper.

## Consequences

Chrome and Scripture can flow in opposite directions without leaking into each
other. Mixed Latin and Arabic labels keep their own readable direction while
row geometry follows the interface. Standalone composition surfaces behave the
same inside web and Expo DOM hosts.
