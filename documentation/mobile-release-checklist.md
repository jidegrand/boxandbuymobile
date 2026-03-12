# Mobile Release Checklist

## Configuration
- Populate `apps/mobile/.env` from `apps/mobile/.env.example`.
- Set `EXPO_PUBLIC_EAS_PROJECT_ID`.
- Set `EXPO_PUBLIC_UPDATES_URL`.
- Confirm iOS bundle ID and Android package name.
- Confirm API base URL points to the production mobile API.

## Runtime Validation
- Verify login, catalog, cart, checkout handoff, orders, Business, RFQ, and seller routes on a real iPhone build.
- Verify the same flows on a real Android build.
- Confirm `/api/mobile/telemetry/events` records screen views and error events.
- Confirm `/api/mobile/telemetry/push-token` records the authenticated Expo push token.
- Confirm deep links open the expected app route.
- Confirm offline banner appears after connectivity loss and disappears after recovery.

## Release Safety
- Review telemetry logs under `apps/api/.data/` in staging or production runtime storage.
- Confirm no mobile secrets are stored outside SecureStore.
- Confirm Stripe key is publishable only.
- Confirm PrestaShop credentials remain server-side only.
- Confirm app version, build version, runtime version, and channel are visible in the account screen.

## Store Submission
- Prepare App Store screenshots, Play Store screenshots, privacy answers, and support URL.
- Produce a preview EAS build and complete smoke testing.
- Produce a production EAS build and complete final smoke testing.
- Tag the release commit after final approval.
