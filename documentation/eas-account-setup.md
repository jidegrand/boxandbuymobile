# EAS Account Setup

Current status on this server:
- `eas-cli` can be reached with `npx eas-cli@latest`
- Expo auth works with `EXPO_TOKEN`
- EAS project already exists for this app
- project ID: `9301296b-5907-40c3-a904-248e83b0f633`

## Required Input
Expo auth is required before builds can continue:
- run `npx eas-cli@latest login` on this server, or
- export `EXPO_TOKEN` for a non-interactive Expo account session

## Project Link
If you need to recreate the link, run from `/var/www/mobiledev/apps/mobile`:

```bash
npx eas-cli@latest project:init
```

If the project already exists in Expo, link it instead:

```bash
npx eas-cli@latest project:info
npx eas-cli@latest project:init --id 9301296b-5907-40c3-a904-248e83b0f633 --force
```

## Mobile Env Update
Once the project ID is known, set it in:
- `apps/mobile/.env`
- `apps/mobile/.env.example`
  only if you want the example to carry the real project ID

Required key:

```dotenv
EXPO_PUBLIC_EAS_PROJECT_ID=9301296b-5907-40c3-a904-248e83b0f633
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

## Current Build Status
- Android preview build queued successfully:
  `https://expo.dev/accounts/boxandbuy/projects/boxandbuy-mobile/builds/7423194c-a126-4dd0-9c8e-102836ea9db9`
- iOS preview build is blocked on Apple Developer login or `credentials.json`.
