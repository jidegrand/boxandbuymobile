# BoxAndBuy Mobile

This repository contains the BoxAndBuy mobile app workspace and planning
documentation.

## Structure

- `SESSION-STATE.md`: reconnect and recovery note for the current release state.
- `documentation/`: delivery plan, sprint sheet, and validation matrix.
- `apps/api/`: mobile BFF and buyer auth foundation.
- `apps/mobile/`: Expo + React Native mobile app.
- `packages/contracts/`: shared Zod schemas and shared TypeScript contracts.

## Current focus

- release execution and build validation
- Android preview build tracking in Expo
- iOS credential completion for preview builds
- real-device smoke testing after artifacts are ready

## Next implementation steps

1. Check `SESSION-STATE.md` before resuming any interrupted release work.
2. Monitor the Android preview build in Expo.
3. Continue iOS preview build with Apple Developer credentials or `credentials.json`.
4. Run the release checklist in `documentation/mobile-release-checklist.md`.
