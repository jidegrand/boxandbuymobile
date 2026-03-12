# Mobile App Co-Validation Matrix

## Governance Gates

| Gate | Decision | Required Evidence | Owner |
| --- | --- | --- | --- |
| Gate A | Approve v1 as buyer plus B2B | Signed scope and exclusions | Product |
| Gate B | Approve mobile BFF instead of raw PrestaShop webservice | Architecture note and endpoint inventory | Architecture |
| Gate C | Approve checkout mode for v1 | Checkout flow decision and risk note | Product |
| Gate D | Approve seller read-only before seller mutations | Signed seller scope split | Product |
| Gate E | Approve release only after real-device validation | iOS and Android smoke report | QA |

## Technical Validation Areas

### Auth

- Login returns valid mobile session or token pair.
- Refresh restores session after restart.
- Logout clears secure storage and server session.
- Expired credentials fail with clean `401`.
- Revoked credentials cannot be reused.

### Catalog

- Category list matches approved payload contract.
- Product detail shows server price and stock.
- Search returns expected result sets.
- Pagination does not duplicate or skip items.

### Cart

- Add, update, and remove line items match server totals.
- Guest to signed-in cart merge follows agreed rule.
- Address selection updates taxes and totals.
- Voucher application handles success and failure states.

### Checkout

- Successful checkout returns visible order confirmation.
- Failed checkout is recoverable without cart loss.
- Abandoned checkout can be resumed or restarted safely.
- Invoice and tracking links are visible where expected.

### B2B

- Business application submit and resubmit work.
- Terms request submit and status work.
- Disabled-account state is enforced.
- Approved and rejected statuses match server truth.

### RFQ

- RFQ can be created from eligible cart.
- Approved quote appears in history.
- Quote PDF is downloadable by the owner.
- Expired or unauthorized quote checkout is blocked.

### Seller Read-Only

- Seller session bootstrap works.
- Dashboard values match Growth web reference.
- Role restrictions block unauthorized access.
- Mobile rendering handles empty and partial data sets.

### Release

- Push notifications work in target environments.
- Deep links route to the correct screen.
- Crash reporting and analytics events are visible.
- Accessibility and performance checks meet the agreed baseline.

## Release Sign-Off Checklist

- Product sign-off complete.
- Backend sign-off complete.
- Mobile sign-off complete.
- QA sign-off complete.
- Security sign-off complete.
- Release rollback plan documented.
- Support handoff documented.
