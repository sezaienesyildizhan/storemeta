# storemeta Documentation

`storemeta` is a Node.js CLI for managing App Store Connect and Google Play metadata and screenshots from a local project layout.

## Requirements

- Node.js 20 or newer
- npm
- App Store Connect API credentials for Apple operations
- Google Play service account credentials for Google operations

## Commands

```text
storemeta init
storemeta validate
storemeta auth check
storemeta config doctor
storemeta locales list
storemeta scaffold
storemeta metadata pull
storemeta metadata push
storemeta metadata diff
storemeta screenshots pull
storemeta screenshots push
storemeta screenshots diff
```

Global options:

- `--config <path>`: root config path, defaults to `storemeta.yml`
- `--app <id>`: configured app id, defaults to `project.defaultApp`
- `--platform <apple|google|all>`: platform filter
- `--locale <code>`: locale filter
- `--dry-run`: preview push operations without remote writes
- `--replace`: delete existing remote screenshots before screenshot upload
- `--verbose`: include error causes when available

## Quick Start

Create a starter project:

```bash
storemeta init
```

Validate local config, credentials, metadata files, and screenshot layout:

```bash
storemeta validate
```

Check auth and inspect config:

```bash
storemeta auth check
storemeta config doctor
storemeta locales list
```

Create missing local files and folders from config:

```bash
storemeta scaffold
```

`scaffold` creates minimal metadata files and screenshot directories for configured locales. It does not overwrite existing metadata files.

Pull metadata:

```bash
storemeta metadata pull --platform apple
storemeta metadata pull --platform google --locale en-US
```

Pull screenshots:

```bash
storemeta screenshots pull --platform apple
storemeta screenshots pull --platform google --locale en-US
```

Push metadata or screenshots:

```bash
storemeta metadata push --platform google --dry-run
storemeta screenshots push --platform apple --replace
```

## Config

Default config file:

```text
storemeta.yml
```

Example:

```yaml
version: 1
project:
  name: Storemeta Example
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
        default:
          - en-US
          - tr
    google:
      packageName: com.example.storemeta
      credentials:
        serviceAccountPathEnv: STORE_GOOGLE_SERVICE_ACCOUNT_PATH
      locales:
        default:
          - en-US
          - tr
      screenshots:
        groups:
          english:
            locales:
              - en-US
              - en-GB
```

The schema is strict. Unknown config keys fail validation.

`metadata.baseDir` and `screenshots.baseDir` must be relative paths. Runtime credentials are read from the environment variables named in the config.

## Credentials

Detailed setup instructions are in [`AUTH_SETUP.md`](AUTH_SETUP.md).

Apple environment variables:

```bash
export STORE_APPLE_ISSUER_ID=...
export STORE_APPLE_KEY_ID=...
export STORE_APPLE_PRIVATE_KEY_PATH=/absolute/path/to/AuthKey_XXXXXXXXXX.p8
```

Google environment variable:

```bash
export STORE_GOOGLE_SERVICE_ACCOUNT_PATH=/absolute/path/to/service-account.json
```

Do not commit private keys, service account JSON files, or real `.env` files.

## Metadata Layout

Current releases support YAML metadata. Markdown is the planned default metadata authoring format for the next metadata-format update. YAML will remain available as an alternative structured format.

The planned default Markdown layout is:

```text
metadata/
  apple/
    en-US.md
    tr.md
  google/
    en-US.md
    tr.md
```

The YAML alternative layout is:

```text
metadata/
  apple/
    en-US.yml
    tr.yml
  google/
    en-US.yml
    tr.yml
```

The planned Markdown config is:

```yaml
metadata:
  baseDir: metadata
  format: markdown
```

The current YAML config is:

```yaml
metadata:
  baseDir: metadata
  format: yaml
```

Mixed mode is not supported in the planned Markdown format. A configured app should use either Markdown metadata files or YAML metadata files.

Planned Markdown format specification:

- [MARKDOWN_METADATA.md](MARKDOWN_METADATA.md)

Markdown Apple metadata example:

```md
---
locale: en-US
---

# App Store Listing

## App Name

Example App

## Subtitle

Short subtitle

## Promotional Text

Optional promo text.

## Description

Long description text.

## Keywords

one,two,three

## What's New

What changed in this version.

## Support URL

https://example.com/support

## Marketing URL

https://example.com

## Privacy Policy URL

https://example.com/privacy
```

Markdown Google metadata example:

```md
---
locale: en-US
---

# Google Play Listing

## Title

Example App

## Short Description

Short description

## Full Description

Long description text.

## Video

https://example.com/video
```

YAML Apple metadata example:

```yaml
locale: en-US
app_name: Example App
subtitle: Short subtitle
keywords: one,two,three
promotional_text: Optional promo text
description: Long description text.
whats_new: What changed in this version.
support_url: https://example.com/support
marketing_url: https://example.com
privacy_policy_url: https://example.com/privacy
```

YAML Google metadata example:

```yaml
locale: en-US
title: Example App
short_description: Short description
full_description: Long description text.
video: https://example.com/video
```

Google metadata length checks:

- `title`: 30 characters or fewer
- `short_description`: 80 characters or fewer
- `full_description`: 4000 characters or fewer

## Screenshot Layout

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

Supported local screenshot extensions:

- `.png`
- `.jpg`
- `.jpeg`

Screenshot filenames must be contiguous numeric positions such as `1.png`, `2.png`, and `3.png`.

Google screenshot image type directories:

- `phoneScreenshots`
- `sevenInchScreenshots`
- `tenInchScreenshots`
- `tvScreenshots`
- `wearScreenshots`

Apple screenshot display type directories should use App Store Connect display type values such as `APP_IPHONE_65`.

## Validation Behavior

`storemeta validate` checks:

- root config schema
- selected app and platform support
- credential environment variable presence
- credential environment variable name validity
- platform identifiers
- relative base directory paths
- metadata file schemas
- Google metadata length limits
- screenshot folder structure
- supported screenshot extensions
- numeric screenshot ordering

Push commands also validate the files they load before writing to the remote store. For the full local project validation pass, run `storemeta validate` explicitly before push commands.

## Pull Behavior

Metadata pull writes one local file per platform and locale.

Screenshot pull writes downloaded screenshots into the canonical local screenshot layout. Google screenshot pull uses configured default locales unless `--locale` is supplied. Apple screenshot pull discovers version localizations from App Store Connect and can be filtered with `--locale`.

## Push Behavior

Metadata push uploads local metadata documents to the selected platform.

Screenshot push uploads local screenshot sets to the selected platform. Use `--replace` to delete existing remote screenshots in target sets before uploading local files.

Use `--dry-run` for metadata and screenshot push previews.

## Development Verification

```bash
npm run check
npm run test
npm run build
```

The example project in [`examples/`](../examples) is fake and safe to publish. Its screenshot files are placeholders for layout demonstration only.
