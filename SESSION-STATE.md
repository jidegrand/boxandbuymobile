# Session State

Use this file to resume the BoxAndBuy mobile release work after a disconnect.

## Repo
- Path: `/var/www/mobiledev`
- Branch: `main`
- Expected state: clean working tree
- GitHub remote is already connected

## Live Deployment State
- Mobile API is live at `https://boxandbuy.com/mobile-api`
- Local service port: `4000`
- systemd unit: `boxandbuy-mobile-api`
- Health check:
  `curl -sk https://boxandbuy.com/mobile-api/health`

## Mobile App State
- Expo app root: `/var/www/mobiledev/apps/mobile`
- Local app env exists at `apps/mobile/.env`
- EAS project ID:
  `9301296b-5907-40c3-a904-248e83b0f633`
- Android/iOS bundle IDs:
  - `com.boxandbuy.mobile`

## EAS State
- Expo project:
  `@boxandbuy/boxandbuy-mobile`
- Project page:
  `https://expo.dev/accounts/boxandbuy/projects/boxandbuy-mobile`
- Android preview build already queued:
  `https://expo.dev/accounts/boxandbuy/projects/boxandbuy-mobile/builds/7423194c-a126-4dd0-9c8e-102836ea9db9`

## Current Blocker
- Android preview is in progress or pending review in Expo.
- iOS preview is blocked on Apple Developer credentials.
- Expo confirmed it needs either:
  - Apple Developer login during `eas build`, or
  - a valid `credentials.json`

## Important Notes
- Do not expose PrestaShop credentials, JWT secrets, or Expo tokens in repo files.
- `apps/mobile/.env` is ignored by git and may contain live values.
- The Expo token used during setup was not committed to the repo. A future session will need either:
  - `EXPO_TOKEN`, or
  - `eas login`

## Resume Commands
Run these first:

```bash
cd /var/www/mobiledev
git status --short
git log -1 --oneline
curl -sk https://boxandbuy.com/mobile-api/health
systemctl --no-pager --full status boxandbuy-mobile-api
```

If Expo auth is available:

```bash
cd /var/www/mobiledev/apps/mobile
npx eas-cli@latest whoami
npx eas-cli@latest project:info
```

## Next Steps
1. Check the Android preview build result in Expo.
2. Continue iOS build with Apple Developer login or `credentials.json`.
3. Complete real-device smoke testing after build artifacts are ready.

## Key References
- `documentation/mobile-api-deployment.md`
- `documentation/eas-account-setup.md`
- `documentation/mobile-release-checklist.md`
