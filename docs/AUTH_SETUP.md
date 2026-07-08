# Auth Setup

`storemeta` reads credentials from environment variables. Do not put secret values directly in `storemeta.yml`.

## Apple App Store Connect

Create an API key:

1. Open App Store Connect.
2. Go to Users and Access.
3. Open Integrations.
4. Open App Store Connect API.
5. Create or select an API key with access to the target app.
6. Copy the Issuer ID.
7. Copy the Key ID.
8. Download the `.p8` private key file.

Configure your shell:

```bash
export STORE_APPLE_ISSUER_ID=00000000-0000-0000-0000-000000000000
export STORE_APPLE_KEY_ID=XXXXXXXXXX
export STORE_APPLE_PRIVATE_KEY_PATH=/absolute/path/to/AuthKey_XXXXXXXXXX.p8
```

Common Apple errors:

- `401 Unauthorized`: issuer id, key id, and `.p8` file do not match, or the key does not have access to the app.
- Missing credential env var: the environment variable name in `storemeta.yml` is not exported in the current shell.
- File read failure: `STORE_APPLE_PRIVATE_KEY_PATH` does not point to a readable `.p8` file.

## Google Play

Create a service account:

1. Open Google Cloud Console.
2. Create or select a project.
3. Enable the Google Play Developer API.
4. Create a service account.
5. Create and download a JSON key for that service account.
6. Open Google Play Console.
7. Go to Users and permissions.
8. Invite the service account email as a user.
9. Grant access to the target app and the permissions needed for metadata and screenshots.

Configure your shell:

```bash
export STORE_GOOGLE_SERVICE_ACCOUNT_PATH=/absolute/path/to/google-service-account.json
```

Common Google errors:

- `401 Unauthorized`: service account JSON is invalid or cannot exchange an OAuth token.
- `403 Forbidden`: service account is not added to Play Console or lacks permission for the app.
- `400 Bad Request` for locale: Google Play expects locale codes such as `tr-TR`, not just `tr`.

## Check Credentials

Run:

```bash
storemeta auth check
storemeta validate
```

`auth check` confirms that configured credential environment variables are present. `validate` checks config, metadata files, and screenshot layout.
