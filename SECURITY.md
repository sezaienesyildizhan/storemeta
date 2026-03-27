# Security Policy

## Current Risk

Any development credentials that have ever been stored locally in this project must be treated as exposed until rotated.

## Required Actions Before Publishing

1. rotate the exposed App Store Connect key material
2. remove or replace all secret-bearing files and code
3. ensure no secrets remain in git history before creating a public repository
4. move all runtime credentials to environment variables or ignored local files

## Secret Handling Rules For This Project

- never commit private keys
- never commit service account JSON files
- never commit `.env` files containing real secrets
- use fake values in examples and tests
- prefer environment variables over inline configuration

## Reporting

Until the repository is public, security handling is local to the project owner.
