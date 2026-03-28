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

Pull metadata from one platform:

```bash
storemeta metadata pull --platform apple
storemeta metadata pull --platform google --locale en-US
```

Push local metadata or screenshots:

```bash
storemeta metadata push --platform google --dry-run
storemeta screenshots push --platform apple --replace
```

## Implemented Commands

- `storemeta init`
- `storemeta validate`
- `storemeta metadata pull`
- `storemeta metadata push`
- `storemeta screenshots push`

## Example Project

A safe, fake sample project lives under [`examples/`](examples).

## Documentation

The full project and config documentation is here:

- [PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md)

Security notes:

- [SECURITY.md](SECURITY.md)
