# Mobile App Delivery Documentation

This folder contains the working delivery plan for the BoxAndBuy mobile app.

Files:
- `mobile-app-sprint-plan.md`: phase-by-phase sprint plan with scope and exit criteria.
- `mobile-app-delivery-sheet.csv`: task-level delivery sheet with owner, dependency, validation, and status columns.
- `mobile-app-validation-matrix.md`: co-validation gates, acceptance checks, and release criteria.

Planning assumptions:
- V1 scope is `buyer + B2B`.
- Mobile clients do not call raw PrestaShop webservice directly.
- Buyer and B2B flows go through a mobile BFF backed by PrestaShop and `bbbusiness`.
- Seller Growth APIs continue from the existing Growth Center API.
- Checkout ships with hosted or web checkout fallback if native payment parity is not ready.
