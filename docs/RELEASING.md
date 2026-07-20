# Releasing storemeta

storemeta uses GitHub Actions, Release Please, and npm trusted publishing.

## Release flow

1. Pull requests and pushes to `main` run CI on Node.js 20 and 24.
2. Conventional commits on `main` update a Release Please pull request.
3. Merging the Release Please pull request updates `package.json`, `package-lock.json`, and `CHANGELOG.md`, then creates a `vX.Y.Z` tag and GitHub Release.
4. The release workflow checks, tests, builds, and packs that exact release commit.
5. npm publishes through OpenID Connect without a long-lived npm token.

Normal commits do not publish packages directly. This prevents duplicate npm versions and keeps release timing explicit.

## One-time npm setup

Configure trusted publishing for the existing `storemeta` package on npm:

- Provider: GitHub Actions
- Organization or user: `sezaienesyildizhan`
- Repository: `storemeta`
- Workflow filename: `release.yml`
- Environment: `npm`
- Permission: publish

The values are case-sensitive. The workflow has `id-token: write`, runs on a GitHub-hosted runner, and publishes from the public repository required for npm provenance.

After trusted publishing works, configure npm publishing access to require two-factor authentication and disallow traditional tokens. Do not add an `NPM_TOKEN` repository secret.

## Creating a release

Use Conventional Commit prefixes because they determine the next version:

- `fix:` creates a patch release.
- `feat:` creates a minor release.
- `feat!:` or a `BREAKING CHANGE:` footer creates a major release.
- `docs:`, `test:`, `ci:`, and `chore:` do not create a release by themselves.

Merge the automated Release Please pull request when its CI checks pass and the changelog is correct. No local `npm publish` command is required.

## Recovering a failed npm publish

If GitHub created the release but npm publishing failed before the version reached the registry:

1. Open the `Release` workflow in GitHub Actions.
2. Choose **Run workflow**.
3. Enter the existing release version without the `v` prefix, for example `0.2.0`.
4. Run the workflow.

The recovery path checks out the matching `vX.Y.Z` tag and reruns the complete verification before publishing. Never bump or retag a released version to recover a transient npm failure.
