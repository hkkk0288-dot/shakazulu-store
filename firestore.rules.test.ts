/**
 * Phase 0 Security Rules Verification Spec for Shakazulu Store.
 * Verifies the "Dirty Dozen" adversarial payloads against firestore.rules.
 */
export const DIRTY_DOZEN_CASES = [
  { name: 'Unauthenticated product create', path: 'products/prod-hack', expect: 'PERMISSION_DENIED' },
  { name: 'Customer product price tampering', path: 'products/prod-red-ubuyu', expect: 'PERMISSION_DENIED' },
  { name: 'Oversized 200-char document ID', path: `products/${'a'.repeat(200)}`, expect: 'PERMISSION_DENIED' },
  { name: 'Shadow field injection on product', path: 'products/prod-red-ubuyu', expect: 'PERMISSION_DENIED' },
  { name: 'Out-of-bounds wholesaleDiscount (95%)', path: 'products/prod-red-ubuyu', expect: 'PERMISSION_DENIED' },
  { name: 'Unverified admin email spoof', path: 'products/prod-red-ubuyu', expect: 'PERMISSION_DENIED' },
  { name: 'Order userId spoofing', path: 'orders/ord-spoof', expect: 'PERMISSION_DENIED' },
  { name: 'Order created with dispatched status', path: 'orders/ord-skip', expect: 'PERMISSION_DENIED' },
  { name: 'Forged createdAt timestamp', path: 'orders/ord-time', expect: 'PERMISSION_DENIED' },
  { name: 'Cross-customer order PII read', path: 'orders/ord-other', expect: 'PERMISSION_DENIED' },
  { name: 'Unscoped collection list on /orders', path: 'orders', expect: 'PERMISSION_DENIED' },
  { name: 'Orphaned order item without parent batch', path: 'orders/missing/items/item-1', expect: 'PERMISSION_DENIED' },
] as const;
