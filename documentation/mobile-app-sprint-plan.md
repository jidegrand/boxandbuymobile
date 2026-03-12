# BoxAndBuy Mobile App Sprint Plan

## Scope Baseline

- Target release: `buyer + B2B`.
- Commerce system of record: PrestaShop.
- Buyer and B2B API layer: new mobile BFF.
- Seller analytics API layer: existing Growth Center API, extended only where needed.
- Checkout rule: web or hosted fallback is acceptable for v1; native payment is conditional.

## Sprint 0: Architecture Lock

Goal:
- Freeze the delivery shape before implementation starts.

Work:
- Confirm v1 scope as buyer plus B2B.
- Confirm that mobile will not use raw PrestaShop `ws_key` access.
- Confirm mobile auth strategy for buyer and B2B APIs.
- Confirm whether checkout v1 is hosted, webview, or partial native.
- Define screen inventory and endpoint inventory.
- Define owners and approval workflow.

Exit criteria:
- Scope approved.
- Auth approach approved.
- Checkout approach approved.
- API ownership approved.
- Sprint backlog approved.

## Sprint 1: Workspace and Mobile Shell

Goal:
- Stand up the mobile workspace and the app shell.

Work:
- Add `apps/mobile` to the npm workspace.
- Add shared `packages/contracts` for schemas and shared types.
- Scaffold Expo app with Router, TypeScript, Zustand, TanStack Query, MMKV, SecureStore, Stripe, and styling.
- Add root providers, navigation groups, auth guard, API client, env handling, and error boundary.
- Configure EAS and development builds.

Exit criteria:
- App boots on iOS and Android dev builds.
- Environments switch correctly.
- Secure storage works.
- Lint and typecheck pass.

## Sprint 2: Auth and API Foundation

Goal:
- Build the base mobile backend contract and authentication.

Work:
- Create buyer and B2B mobile auth endpoints.
- Add token issue, refresh, revoke, and logout flows.
- Add `me` endpoint and session bootstrap.
- Add request logging, auth failure logging, and rate limiting.
- Define shared API error format and status handling.

Exit criteria:
- Login works.
- Refresh works after app restart.
- Logout clears device and server state.
- Unauthorized requests return clean `401` responses.

## Sprint 3: Buyer Catalog

Goal:
- Deliver catalog browsing and product detail.

Work:
- Add endpoints for home feed, category list, search, filters, product detail, and seller summary.
- Build home, shop, and product detail screens.
- Implement query caching, pagination, empty states, and retry states.
- Ensure pricing and stock are rendered from server truth.

Exit criteria:
- Search works.
- Product detail works.
- Stock and pricing match web sample checks.
- No blocking performance regressions on test devices.

## Sprint 4: Cart and Addressing

Goal:
- Deliver a stable server-backed cart flow.

Work:
- Add cart create, read, update, delete, and merge endpoints.
- Add address create, edit, select default, and validation endpoints.
- Build cart screen and address selection flow.
- Keep local UI state in Zustand while server cart remains canonical.

Exit criteria:
- Cart persists across restart.
- Totals match server values.
- Address changes update totals correctly.
- Voucher and quantity changes are stable.

## Sprint 5: Checkout and Orders

Goal:
- Deliver checkout orchestration and post-purchase visibility.

Work:
- Add checkout session orchestration endpoint.
- Support hosted or web checkout fallback for v1.
- Add orders list, order detail, invoice, and tracking endpoints.
- Build order history and order detail screens.
- Add post-checkout refresh and recovery flow.

Exit criteria:
- Successful checkout path is stable.
- Failed and abandoned checkout paths are recoverable.
- Order history and detail render correctly.
- Invoice and tracking links are available where expected.

## Sprint 6: B2B Application and Terms

Goal:
- Bring existing B2B account logic into mobile.

Work:
- Expose business application status and submission endpoints.
- Expose guest and signed-in business application flows.
- Expose terms application status and submission endpoints.
- Build B2B application and terms screens.
- Mirror approval and disabled-account states from existing business rules.

Exit criteria:
- Apply and reapply flows work.
- Terms request flow works.
- Approval and rejection states render correctly.
- Disabled-account behavior is enforced.

## Sprint 7: RFQ and Quote Flow

Goal:
- Deliver RFQ submission and quote consumption.

Work:
- Add submit RFQ from cart endpoint.
- Add RFQ list, RFQ detail, quote PDF, and private checkout handoff endpoints.
- Build RFQ submission, RFQ history, and quote action screens.
- Enforce ownership, token, and expiry checks server-side.

Exit criteria:
- RFQ can be submitted from cart.
- Approved quotes appear in history.
- Quote PDF is downloadable.
- Expired or unauthorized quote checkout is blocked.

## Sprint 8: Seller Growth Read-Only

Goal:
- Deliver seller metrics in mobile without overextending the first release.

Work:
- Extend Growth Center auth for mobile-safe consumption if needed.
- Reuse existing read-only Growth endpoints where possible.
- Build overview, products, campaigns, listings, affiliates, trends, and recommendations screens.
- Add seller role checks and session bootstrap.

Exit criteria:
- Seller can authenticate.
- Read-only dashboards load.
- Role restrictions are enforced.
- Mobile values match Growth web checks.

## Sprint 9: Seller Actions Optional

Goal:
- Add seller mutations only if approved after read-only validation.

Work:
- Define seller action scope: orders, messages, payouts, or profile.
- Add dedicated APIs for approved seller actions.
- Add audit logging and rate limits.
- Build action flows only for the approved subset.

Exit criteria:
- Approved seller actions work.
- Permissions are enforced.
- Audit logs are present.
- No action bypasses web business rules.

## Sprint 10: Release Hardening

Goal:
- Prepare production release and operational support.

Work:
- Add push notifications, deep links, analytics, and crash reporting.
- Complete accessibility, performance, and offline handling passes.
- Complete security review for token handling and secrets.
- Build store assets, release checklist, and support runbook.
- Run real-device smoke tests for iOS and Android.

Exit criteria:
- Release checklist signed.
- No blocker defects remain.
- TestFlight and internal Android builds pass smoke tests.
- Production rollback and support notes are ready.
