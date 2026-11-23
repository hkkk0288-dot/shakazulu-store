# Security Specification — Shakazulu Store

## 1. Data Invariants
1. **Admin Authority**: Only verified users matching the bootstrapped admin email (`hkkk0288@gmail.com` with `email_verified == true`) or listed in `/admins/{uid}` may write `/products`, read all `/orders`, or update order fulfillment statuses.
2. **Order Ownership & PII Isolation**: Every `/orders/{orderId}` document must bind `userId == request.auth.uid` on creation, may only be read/listed by its owner or an Admin, and may never be reassigned to another `userId`.
3. **Master Gate Atomicity**: Every `/orders/{orderId}/items/{itemId}` subcollection document can only be created atomically alongside a valid parent `/orders/{orderId}` owned by `request.auth.uid` (enforced via `existsAfter` + `getAfter`).
4. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time`; `createdAt` is immutable on update.
5. **Strict Schema & Bounds**: All IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars); all strings have bounded `.size()`; all numbers have valid ranges (`basePrice250g > 0`, `0 <= wholesaleDiscount <= 40`).

## 2. The "Dirty Dozen" Payloads (Expected `PERMISSION_DENIED`)
1. **Unauthenticated Product Write**: `POST /products/prod-hack` without auth token -> Denied.
2. **Non-Admin Product Price Tampering**: Customer updates `basePrice250g: 1` on `/products/prod-red-ubuyu` -> Denied.
3. **Oversized Product ID**: Create `/products/${'a'.repeat(200)}` -> Denied by `isValidId()`.
4. **Shadow Field Injection on Product**: Admin writes `{ ...validProduct, isFeaturedOverride: true }` -> Denied by `keys().hasOnly(...)`.
5. **Invalid Wholesale Discount**: Admin sets `wholesaleDiscount: 95` -> Denied (`<= 40`).
6. **Spoofed Email Unverified Admin**: Token with `email: 'hkkk0288@gmail.com'`, `email_verified: false` -> Denied.
7. **Order Identity Spoofing**: Customer A creates `/orders/ord-1` with `userId: 'customer-B'` -> Denied.
8. **Order Initial Status Bypass**: Customer creates `/orders/ord-1` with `status: 'dispatched'` -> Denied (`status == 'pending'` required).
9. **Client-Forged Timestamp**: Customer creates `/orders/ord-1` with `createdAt: '2020-01-01'` instead of `request.time` -> Denied.
10. **PII Cross-User Order Read**: Customer A calls `get('/orders/ord-customer-B')` -> Denied.
11. **Blanket Order List**: Customer A queries `/orders` without `where('userId', '==', uid)` -> Denied.
12. **Orphaned Order Item**: Customer creates `/orders/nonexistent/items/item-1` without atomic parent order -> Denied by `existsAfter()`.
