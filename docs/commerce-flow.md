# DRIGHT Commerce Flow

## Canonical flow

Listing → Add to Cart → Cart → Checkout → Order → Payment Transaction → Order Confirmation

## Rules

- Build on the existing Supabase commerce schema; do not create a test/smoke-test commerce layer.
- Every listing and order must retain stable, human-shareable identifiers.
- Cart items must preserve listing identity, quantity, price, currency, and affiliate attribution when present.
- Checkout creates an order in a non-paid state before payment confirmation.
- A payment provider callback/webhook is authoritative for changing a transaction/order to paid.
- Never mark an order as paid from a frontend success screen alone.
- Failed, cancelled, expired, refunded, disputed, and reversed payment states must remain auditable.
- Order, transaction, commission, referral, and notification records must be linked by stable IDs.
- Free listings/orders may complete without a payment provider when the applicable total is zero.

## Marketplace verticals

The marketplace UI must retain the vertical selector:

- All
- Products
- Services
- Courses
- Jobs
- Tasks

The selector is a compact vertical navigation/placeholder so users can narrow a crowded marketplace without removing the unified marketplace.

## Identity

Authenticated UI should display the username and respect the user's full-name visibility preference. Full name is public only when explicitly enabled by the user.

## Platform operations

Terms and conditions, cookies/privacy policy, Help Center, announcements, referrals, followers, and other platform surfaces must be configurable through the platform/CMS feature controls. Features under development can be disabled or hidden from the user-facing sidebar without deleting their implementation.
