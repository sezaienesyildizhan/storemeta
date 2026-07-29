# Releasing storemeta

storemeta uses GitHub Actions, Release Please, a package-scoped npm token, and npm provenance.

## Release Flow

1. Pull requests and pushes to `main` run CI on Node.js 20 and 24.
2. Conventional commits on `main` update a Release Please pull request.
3. Merging the Release Please pull request updates `package.json`, `package-lock.json`, and `CHANGELOG.md`, then creates a `vX.Y.Z` tag and GitHub Release.
4. The release workflow checks, tests, builds, and packs that exact release commit without npm credentials.
5. The `npm` GitHub Environment waits for maintainer approval before exposing its secret.
6. The workflow confirms that the token belongs to `sezaienesyildizhan` and publishes the verified tarball with provenance.

Normal commits do not publish packages directly. This prevents duplicate npm versions and keeps release timing explicit.

CI and release workflows skip changes where every modified file is Markdown or `LICENSE`. This includes `README.md` and files under `docs/`. If a commit also changes source, configuration, examples, package files, or workflow files, the workflows run normally.

## npm Authentication

The publish job authenticates with the `NPM_TOKEN` secret stored in the `npm` GitHub Environment. It must be a granular npm access token configured as follows:

- owner: `sezaienesyildizhan`
- package access: `storemeta` only
- package permission: read and write
- organization access: none
- bypass 2FA: enabled
- expiration: short and explicitly tracked

Do not store the token as a repository secret, in source files, in `.npmrc`, or in local release templates. Never print the token or pass it to install, test, build, or pack steps.

The `npm` Environment is restricted to `main` and requires maintainer approval. The token is referenced only by the final publish step. That step:

1. runs `npm whoami` and requires `sezaienesyildizhan`
2. publishes the tarball created before secret access
3. uses `--ignore-scripts` to disable package lifecycle scripts during publishing
4. uses `--provenance` with GitHub's OIDC permission to attest the source and build

The npm package must allow publishing with a granular token that has bypass 2FA enabled. The npm Trusted Publisher configuration must be removed; otherwise npm may use the OIDC publisher identity instead of the maintainer token.

## Token Rotation

Rotate `NPM_TOKEN` before its expiration:

The currently configured token expires on **2026-10-27**.

1. Create a replacement granular token with the same package-only permissions.
2. Run `gh secret set NPM_TOKEN --env npm` and enter the replacement token directly into the prompt.
3. Confirm the secret name with `gh secret list --env npm`. Secret values must never be displayed.
4. Revoke the previous token in npm.
5. Confirm the next release reports `sezaienesyildizhan` as `_npmUser`.

If the token may have leaked, reject any pending `npm` Environment deployment, revoke the token immediately, inspect npm package access and published versions, then replace the secret.

## Creating a Release

Use Conventional Commit prefixes because they determine the next version:

- `fix:` creates a patch release.
- `feat:` creates a minor release.
- `feat!:` or a `BREAKING CHANGE:` footer creates a major release.
- `docs:`, `test:`, `ci:`, and `chore:` do not create a release by themselves.

Merge the automated Release Please pull request only when its CI checks pass and the changelog is correct. Approve the `npm` Environment deployment after confirming that the release tag, version, and workflow source are expected. No local `npm publish` command is required.

## Recovering a Failed npm Publish

If GitHub created the release but npm publishing failed before the version reached the registry:

1. Confirm the `NPM_TOKEN` secret exists and has not expired.
2. Open the `Release` workflow in GitHub Actions.
3. Choose **Run workflow** from `main`.
4. Enter the existing release version without the `v` prefix, for example `0.2.2`.
5. Run the workflow and approve the `npm` Environment deployment.

The recovery path checks out the matching `vX.Y.Z` tag and reruns the complete verification before publishing. Never bump or retag a released version to recover a transient npm failure.
