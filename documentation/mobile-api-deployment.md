# Mobile API Deployment

## Target
- Public mobile API base URL: `https://boxandbuy.com/mobile-api`
- Local service port: `4000`
- Runtime: `node` + `tsx` loader

## Files
- App env example: `apps/mobile/.env.example`
- API env example: `apps/api/.env.production.example`
- Apache snippet: `deploy/apache/boxandbuy-mobile-api.conf`
- systemd unit: `deploy/systemd/boxandbuy-mobile-api.service`

## Server Steps
1. Copy `apps/api/.env.production.example` to `/etc/boxandbuy-mobile-api.env`.
2. Replace `JWT_SECRET` with a strong random value.
3. Create `apps/api/.data/` if it does not exist.
4. Install `deploy/systemd/boxandbuy-mobile-api.service` to `/etc/systemd/system/boxandbuy-mobile-api.service`.
5. Add the Apache proxy block from `deploy/apache/boxandbuy-mobile-api.conf` into `/etc/apache2/sites-available/boxandbuy.com-le-ssl.conf`.
6. Reload systemd and Apache, then start the service.

## Verification
- `curl -sk https://boxandbuy.com/mobile-api/health`
- `curl -sk https://boxandbuy.com/mobile-api/api/mobile/catalog/home`
- Confirm `systemctl status boxandbuy-mobile-api`
- Confirm logs append under `apps/api/.data/`

## Mobile Build Input
Populate `apps/mobile/.env` with:

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://boxandbuy.com/mobile-api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_replace_me
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_EAS_PROJECT_ID=replace-with-eas-project-id
EXPO_PUBLIC_UPDATES_URL=
EXPO_PUBLIC_DEEP_LINK_DOMAIN=
EXPO_PUBLIC_IOS_BUNDLE_ID=com.boxandbuy.mobile
EXPO_PUBLIC_ANDROID_PACKAGE=com.boxandbuy.mobile
```

## Known Remaining Blockers
- EAS project is not yet created on this server.
- `app.boxandbuy.com` does not exist, so universal-link domain setup is deferred.
- Native store builds still need real-device validation.
