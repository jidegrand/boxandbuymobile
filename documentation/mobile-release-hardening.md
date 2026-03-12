# Mobile Release Hardening

Sprint 10 implementation status:
- App shell now wires React Query focus and network lifecycle handling.
- Mobile telemetry is recorded through `/api/mobile/telemetry/events`.
- Expo push token registration is implemented and stored through `/api/mobile/telemetry/push-token`.
- Route tracking, deep-link tracking, notification-open tracking, and API error tracking are active.
- Runtime crash fallback is handled by a root app error boundary.
- OTA update metadata, runtime version, and build version are visible in the account screen.
- EAS configuration and environment templates are included for release workflows.

Implemented files:
- `apps/mobile/lib/telemetry.ts`
- `apps/mobile/lib/notifications.ts`
- `apps/mobile/lib/network.ts`
- `apps/mobile/hooks/use-release-hardening.ts`
- `apps/mobile/components/ui/app-error-boundary.tsx`
- `apps/mobile/components/ui/offline-banner.tsx`
- `apps/api/src/routes/mobile-telemetry.ts`
- `apps/api/src/services/telemetry-log-service.ts`
- `eas.json`

Release assumptions:
- Push notifications require a real device and a valid `EXPO_PUBLIC_EAS_PROJECT_ID`.
- OTA updates require a valid Expo Updates URL and production EAS setup.
- Deep-link verification still requires domain association setup outside the repo.

Validation targets:
- TypeScript passes for contracts, API, and mobile.
- Telemetry event ingestion returns `202`.
- Push token registration returns `202` for authenticated sessions.
- Offline banner appears when the device loses connectivity.
- Root error boundary renders a retry state instead of crashing to a blank screen.
