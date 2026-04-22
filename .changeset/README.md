# Changesets

This directory holds [changeset](https://github.com/changesets/changesets) files describing changes to `@fhir-place/react-fhir`. Each PR that touches the library should include a changeset:

```bash
pnpm changeset
```

…and commit the generated `.changeset/*.md`. A bot / release workflow consumes them to bump the package version, update `CHANGELOG.md`, and publish to npm when we push a release tag.

## Picking a bump

- **patch** — bug fixes, docs, internal refactors (no behaviour change to consumers)
- **minor** — new features, non-breaking additions (new components, new hooks)
- **major** — breaking API changes

The `@fhir-place/demo` and example apps are excluded (`ignore` in config) — they're not published.
