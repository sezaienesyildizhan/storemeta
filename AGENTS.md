# AGENTS.md

This file is the working guide for AI agents and contributors changing this repository.

`storemeta` is a TypeScript Node CLI for managing App Store Connect and Google Play metadata and screenshots from local files. Treat it as a release-facing CLI: correctness, predictable filesystem behavior, and secret hygiene matter more than broad refactors.

## Current Product Shape

- Package name: `storemeta`
- CLI binary: `storemeta`
- Runtime: Node.js 20+
- Language: TypeScript, ESM, `moduleResolution: NodeNext`
- Test runner: Vitest
- Config file: `storemeta.yml`
- Current released metadata format: YAML
- Planned default metadata format: Markdown, specified in `docs/MARKDOWN_METADATA.md`

Do not describe planned Markdown metadata support as shipped until the implementation and tests in `docs/TODO.md` are complete.

## Repository Map

- `src/cli.ts`: command registration and global options
- `src/cli/`: command implementations, context creation, rendering, CLI-level tests
- `src/config/`: config schema, app/platform selection, config validation
- `src/formats/`: metadata and screenshot file format helpers
- `src/locales/`: locale normalization, mapping, grouping
- `src/platforms/apple/`: App Store Connect clients and Apple metadata/screenshot flows
- `src/platforms/google/`: Google Play clients, edit sessions, metadata/screenshot flows
- `src/validation/`: local metadata and screenshot validation
- `src/writers/`: safe filesystem writers and path guards
- `tests/`: centralized test suite mirroring the `src/` domain structure
- `docs/`: user documentation, implementation plans, release verification notes
- `examples/`: fake publish-safe sample project
- `scripts/`: build and release verification scripts

## Required Commands

Run the narrowest useful command while developing, then run the full set before considering the work done.

```bash
npm run check
npm test
npm run build
```

Use `npm run coverage` when changing core parsing, validation, filesystem, or platform mapping behavior.

Use `npm run verify:release` only when intentionally verifying release behavior. It may use local release config and real store credentials if present.

## Coding Rules

- Keep TypeScript strict. Do not use `any` to bypass validation unless there is a narrow, documented reason.
- Preserve ESM import style and include `.js` extensions in relative TypeScript imports.
- Prefer existing helpers over new abstractions:
  - config loading and validation from `src/config`
  - metadata parsing from `src/formats`
  - validation from `src/validation`
  - filesystem path guards from `src/writers`
  - CLI summaries from `src/cli/render.ts`
- Keep command behavior deterministic. Sort filesystem entries and locales before producing output.
- Do not write outside configured base directories. Use existing path guard helpers.
- Do not introduce broad refactors while adding a focused feature.
- Keep error messages actionable and include the target file, platform, locale, or config path when possible.
- Never log credential values, JWTs, service account JSON, private keys, or full env contents.

## Metadata Format Rules

Current implemented behavior is YAML-first:

```text
metadata/
  apple/en-US.yml
  google/en-US.yml
```

Markdown metadata support is planned and documented in `docs/MARKDOWN_METADATA.md`.

When implementing Markdown metadata:

- No mixed mode. `metadata.format: markdown` means `.md` only; `metadata.format: yaml` means `.yml` or `.yaml` only.
- Markdown must parse to the existing internal Apple and Google metadata document types before API mapping.
- Frontmatter and heading parsing rules must follow `docs/MARKDOWN_METADATA.md`.
- Update `init`, `scaffold`, `validate`, `metadata pull`, `metadata push`, and `metadata diff` together or clearly mark incomplete work in `docs/TODO.md`.
- Add tests for parser edge cases, duplicate headings, unknown headings, format mismatches, and Google length limits.

## Platform Behavior Rules

Apple:

- Keep App Store Connect API concerns under `src/platforms/apple`.
- App info localization and app store version localization are separate Apple resources; do not collapse them unless the API flow is deliberately redesigned.
- Prefer dry-run behavior that avoids remote clients when possible.

Google:

- Google metadata and screenshot writes must happen inside an edit session.
- Keep edit session lifecycle handling in `src/platforms/google/edits.ts`.
- Validate all local files before committing remote edits.

Screenshots:

- Keep numeric screenshot ordering deterministic.
- Preserve existing platform-specific directory names:
  - Apple display types such as `APP_IPHONE_65`
  - Google image types such as `phoneScreenshots`
- `--replace` is destructive remotely; command output must make replacement explicit.

## Tests

Tests are required for behavior changes.

Any new feature, bug fix, parser rule, validation rule, config behavior, CLI command behavior, platform mapping, or filesystem behavior must include tests in the same change. If a change intentionally does not include tests, the final response or PR description must explain why the change is documentation-only, tooling-only, or otherwise not meaningfully testable.

Tests live under `tests/`, not beside source files. Mirror the `src/` domain path where practical.

- Config changes: `tests/config/*.test.ts`
- Metadata format changes: `tests/formats/*.test.ts`, `tests/validation/metadata/*.test.ts`, platform metadata tests
- CLI command behavior: `tests/cli/*.test.ts`
- Locale behavior: `tests/locales/*.test.ts`
- Screenshot ordering/path behavior: `tests/writers/*.test.ts`, `tests/validation/screenshots/*.test.ts`
- API flow behavior: mocked tests under the relevant `tests/platforms/**` or `tests/cli/**` path

For bug fixes, add a regression test that fails before the fix when practical.

Minimum expectations:

- New CLI command: command-level test plus at least one failure or dry-run case when relevant.
- New config option: schema/validation test plus at least one command-context or behavior test.
- New metadata format behavior: parser test, validation test, and read/write or command-flow test.
- New platform API mapping: pure mapping test plus mocked API flow test.
- New filesystem write behavior: path guard test and overwrite/non-overwrite behavior test.
- Documentation-only change: no test required, but run `git diff --check`.

## Documentation Rules

Update docs in the same change when behavior, config, file layout, or command output changes.

- `README.md`: public landing page and quick start
- `docs/DOCUMENTATION.md`: current user-facing behavior
- `docs/MARKDOWN_METADATA.md`: planned Markdown metadata contract
- `docs/AUTH_SETUP.md`: Apple and Google credential setup
- `docs/TODO.md`: implementation checklist and remaining work
- `examples/`: fake sample files only

Do not let `README.md` or `docs/DOCUMENTATION.md` claim a planned feature is shipped before implementation is complete.

## Security And Local Files

Never commit real secrets, app metadata, production screenshots, or machine-local release files.

Local-only examples include:

- `.env`
- `.env.*` except `.env.release.example`
- `secrets/`
- `.secrets/`
- `*.p8`
- `*.pem`
- `*.key`
- `storemeta.release.yml`
- root `metadata/`
- package tarballs such as `*.tgz`

`examples/` must remain fake and safe to publish. Do not copy real App Store or Google Play listings into examples.

If a command output or diff contains real identifiers, credentials, or pulled production metadata, stop and sanitize before committing.

## Git Hygiene

- Check `git status --short` before and after edits.
- Do not revert user changes unless explicitly asked.
- Do not rewrite history unless the user explicitly requests it and the risk is explained.
- Keep commits focused. Separate documentation-only work from behavior changes when practical.
- Do not commit generated `dist/` unless the release process explicitly requires it.
- Do not commit package tarballs.

## Commit Message Format

Use Conventional Commits. This is an open source project, so commit messages should be clear enough for changelogs, release notes, and outside contributors.

Format:

```text
type(scope): short imperative summary
```

Allowed types:

- `feat`: user-facing feature
- `fix`: bug fix
- `docs`: documentation-only change
- `test`: tests-only change
- `refactor`: behavior-preserving code change
- `chore`: maintenance, repo hygiene, tooling
- `build`: build or packaging change
- `ci`: CI workflow change
- `perf`: performance improvement
- `security`: security hardening or secret hygiene

Recommended scopes:

- `cli`
- `config`
- `metadata`
- `markdown`
- `screenshots`
- `apple`
- `google`
- `auth`
- `docs`
- `examples`
- `release`
- `tests`

Examples:

```text
feat(markdown): add frontmatter parser for metadata files
fix(google): validate listing lengths before opening edit sessions
docs(markdown): define metadata heading rules
test(cli): cover scaffold output for markdown metadata
chore(repo): remove ignored local release artifacts
```

Rules:

- Use lowercase `type` and `scope`.
- Keep the summary under 72 characters when practical.
- Write the summary in imperative mood: `add`, `fix`, `document`, `remove`.
- Do not end the summary with a period.
- Use the body when the reason or migration impact is not obvious.
- Mention breaking changes with a `BREAKING CHANGE:` footer.
- Prefer one logical change per commit.

Avoid:

```text
update files
fix stuff
wip
changes
final
```

## Release Notes

Before publishing a new package:

1. Run `npm run check`.
2. Run `npm test`.
3. Run `npm run build`.
4. Run `npm pack --dry-run` and inspect included files.
5. Confirm examples and docs contain no real secrets or production app data.
6. Confirm package metadata in `package.json` is accurate.

## Agent Checklist

Before finalizing a change:

- Is the implementation scoped to the request?
- Are config/schema/docs/tests updated together?
- Are errors actionable for CLI users?
- Are filesystem writes guarded against escaping configured directories?
- Are outputs deterministic?
- Are secrets and local-only files excluded from the diff?
- Did the relevant verification commands pass, or is the reason they were not run clearly stated?
