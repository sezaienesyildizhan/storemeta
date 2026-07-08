# Release Verification

This project includes a local verification script and templates for final release checks.

## Local Verification

Run checks that do not require Apple or Google credentials:

```bash
npm run verify:release
```

This runs:

- TypeScript check
- test suite
- build
- `npm pack --dry-run`

## Real Store Verification

Create local files from the templates:

```bash
cp storemeta.release.example.yml storemeta.release.yml
cp .env.release.example .env.release.local
```

Fill these values in `storemeta.release.yml`:

- Apple `appId`
- Google `packageName`
- target locale list

Fill these values in `.env.release.local`:

- `STORE_APPLE_ISSUER_ID`
- `STORE_APPLE_KEY_ID`
- `STORE_APPLE_PRIVATE_KEY_PATH`
- `STORE_GOOGLE_SERVICE_ACCOUNT_PATH`

Run all real-store checks:

```bash
npm run verify:release -- --real-store
```

Run only one platform:

```bash
npm run verify:release -- --real-store --platform apple
npm run verify:release -- --real-store --platform google
```

Run one platform and one locale:

```bash
npm run verify:release -- --real-store --platform apple --locale tr
npm run verify:release -- --real-store --platform google --locale tr-TR
```

The real-store mode runs:

- `storemeta validate`
- metadata pull
- metadata push with `--dry-run`
- screenshots pull
- screenshots push with `--dry-run`

Do not commit `storemeta.release.yml` or `.env.release.local` if they contain real app identifiers or credential paths.
