# storemeta

`storemeta` is a TypeScript CLI for pulling, validating, and pushing App Store Connect and Google Play metadata and screenshots.

## Install

```bash
npm install -g storemeta
```

Requirements:
- Node.js 20+

## Quick Start

Create a starter project:

```bash
storemeta init
```

Validate local config, metadata, and screenshot layout:

```bash
storemeta validate
```

Create missing locale metadata files and screenshot folders from config:

```bash
storemeta scaffold
```

Pull metadata from one platform:

```bash
storemeta metadata pull --platform apple
storemeta metadata pull --platform google --locale en-US
```

Pull screenshots from one platform:

```bash
storemeta screenshots pull --platform apple
storemeta screenshots pull --platform google --locale en-US
```

Push local metadata or screenshots:

```bash
storemeta metadata push --platform google --dry-run
storemeta screenshots push --platform apple --replace
```

## Implemented Commands

- `storemeta init`
- `storemeta validate`
- `storemeta auth check`
- `storemeta config doctor`
- `storemeta locales list`
- `storemeta scaffold`
- `storemeta metadata pull`
- `storemeta metadata push`
- `storemeta metadata diff`
- `storemeta screenshots pull`
- `storemeta screenshots push`
- `storemeta screenshots diff`

## Example Project

A safe, fake sample project lives under [`examples/`](examples).

## Documentation

The current user and config documentation is here:

- [DOCUMENTATION.md](docs/DOCUMENTATION.md)

The original implementation plan is kept here:

- [PROJECT_PLAN.md](docs/PROJECT_PLAN.md)

Release verification notes:

- [RELEASE_VERIFICATION.md](docs/RELEASE_VERIFICATION.md)

Credential setup:

- [AUTH_SETUP.md](docs/AUTH_SETUP.md)

Security notes:

- [SECURITY.md](SECURITY.md)
