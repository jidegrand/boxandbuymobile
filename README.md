# BoxAndBuy Mobile

This repository contains the BoxAndBuy mobile app workspace and planning
documentation.

## Structure

- `documentation/`: delivery plan, sprint sheet, and validation matrix.
- `apps/api/`: mobile BFF and buyer auth foundation.
- `apps/mobile/`: Expo + React Native mobile app.
- `packages/contracts/`: shared Zod schemas and shared TypeScript contracts.

## Current focus

- Sprint 10 release hardening
- mobile telemetry and push-token capture
- offline/focus lifecycle handling
- seller action and buyer/B2B end-to-end coverage

## Next implementation steps

1. Deploy the mobile API to `https://boxandbuy.com/mobile-api` using `documentation/mobile-api-deployment.md`.
2. Populate `apps/mobile/.env` from `apps/mobile/.env.example`.
3. Complete Expo login or provide `EXPO_TOKEN`, then follow `documentation/eas-account-setup.md`.
4. Create or link the EAS project and set `EXPO_PUBLIC_EAS_PROJECT_ID`.
5. Produce a preview development build with `eas build --profile preview`.
6. Run the release checklist in `documentation/mobile-release-checklist.md`.
