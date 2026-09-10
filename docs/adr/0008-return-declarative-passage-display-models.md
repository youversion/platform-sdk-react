# Return declarative passage display models from core

`@youversion/platform-core` will provide a high-level passage display operation
that returns transformed HTML, current attribution, stylesheet descriptors, and
container attributes as data. Core will fetch but will not render, inject
resources, mutate the DOM, or cache attribution, preserving its
framework-agnostic boundary while making the correct rendering path difficult
to misuse.
