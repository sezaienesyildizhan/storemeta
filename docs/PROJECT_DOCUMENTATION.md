# storemeta Project Documentation

`storemeta` is a TypeScript CLI for pulling, validating, and pushing App Store Connect and Google Play metadata and screenshots.

This document is the single merged project specification for v1. It replaces the need to read multiple planning files separately.

## 1. Project Status

Current stage:
- documentation-first planning

Locked decisions:
- language: TypeScript
- initial distribution: npm only
- npm package name: `storemeta`
- primary CLI binary name: `storemeta`
- default config file name: `storemeta.yml`
- scope: metadata + screenshots
- sync direction: both pull and push
- command style: noun-first
- config: one root YAML file
- metadata file support: `.yml`, `.yaml`, and `.md` files whose contents are YAML
- validation: strict by default
- license: MIT

Still flexible:
- exact app targeting behavior during implementation, though the config is designed to support both single-app and multi-app usage

Naming note:
- `sm` is intentionally not the primary command because it is too short and more likely to collide with other tools

## 2. Why This Project Exists

Managing App Store Connect and Google Play metadata is repetitive, error-prone, and difficult to standardize across apps and locales.

What is needed is a dedicated CLI that provides:
- a stable command surface
- a documented config format
- deterministic pull and push behavior
- strong validation before writes
- a clean npm distribution story

The goal of `storemeta` is to provide that reusable open source workflow.

## 3. Goals

V1 goals:
- pull App Store and Google Play metadata into local files
- push local metadata to App Store and Google Play
- pull store screenshots into a local directory layout
- push local screenshots from a local directory layout
- validate content before upload
- support explicit locale mapping and screenshot grouping
- keep secrets out of the repository

V1 non-goals:
- Homebrew distribution
- in-place image editing or screenshot generation
- translation workflows
- release submission automation outside metadata and screenshot management

## 4. Platform And Product Requirements

The CLI must cover both App Store Connect and Google Play with one consistent user experience.

### Platform Requirements

Google Play requirements:
- authenticate with a service account
- perform write operations through an edit session
- commit the edit after successful changes
- support listing metadata and screenshots

App Store Connect requirements:
- authenticate with JWT-based API credentials
- handle the split between app info localization fields and version localization fields
- support screenshot set creation and upload completion flows
- support listing metadata and screenshots

### Product Requirements

The product must provide:
- shared config instead of inline constants
- shared auth loading instead of command-local credential logic
- shared locale normalization and grouping
- deterministic filesystem layout
- YAML parsing for metadata files
- reusable platform adapters
- strict validation before write operations

### Required Implementation Patterns

These behaviors are part of the intended design:
- Google write operations should share one edit-session helper
- Apple metadata mapping should explicitly model separate localization resource types
- Apple screenshot uploads should use a reserve-upload-commit pipeline
- screenshot files should be processed in deterministic numeric order
- locale grouping should be config-driven
- dry-run mode should exist for destructive operations
- commands should print per-locale progress and final summaries

### Behaviors To Avoid

The product must avoid:
- embedded secrets
- hardcoded credential paths
- regex parsing for structured metadata content
- duplicated locale logic across commands
- typo-dependent folder conventions
- hardcoded screenshot type assumptions with no override path
- mixing config parsing, API transport, validation, and output formatting in one module

### Product Gaps To Close During Implementation

These capabilities must exist before the first release:
- metadata pull for both platforms
- screenshot pull for both platforms
- unified config loading and schema validation
- reusable auth clients for Apple and Google
- deterministic local file writers
- cross-platform validation
- automated tests
- npm packaging

## 5. Architecture Direction

The CLI should be implemented as a TypeScript Node.js project.

Recommended internal modules:
- `cli`
- `config`
- `formats/yaml`
- `locales`
- `writers`
- `validation/metadata`
- `validation/screenshots`
- `auth/apple`
- `auth/google`
- `platforms/apple/metadata`
- `platforms/apple/screenshots`
- `platforms/google/metadata`
- `platforms/google/screenshots`

Initial tooling choices:
- CLI parser: `commander`
- HTTP client: native `fetch` from Node.js 20+
- Test runner: `vitest`
- Linting and formatting: deferred until core implementation exists

High-level design:
- one unified CLI surface
- one root config file
- two platform adapters: Apple and Google
- local normalized file layout
- strict validation before any write operation

Implementation guidance:
- Google commands should share one edit-session helper
- Apple metadata should share one mapper that understands both localization resource types
- Apple screenshots should share one upload pipeline abstraction
- all pull commands should write through one deterministic file writer layer
- all locale mapping should flow through one normalization module

## 6. CLI Specification

The CLI follows a noun-first structure.

### Command Tree

```text
storemeta init
storemeta validate
storemeta metadata pull
storemeta metadata push
storemeta screenshots pull
storemeta screenshots push
```

### Global Options

Available to all commands unless a command narrows them:
- `--config <path>`
- `--app <id>`
- `--platform <apple|google|all>`
- `--locale <code>`
- `--dry-run`
- `--verbose`

### `storemeta init`

Purpose:
- create a starter `storemeta.yml`
- create example metadata and screenshots directories

Behavior:
- do not overwrite existing files unless a future `--force` is added

Examples:

```bash
storemeta init
storemeta --config ./apps/demo/storemeta.yml init
```

### `storemeta validate`

Purpose:
- validate local config, metadata files, screenshot layout, and platform-specific limits

Validation scope:
- config schema validity
- required credentials presence
- locale mapping consistency
- file existence
- metadata length rules
- screenshot folder and file naming rules

Exit behavior:
- exit `0` on success
- exit non-zero when blocking issues exist

Examples:

```bash
storemeta validate
storemeta validate --platform apple
storemeta validate --app example-app --platform all
```

### `storemeta metadata pull`

Purpose:
- fetch metadata from stores into the local file layout

Behavior:
- fetch all target locales or requested locale subsets
- normalize platform data into local schema
- write one file per locale per platform
- preserve deterministic key ordering

New implementation required:
- Google Play metadata pull can reuse the existing fetch concept, but must be rewritten into the shared CLI architecture
- App Store metadata pull must be implemented as a first-class command rather than inferred from upload helpers

Examples:

```bash
storemeta metadata pull --platform apple
storemeta metadata pull --platform google --locale en-US
```

### `storemeta metadata push`

Purpose:
- push local metadata files to stores

Behavior:
- validate before upload
- respect `--dry-run`
- update existing localizations when present
- create missing localizations when the platform allows it
- print per-locale results

Examples:

```bash
storemeta metadata push --platform google --dry-run
storemeta metadata push --platform apple --locale tr
```

### `storemeta screenshots pull`

Purpose:
- fetch screenshots from stores into the local screenshot layout

Behavior:
- fetch by locale and display type where supported
- write deterministic file names such as `1.png`, `2.png`, `3.png`

New implementation required:
- this must be implemented as a first-class flow for both platforms

### `storemeta screenshots push`

Purpose:
- push local screenshots to stores

Behavior:
- validate before upload
- respect `--dry-run`
- replace existing screenshots in target sets unless a later flag adds merge behavior
- print per-locale summaries

Examples:

```bash
storemeta screenshots push --platform apple --dry-run
storemeta screenshots push --platform apple --replace
storemeta screenshots push --platform google --locale en-US
```

### Output Rules

Default output should be human-readable:
- command header
- selected app and platform
- validation summary
- per-locale progress
- final totals

Possible later extension:
- `--json` output for CI

### Failure Rules

- invalid config: fail before network work
- missing credentials: fail before network work
- validation failure on push: fail before writes
- partial failures: return non-zero and print a clear summary

### Reserved Future Commands

Not in v1, but the tree should allow for:
- `storemeta auth check`
- `storemeta locales list`
- `storemeta config doctor`
- `storemeta metadata diff`
- `storemeta screenshots diff`

## 7. Config Specification

### Root Config File

Default file name:

```text
storemeta.yml
```

Override:

```bash
storemeta --config ./path/to/storemeta.yml validate
```

### Root Config Format

The root config file is YAML.

Metadata content files may use:
- `.yml`
- `.yaml`
- `.md`

For `.md` files in v1, the file contents are parsed as YAML. Mixed markdown prose is out of scope for v1.

### Implemented Root Shape

```yaml
version: 1

project:
  name: example-project
  defaultApp: example-app

apps:
  example-app:
    metadata:
      baseDir: metadata
      format: yaml
    screenshots:
      baseDir: screenshots

    apple:
      appId: "0000000000"
      credentials:
        issuerIdEnv: STORE_APPLE_ISSUER_ID
        keyIdEnv: STORE_APPLE_KEY_ID
        privateKeyPathEnv: STORE_APPLE_PRIVATE_KEY_PATH
      locales:
        default: [en-US]
        map:
          zh-CN: zh-Hans
          zh-TW: zh-Hant

    google:
      packageName: com.example.app
      credentials:
        serviceAccountPathEnv: STORE_GOOGLE_SERVICE_ACCOUNT_PATH
      locales:
        default: [en-US]
        map:
          en_US: en-US
          iw-IL: he-IL
      screenshots:
        groups:
          english:
            locales: [en-US, en-GB, en-AU, en-CA]
          spanish:
            locales: [es-ES, es-419, es-US]
```

### App Model

The config intentionally supports both single-app and multi-app usage.

Single-app usage:
- define one entry under `apps`
- set `project.defaultApp`
- omit `--app` in normal usage

Multi-app usage:
- define multiple app entries
- use `--app <id>` when needed

This avoids blocking the implementation on a final app model decision.

### Metadata File Layout

Recommended:

```text
metadata/
  apple/
    en-US.yml
    tr.yml
  google/
    en-US.yml
    tr-TR.yml
```

Allowed alternative:

```text
metadata/
  apple/
    en-US.md
  google/
    en-US.md
```

### Metadata Schema

#### Apple

```yaml
locale: en-US
app_name: Example App
subtitle: Short subtitle
keywords: one,two,three
promotional_text: Optional promo text
description: |
  Long description text.
whats_new: |
  What changed in this version.
support_url: https://example.com/support
marketing_url: https://example.com
privacy_policy_url: https://example.com/privacy
```

#### Google

```yaml
locale: en-US
title: Example App
short_description: Short description
full_description: |
  Long description text.
video: https://example.com/video
```

### Screenshot Layout

Recommended:

```text
screenshots/
  apple/
    en-US/
      APP_IPHONE_65/
        1.png
        2.png
  google/
    en-US/
      phoneScreenshots/
        1.png
        2.png
```

Canonical stored values should match platform display types and image types.

The product should normalize pulled assets into locale-specific folders while still allowing config-driven grouping for push behavior.

### Credentials

Secrets must never be committed.

Recommended environment variables:

Apple:
- `STORE_APPLE_ISSUER_ID`
- `STORE_APPLE_KEY_ID`
- `STORE_APPLE_PRIVATE_KEY_PATH`

Possible later support:
- `STORE_APPLE_PRIVATE_KEY`

Google:
- `STORE_GOOGLE_SERVICE_ACCOUNT_PATH`

Possible later support:
- `STORE_GOOGLE_SERVICE_ACCOUNT_JSON`

### Validation Rules

The config validator should enforce:
- `version` exists and is supported
- `project.defaultApp` points to a real app key
- each selected platform has required identifiers
- each selected platform has credentials configured
- base directories are relative and valid
- locale overrides are explicit and deterministic

### Backward Compatibility

The config version must be explicit. Breaking changes should bump `version`.

## 8. Validation Requirements

Validation is a first-class feature, not an afterthought.

The validator should check:
- config schema
- credentials presence
- metadata required fields
- metadata length rules
- locale mapping consistency
- screenshot path structure
- screenshot file ordering and supported extensions

Examples of platform-specific validation:

Google Play metadata:
- title length
- short description length
- full description length

Apple metadata:
- presence and validity of locale-specific fields
- future support for field length validation where practical

Screenshot validation:
- required directories exist
- files are ordered deterministically
- extensions are supported
- display type and image type folder names are valid

Additional validation rules for v1:
- destructive screenshot replacement must require a fully valid source set
- locale groups must resolve deterministically to target locales
- excluded screenshot files, if configured, should be applied predictably before upload planning
- Apple upload plans should validate the existence of required screenshot set display types before write operations where possible

## 9. Release Plan

### Initial Distribution

Initial release target:
- npm only

Deferred:
- Homebrew

### Planned Package Shape

- package name: `storemeta`
- executable name: `storemeta`
- compiled output in `dist/`
- npm package exports the CLI through the `bin` field

### Open Source Defaults

- public GitHub repository
- MIT license
- semantic versioning
- `0.x` while config and commands are still changing
- `1.0.0` only after config and command stability

### Minimum Release Checklist

Before the first public release:

1. rotate and remove any preexisting development credentials before publishing
2. remove secret-bearing files and code
3. ensure no secrets remain in git history before publishing
4. add `.gitignore`
5. add `package.json`
6. add TypeScript config and build scripts
7. implement the documented CLI surface
8. add smoke-level automated tests
9. add example config and fake example metadata files
10. verify npm install and CLI execution
11. verify the CLI against one real Apple app and one real Google Play app using rotated credentials only

### Suggested Repository Files

Minimum:
- `README.md`
- `docs/PROJECT_DOCUMENTATION.md`
- `LICENSE`
- `SECURITY.md`
- `package.json`
- `tsconfig.json`
- `src/`

Likely next:
- `.gitignore`
- package `files` allowlist
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- GitHub Actions workflows

## 10. Security

Any development credentials that have ever been stored locally in this project must be treated as exposed until rotated.

Required actions before publishing:
- rotate the exposed App Store Connect keys
- remove or replace all secret-bearing code
- ensure secrets are not present in git history
- move all runtime credentials to environment variables or ignored local files

Secret handling rules for this project:
- never commit private keys
- never commit service account JSON files
- never commit real `.env` files
- use fake values in examples and tests
- prefer environment variables over inline config

## 11. Feasibility

This project is feasible now.

The required integrations are within scope:
- App Store Connect JWT auth
- App Store metadata reads and writes
- App Store screenshot upload flow
- Google Play edits flow
- Google Play metadata reads and writes
- Google Play screenshot upload flow

The remaining work is productization:
- TypeScript scaffold
- config loader
- shared validation
- unified CLI
- packaging for npm

More specifically, the largest net-new work is:
- pull flows for screenshots
- App Store metadata export into local schema
- shared clients and transport abstractions
- removal of single-app and single-directory assumptions

## 12. Recommended Next Steps

Implementation should begin in this order:

1. scaffold the TypeScript project
2. implement config loading and validation
3. implement Apple and Google metadata pull
4. implement Apple and Google metadata push
5. implement screenshot pull and push
6. add tests and sample fixtures
7. prepare npm packaging
