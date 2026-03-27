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
- [ ] Add an HTTP client strategy.
- [ ] Add a schema validation library for config and metadata validation.
- [ ] Add test tooling.
- [ ] Add linting and formatting tooling if desired.

## 3. Source Structure

- [ ] Create `src/cli/`.
- [ ] Create `src/config/`.
- [ ] Create `src/formats/`.
- [ ] Create `src/locales/`.
- [ ] Create `src/writers/`.
- [ ] Create `src/validation/`.
- [ ] Create `src/auth/apple/`.
- [ ] Create `src/auth/google/`.
- [ ] Create `src/platforms/apple/metadata/`.
- [ ] Create `src/platforms/apple/screenshots/`.
- [ ] Create `src/platforms/google/metadata/`.
- [ ] Create `src/platforms/google/screenshots/`.

## 4. Core Domain Types

- [ ] Define shared config types.
- [ ] Define shared metadata document types.
- [ ] Define Apple metadata mapping types.
- [ ] Define Google metadata mapping types.
- [ ] Define screenshot descriptor types.
- [ ] Define locale mapping and grouping types.
- [ ] Define command result and summary types.
- [ ] Define reusable error types.

## 5. Config System

- [ ] Implement loading for `storemeta.yml`.
- [ ] Support `--config <path>`.
- [ ] Implement schema validation for the root config.
- [ ] Support single-app usage cleanly.
- [ ] Support multi-app config structure even if only one app is used initially.
- [ ] Implement app selection logic via `project.defaultApp` and `--app`.
- [ ] Validate required platform identifiers.
- [ ] Validate configured credential env var names.
- [ ] Validate base directory paths.

## 6. Credential Loading

- [ ] Implement Apple credential loading from environment variables.
- [ ] Implement Google credential loading from environment variables.
- [ ] Validate missing credential cases with clear errors.
- [ ] Ensure secrets never appear in logs.
- [ ] Add helpers for resolved credential state without exposing secret values.

## 7. Metadata File Parsing

- [ ] Implement YAML parsing for `.yml`.
- [ ] Implement YAML parsing for `.yaml`.
- [ ] Implement YAML parsing for `.md` file contents.
- [ ] Add deterministic serialization for pulled metadata files.
- [ ] Preserve stable key ordering in written files.
- [ ] Add platform-aware schema validation for Apple metadata documents.
- [ ] Add platform-aware schema validation for Google metadata documents.

## 8. Locale System

- [ ] Implement locale normalization utilities.
- [ ] Implement explicit per-platform locale mapping support.
- [ ] Implement screenshot grouping support from config.
- [ ] Validate that locale groups resolve deterministically.
- [ ] Add tests for locale edge cases such as `zh-Hans`, `zh-Hant`, `he-IL`, and grouped English locales.

## 9. Deterministic File Writers

- [ ] Implement metadata file writing helpers.
- [ ] Implement screenshot path resolution helpers.
- [ ] Implement deterministic screenshot filename ordering.
- [ ] Ensure directories are created safely as needed.
- [ ] Prevent accidental writes outside configured base directories.

## 10. CLI Shell

- [ ] Implement the `storemeta` entry point.
- [ ] Implement global option parsing.
- [ ] Implement shared command context creation.
- [ ] Implement shared summary and error rendering.
- [ ] Implement `--verbose`.
- [ ] Implement non-zero exit behavior for failures.

## 11. `storemeta init`

- [ ] Implement starter config generation for `storemeta.yml`.
- [ ] Generate example metadata directories.
- [ ] Generate example screenshot directories.
- [ ] Avoid overwriting existing files by default.
- [ ] Use fake values only in generated examples.

## 12. `storemeta validate`

- [ ] Validate root config structure.
- [ ] Validate selected app and platform targets.
- [ ] Validate credential presence.
- [ ] Validate metadata files and schema.
- [ ] Validate metadata length constraints for Google Play.
- [ ] Validate screenshot folder structure.
- [ ] Validate supported screenshot file extensions.
- [ ] Validate numeric screenshot ordering.
- [ ] Print a clear validation summary.

## 13. Google Platform Client

- [ ] Implement service account authentication.
- [ ] Implement a shared Google Play API client wrapper.
- [ ] Implement edit session creation.
- [ ] Implement edit session commit.
- [ ] Implement safe edit session lifecycle handling for failures.

## 14. Google Metadata Pull

- [ ] Implement listing fetch for one locale.
- [ ] Implement listing fetch for all target locales.
- [ ] Normalize remote listing data into the local metadata schema.
- [ ] Write one file per locale.
- [ ] Support `--locale`.
- [ ] Support `--platform google`.

## 15. Google Metadata Push

- [ ] Load and validate local Google metadata files.
- [ ] Map local metadata into Google API payloads.
- [ ] Upload listing text through an edit session.
- [ ] Support `--dry-run`.
- [ ] Print per-locale progress and final results.

## 16. Google Screenshots Pull

- [ ] Implement image listing for configured locales and image types.
- [ ] Download remote screenshots into the canonical local directory layout.
- [ ] Write deterministic filenames such as `1.png`, `2.png`, `3.png`.
- [ ] Support configured screenshot groups where relevant.
- [ ] Handle empty sets cleanly.

## 17. Google Screenshots Push

- [ ] Load and validate local screenshot sets.
- [ ] Map local screenshots to target locales and image types.
- [ ] Implement optional clearing of existing screenshots before upload.
- [ ] Upload screenshots through the Google edit session.
- [ ] Support `--dry-run`.
- [ ] Print per-locale and per-image-type progress.

## 18. Apple Platform Client

- [ ] Implement JWT generation from Apple credentials.
- [ ] Implement a shared App Store Connect API client.
- [ ] Implement paginated GET helpers where needed.
- [ ] Implement safe POST and PATCH wrappers.
- [ ] Ensure auth and API errors are rendered clearly without leaking secrets.

## 19. Apple Metadata Pull

- [ ] Fetch app info localizations.
- [ ] Fetch app store version localizations.
- [ ] Join the two localization models into one local metadata document per locale.
- [ ] Normalize fields into the local Apple metadata schema.
- [ ] Write one file per locale.
- [ ] Support `--locale`.

## 20. Apple Metadata Push

- [ ] Load and validate local Apple metadata files.
- [ ] Resolve the target app info resource.
- [ ] Resolve the target editable app store version resource.
- [ ] Update existing app info localizations.
- [ ] Create missing app info localizations when allowed.
- [ ] Update existing app store version localizations.
- [ ] Create missing app store version localizations when allowed.
- [ ] Support `--dry-run`.
- [ ] Print per-locale progress and final results.

## 21. Apple Screenshots Pull

- [ ] Fetch localization resources for the target version.
- [ ] Fetch screenshot sets per localization.
- [ ] Fetch screenshots within each set.
- [ ] Download screenshot binaries into the canonical local directory layout.
- [ ] Preserve deterministic ordering.
- [ ] Support locale filtering.

## 22. Apple Screenshots Push

- [ ] Load and validate local screenshot sets.
- [ ] Resolve or create required localizations.
- [ ] Resolve or create screenshot sets by display type.
- [ ] Delete existing screenshots when replacement behavior is selected.
- [ ] Reserve upload slots.
- [ ] Upload binaries to Apple-provided URLs.
- [ ] Commit uploads with checksums.
- [ ] Support `--dry-run`.
- [ ] Print per-locale and per-display-type progress.

## 23. Shared Error Handling And UX

- [ ] Define consistent error messages for config, auth, validation, API, and filesystem failures.
- [ ] Standardize command headers and summaries.
- [ ] Ensure partial failures return non-zero exit codes.
- [ ] Make destructive behavior explicit in command output.

## 24. Fixtures And Sample Project

- [ ] Add a fake example `storemeta.yml`.
- [ ] Add fake sample metadata files for Apple and Google.
- [ ] Add fake sample screenshot directories.
- [ ] Ensure all examples are safe to publish.

## 25. Automated Tests

- [ ] Add unit tests for config loading and validation.
- [ ] Add unit tests for metadata parsing and serialization.
- [ ] Add unit tests for locale normalization and grouping.
- [ ] Add unit tests for screenshot ordering and path resolution.
- [ ] Add unit tests for Apple metadata mapping.
- [ ] Add unit tests for Google metadata mapping.
- [ ] Add tests for dry-run behavior.
- [ ] Add command-level smoke tests.
- [ ] Add mocked API tests for Apple flows.
- [ ] Add mocked API tests for Google flows.

## 26. Documentation Completion

- [ ] Update `README.md` with install and usage examples once the CLI exists.
- [ ] Add command examples for each implemented command.
- [ ] Add config examples that match the real implementation.
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
