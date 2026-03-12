# EAS Account Setup

Current status on this server:
- `eas-cli` can be reached with `npx eas-cli@latest`
- no Expo login or `EXPO_TOKEN` is configured
- no EAS project ID is available for this app yet

## Required Input
One of these is required before builds can continue:
- run `npx eas-cli@latest login` on this server
- export `EXPO_TOKEN` for a non-interactive Expo account session

## Project Link
After login, run from `/var/www/mobiledev`:

```bash
npx eas-cli@latest project:init
```

If the project already exists in Expo, link it instead:

```bash
npx eas-cli@latest project:info
npx eas-cli@latest init --id <existing-project-id>
```

## Mobile Env Update
Once the project ID is known, set it in:
- `apps/mobile/.env`
- `apps/mobile/.env.example`
  only if you want the example to carry the real project ID

Required key:

```dotenv
EXPO_PUBLIC_EAS_PROJECT_ID=<project-id>
```

## First Build Commands
Preview build:

```bash
npx eas-cli@latest build --platform ios --profile preview
npx eas-cli@latest build --platform android --profile preview
```

Production build:

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest build --platform android --profile production
```

## Verification
- `npx eas-cli@latest whoami`
- `npx eas-cli@latest project:info`
- confirm `EXPO_PUBLIC_EAS_PROJECT_ID` is present in `apps/mobile/.env`
- run the release checklist in `documentation/mobile-release-checklist.md`
