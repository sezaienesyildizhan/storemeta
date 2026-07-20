# storemeta

Store metadata and screenshots as code.

`storemeta` is a TypeScript CLI for pulling, validating, diffing, and pushing App Store Connect and Google Play metadata and screenshots from your local project.

Use it when you want app store copy, locales, and screenshots to live in Git instead of being manually edited through App Store Connect and Play Console every release.

## Why

- Keep Apple and Google store metadata in one reviewable repository.
- Pull the current live store state before making changes.
- Validate config, locale files, screenshot folders, and credentials locally.
- Preview metadata and screenshot changes with dry runs and diffs.
- Scaffold the expected folder structure for every configured locale.

## Install

```bash
npm install -g storemeta
```

Requirements:

- Node.js 20+

## Quick Start

Create a starter project with config, locale files, and screenshot folders:

```bash
storemeta init
```

Check your config and credentials:

```bash
storemeta validate
storemeta auth check
storemeta config doctor
```

Pull the current store state:

```bash
storemeta metadata pull --platform apple --locale en-US
storemeta screenshots pull --platform google --locale en-US
```

Edit files locally, then review what changed:

```bash
storemeta metadata diff --platform apple
storemeta screenshots diff --platform google
```

Push changes when ready:

```bash
storemeta metadata push --platform apple --dry-run
storemeta screenshots push --platform google --dry-run
```

Remove `--dry-run` only after the output looks right.

## Project Layout

`storemeta init` creates the starter structure. `storemeta scaffold` can be run later to create any missing locale metadata files or screenshot folders from your config.

```text
storemeta.config.yml
metadata/
  apple/
    en-US.yml
  google/
    en-US.yml
screenshots/
  apple/
    en-US/
  google/
    en-US/
```

## Credentials

`storemeta` uses official store APIs:

- App Store Connect API key: issuer ID, key ID, and `.p8` private key.
- Google Play Android Publisher API: service account JSON with access to the app.

Start here:

```bash
storemeta init
storemeta auth check
```

Full setup guide:

- [AUTH_SETUP.md](docs/AUTH_SETUP.md)

Keep real keys in ignored local files such as `.env.local`, `.env.release.local`, or `secrets/`. Do not commit store credentials.

## Common Commands

- `storemeta init` creates a starter project.
- `storemeta scaffold` creates missing locale metadata files and screenshot folders.
- `storemeta validate` validates config, metadata, and screenshot layout.
- `storemeta auth check` verifies Apple and Google credentials.
- `storemeta config doctor` explains config and project layout issues.
- `storemeta locales list` lists configured locales.
- `storemeta metadata pull` downloads store metadata.
- `storemeta metadata diff` compares local metadata against store metadata.
- `storemeta metadata push` uploads metadata.
- `storemeta screenshots pull` downloads screenshots.
- `storemeta screenshots diff` compares local screenshots against store screenshots.
- `storemeta screenshots push` uploads screenshots.

Run `storemeta --help` or any command with `--help` for options.

## Who It Is For

- Indie app developers shipping to both App Store and Google Play.
- Teams that want store listing changes reviewed in pull requests.
- Release managers who need repeatable metadata and screenshot updates.
- Developers who want a lighter store-metadata workflow than a full release automation stack.

## Status

`storemeta` is an early public release. It currently focuses on metadata and screenshot workflows for App Store Connect and Google Play. Use `--dry-run` before pushing and keep store credentials out of Git.

## Example Project

A safe, fake sample project lives under [`examples/`](examples). Proposed Markdown metadata examples are in [`examples/metadata-md`](examples/metadata-md).

## Documentation

The current user and config documentation is here:

- [DOCUMENTATION.md](docs/DOCUMENTATION.md)

Planned Markdown metadata format:

- [MARKDOWN_METADATA.md](docs/MARKDOWN_METADATA.md)

The original implementation plan is kept here:

- [PROJECT_PLAN.md](docs/PROJECT_PLAN.md)

Release verification notes:

- [RELEASE_VERIFICATION.md](docs/RELEASE_VERIFICATION.md)

Credential setup:

- [AUTH_SETUP.md](docs/AUTH_SETUP.md)

Security notes:

- [SECURITY.md](SECURITY.md)

## License

MIT
