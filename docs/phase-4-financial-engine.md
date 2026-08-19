# DRIGHT Phase 4 — Financial Engine

## Phase 4A implemented

- Multi-currency user wallets with stable `DR-WAL-########` identifiers.
- Immutable wallet ledger entries with stable `DR-WTX-########` identifiers.
- Wallet balance derived from ledger entries; no client-controlled balance column.
- Existing affiliate `commissions` table extended with settlement timestamps rather than duplicated.
- Existing `payouts` table extended with stable `DR-PAY-########` IDs and wallet reservation fields.
- Payout requests reserve funds immediately through an atomic server-side RPC.
- Minimum payout is currently 5 units of the wallet currency.
- Three-level referral program: 10% / 5% / 1%.
- Referral qualification expires after 14 days by default and is configurable by Super Admin.
- Referral reward bounds default to 0.05–10,000 and are configurable.
- Referral rewards remain pending until the qualifying event is validated.
- RLS limits financial records to the owner, with Super Admin visibility.

## Financial rules

Frontend screens never directly manufacture wallet credits, commission availability, or paid transactions. Server-side/database workflows are authoritative. Payment callbacks remain authoritative for payment state. Wallet credits must reference an order, commission, referral reward, settlement, adjustment, or other auditable source.

Payouts are represented as a debit reservation when requested. If a payout later fails, a server-authorized payout reversal entry must restore the reserved amount and the payout record must retain the failure reason.

## Next Phase 4B

Build the financial UI and settlement workflows:

1. Wallet dashboard and transaction history polish.
2. Payout account management and verification state.
3. Affiliate commission dashboard: Pending → Available → Paid → Reversed.
4. Referral dashboard and reward history.
5. Server-authorized commission settlement after order completion/refund windows.
6. Admin Finance Center for payouts, settlements, adjustments and audit logs.
7. Multi-currency wallet selection and canonical transaction accounting.
