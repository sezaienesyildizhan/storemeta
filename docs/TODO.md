# TODO

This file is the implementation checklist for `storemeta`, ordered to minimize rework and unblock end-to-end development as early as possible.

## 0. Security And Repo Hygiene

- [ ] Rotate any previously used Apple and Google credentials before anything public is pushed.
- [x] Ensure `reference/` stays ignored and is never added to Git history.
- [x] Add any additional local-only secret paths to `.gitignore` if needed.
- [x] Confirm the repo contains no machine-specific paths or private metadata.

## 1. Project Scaffold

- [x] Create `package.json`.
- [x] Set package name to `storemeta`.
- [x] Set the CLI binary name to `storemeta` via the `bin` field.
- [x] Add `type`, `engines`, `files`, `scripts`, and initial metadata to `package.json`.
- [x] Create `tsconfig.json`.
- [x] Create the initial source tree under `src/`.
- [x] Add a build output target such as `dist/`.
- [x] Add a minimal `.npmignore` or rely on `package.json` `files`.
- [x] Add a basic `CONTRIBUTING.md`.

## 2. Tooling And Dependency Setup

- [x] Choose the CLI framework or parser.
- [x] Add TypeScript runtime and build dependencies.
- [x] Add a YAML parser.
- [x] Add an HTTP client strategy.
- [x] Add a schema validation library for config and metadata validation.
- [x] Add test tooling.
- [x] Add linting and formatting tooling if desired.

## 3. Source Structure

- [x] Create `src/cli/`.
- [x] Create `src/config/`.
- [x] Create `src/formats/`.
- [x] Create `src/locales/`.
- [x] Create `src/writers/`.
- [x] Create `src/validation/`.
- [x] Create `src/auth/apple/`.
- [x] Create `src/auth/google/`.
- [x] Create `src/platforms/apple/metadata/`.
- [x] Create `src/platforms/apple/screenshots/`.
- [x] Create `src/platforms/google/metadata/`.
- [x] Create `src/platforms/google/screenshots/`.

## 4. Core Domain Types

- [x] Define shared config types.
- [x] Define shared metadata document types.
- [x] Define Apple metadata mapping types.
- [x] Define Google metadata mapping types.
- [x] Define screenshot descriptor types.
- [x] Define locale mapping and grouping types.
- [x] Define command result and summary types.
- [x] Define reusable error types.

## 5. Config System

- [x] Implement loading for `storemeta.yml`.
- [x] Support `--config <path>`.
- [x] Implement schema validation for the root config.
- [x] Support single-app usage cleanly.
- [x] Support multi-app config structure even if only one app is used initially.
- [x] Implement app selection logic via `project.defaultApp` and `--app`.
- [x] Validate required platform identifiers.
- [x] Validate configured credential env var names.
- [x] Validate base directory paths.

## 6. Credential Loading

- [x] Implement Apple credential loading from environment variables.
- [x] Implement Google credential loading from environment variables.
- [x] Validate missing credential cases with clear errors.
- [x] Ensure secrets never appear in logs.
- [x] Add helpers for resolved credential state without exposing secret values.

## 7. Metadata File Parsing

- [x] Implement YAML parsing for `.yml`.
- [x] Implement YAML parsing for `.yaml`.
- [x] Implement YAML parsing for `.md` file contents.
- [x] Add deterministic serialization for pulled metadata files.
- [x] Preserve stable key ordering in written files.
- [x] Add platform-aware schema validation for Apple metadata documents.
- [x] Add platform-aware schema validation for Google metadata documents.

## 8. Locale System

- [x] Implement locale normalization utilities.
- [x] Implement explicit per-platform locale mapping support.
- [x] Implement screenshot grouping support from config.
- [x] Validate that locale groups resolve deterministically.
- [x] Add tests for locale edge cases such as `zh-Hans`, `zh-Hant`, `he-IL`, and grouped English locales.

## 9. Deterministic File Writers

- [x] Implement metadata file writing helpers.
- [x] Implement screenshot path resolution helpers.
- [x] Implement deterministic screenshot filename ordering.
- [x] Ensure directories are created safely as needed.
- [x] Prevent accidental writes outside configured base directories.

## 10. CLI Shell

- [x] Implement the `storemeta` entry point.
- [x] Implement global option parsing.
- [x] Implement shared command context creation.
- [x] Implement shared summary and error rendering.
- [x] Implement `--verbose`.
- [x] Implement non-zero exit behavior for failures.

## 11. `storemeta init`

- [x] Implement starter config generation for `storemeta.yml`.
- [x] Generate example metadata directories.
- [x] Generate example screenshot directories.
- [x] Avoid overwriting existing files by default.
- [x] Use fake values only in generated examples.

## 12. `storemeta validate`

- [x] Validate root config structure.
- [x] Validate selected app and platform targets.
- [x] Validate credential presence.
- [x] Validate metadata files and schema.
- [x] Validate metadata length constraints for Google Play.
- [x] Validate screenshot folder structure.
- [x] Validate supported screenshot file extensions.
- [x] Validate numeric screenshot ordering.
- [x] Print a clear validation summary.

## 13. Google Platform Client

- [x] Implement service account authentication.
- [x] Implement a shared Google Play API client wrapper.
- [x] Implement edit session creation.
- [x] Implement edit session commit.
- [x] Implement safe edit session lifecycle handling for failures.

## 14. Google Metadata Pull

- [x] Implement listing fetch for one locale.
- [x] Implement listing fetch for all target locales.
- [x] Normalize remote listing data into the local metadata schema.
- [x] Write one file per locale.
- [x] Support `--locale`.
- [x] Support `--platform google`.

## 15. Google Metadata Push

- [x] Load and validate local Google metadata files.
- [x] Map local metadata into Google API payloads.
- [x] Upload listing text through an edit session.
- [x] Support `--dry-run`.
- [x] Print per-locale progress and final results.

## 16. Google Screenshots Pull

- [x] Implement image listing for configured locales and image types.
- [x] Download remote screenshots into the canonical local directory layout.
- [x] Write deterministic filenames such as `1.png`, `2.png`, `3.png`.
- [x] Support configured screenshot groups where relevant.
- [x] Handle empty sets cleanly.

## 17. Google Screenshots Push

- [x] Load and validate local screenshot sets.
- [x] Map local screenshots to target locales and image types.
- [x] Implement optional clearing of existing screenshots before upload.
- [x] Upload screenshots through the Google edit session.
- [x] Support `--dry-run`.
- [x] Print per-locale and per-image-type progress.

## 18. Apple Platform Client

- [x] Implement JWT generation from Apple credentials.
- [x] Implement a shared App Store Connect API client.
- [x] Implement paginated GET helpers where needed.
- [x] Implement safe POST and PATCH wrappers.
- [x] Ensure auth and API errors are rendered clearly without leaking secrets.

## 19. Apple Metadata Pull

- [x] Fetch app info localizations.
- [x] Fetch app store version localizations.
- [x] Join the two localization models into one local metadata document per locale.
- [x] Normalize fields into the local Apple metadata schema.
- [x] Write one file per locale.
- [x] Support `--locale`.

## 20. Apple Metadata Push

- [x] Load and validate local Apple metadata files.
- [x] Resolve the target app info resource.
- [x] Resolve the target editable app store version resource.
- [x] Update existing app info localizations.
- [x] Create missing app info localizations when allowed.
- [x] Update existing app store version localizations.
- [x] Create missing app store version localizations when allowed.
- [x] Support `--dry-run`.
- [x] Print per-locale progress and final results.

## 21. Apple Screenshots Pull

- [x] Fetch localization resources for the target version.
- [x] Fetch screenshot sets per localization.
- [x] Fetch screenshots within each set.
- [x] Download screenshot binaries into the canonical local directory layout.
- [x] Preserve deterministic ordering.
- [x] Support locale filtering.

## 22. Apple Screenshots Push

- [x] Load and validate local screenshot sets.
- [x] Resolve or create required localizations.
- [x] Resolve or create screenshot sets by display type.
- [x] Delete existing screenshots when replacement behavior is selected.
- [x] Reserve upload slots.
- [x] Upload binaries to Apple-provided URLs.
- [x] Commit uploads with checksums.
- [x] Support `--dry-run`.
- [x] Print per-locale and per-display-type progress.

## 23. Shared Error Handling And UX

- [x] Define consistent error messages for config, auth, validation, API, and filesystem failures.
- [x] Standardize command headers and summaries.
- [x] Ensure partial failures return non-zero exit codes.
- [x] Make destructive behavior explicit in command output.

## 24. Fixtures And Sample Project

- [x] Add a fake example `storemeta.yml`.
- [x] Add fake sample metadata files for Apple and Google.
- [x] Add fake sample screenshot directories.
- [x] Ensure all examples are safe to publish.

## 25. Automated Tests

- [x] Add unit tests for config loading and validation.
- [x] Add unit tests for metadata parsing and serialization.
- [x] Add unit tests for locale normalization and grouping.
- [x] Add unit tests for screenshot ordering and path resolution.
- [x] Add unit tests for Apple metadata mapping.
- [x] Add unit tests for Google metadata mapping.
- [x] Add tests for dry-run behavior.
- [x] Add command-level smoke tests.
- [x] Add mocked API tests for Apple flows.
- [x] Add mocked API tests for Google flows.

## 26. Documentation Completion

- [x] Update `README.md` with install and usage examples once the CLI exists.
- [x] Add command examples for each implemented command.
- [x] Add config examples that match the real implementation.
- [ ] Add troubleshooting guidance for Apple and Google auth setup.
- [ ] Add contributor setup instructions.

## 27. npm Packaging

- [ ] Confirm the published package metadata is correct.
- [ ] Confirm only intended files are included in the npm package.
- [ ] Verify `npm pack` contents locally.
- [ ] Verify the generated CLI works from the packed tarball.
- [ ] Set initial version for the first release.

## 28. Pre-Release Verification

- [ ] Run `storemeta init` in a clean temp directory.
- [ ] Run `storemeta validate` against the generated sample project.
- [ ] Verify Apple metadata pull with a real test app.
- [ ] Verify Apple metadata push with `--dry-run`.
- [ ] Verify Google metadata pull with a real test app.
- [ ] Verify Google metadata push with `--dry-run`.
- [ ] Verify Apple screenshot pull and push behavior.
- [ ] Verify Google screenshot pull and push behavior.
- [ ] Confirm no secrets appear in logs, examples, package contents, or docs.

## 29. First Public Release

- [ ] Commit the implementation.
- [ ] Push to GitHub.
- [ ] Publish the initial npm package.
- [ ] Tag the release.
- [ ] Confirm the public repository contains no ignored or secret material.
