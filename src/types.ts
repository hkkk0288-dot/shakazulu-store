export type Language = 'en' | 'sw';
export type Currency = 'TZS' | 'USD';

export type CategoryId = string;

export interface CategoryItem {
  id: string;
  nameEn: string;
  nameSw: string;
}

export type SizeOption = '250g' | '500g' | '1kg' | '5kg';

export type ProductBadge = 'best_seller' | 'new' | null;

export interface Product {
  id: string;
  nameEn: string;
  nameSw: string;
  descriptionEn: string;
  descriptionSw: string;
  category: Exclude<CategoryId, 'all'>;
  basePrice250g: number; // TZS
  wholesaleDiscount: number; // 0 - 40 (%)
  inStock: boolean;
  stockCount?: number;
  rating: number;
  reviewCount: number;
  badge: ProductBadge;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  accentText?: string;
  originEn: string;
  originSw: string;
  image?: string;
}

export interface CartItem {
  productId: string;
  size: SizeOption;
  quantity: number;
}

export type DeliveryMethod =
  | 'dar_delivery'
  | 'upcountry_bus'
  | 'international_dhl'
  | 'store_pickup';

export type DarAreaId =
  | 'mabibo'
  | 'kariakoo'
  | 'kinondoni'
  | 'mikocheni'
  | 'masaki'
  | 'mbezi'
  | 'temeke';

export type PaymentMethod =
  | 'mpesa'
  | 'mixx_yas'
  | 'airtel_money'
  | 'card'
  | 'whatsapp';

export type OrderStatus = 'pending' | 'packed' | 'dispatched';
export type OrderType = 'retail' | 'wholesale' | 'export';

export interface OrderItemSnapshot {
  productId: string;
  nameEn: string;
  nameSw: string;
  size: SizeOption;
  quantity: number;
  unitPriceTzs: number;
  lineTotalTzs: number;
  isWholesale: boolean;
}

export interface OrderTimestamp {
  status: OrderStatus;
  at: string; // ISO string
}

export interface Order {
  id: string;
  orderCode?: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  type: OrderType;
  deliveryMethod: DeliveryMethod;
  location: string;
  paymentMethod: PaymentMethod;
  vacuumPacked: boolean;
  vacuumFeeTzs: number;
  deliveryFeeTzs: number | null; // null when quoted on WhatsApp
  subtotalTzs: number;
  savingsTzs: number;
  totalTzs: number;
  currency: Currency;
  totalInOrderCurrency: number;
  status: OrderStatus;
  createdAt: string; // ISO string
  statusHistory: OrderTimestamp[];
  items: OrderItemSnapshot[];
  itemCount?: number;
  itemsSummary?: string;
  isCloudSynced?: boolean;
  promoCode?: string;
  promoDiscountTzs?: number;
  notes?: string;
}

export interface Coupon {
  code: string;
  discountPercent: number;
  active: boolean;
  descriptionEn: string;
  descriptionSw: string;
}

export interface ComboBundleItem {
  productId: string;
  size: SizeOption;
  quantity: number;
}

export interface ComboBundle {
  id: string;
  nameEn: string;
  nameSw: string;
  subtitleEn: string;
  subtitleSw: string;
  badgeEn: string;
  badgeSw: string;
  items: ComboBundleItem[];
  recommendedPromoCode: string;
  gradientFrom: string;
  gradientTo: string;
  image?: string;
}

export interface CustomerReview {
  id: string;
  name: string;
  roleLocationEn: string;
  roleLocationSw: string;
  rating: number;
  quoteEn: string;
  quoteSw: string;
}

export interface TrackedOrderResult {
  orderCode: string;
  status: OrderStatus;
  type: OrderType;
  deliveryMethod: DeliveryMethod;
  itemCount: number;
  totalTzs: number;
  currency: Currency;
  totalInOrderCurrency: number;
  createdAt: string;
  packedAt?: string;
  dispatchedAt?: string;
  location?: string;
  itemsSummary?: string;
  isLocal?: boolean;
}

export interface SplashSlide {
  id: string;
  kickerEn: string;
  kickerSw: string;
  titleEn: string;
  titleSw: string;
  bodyEn: string;
  bodySw: string;
  badgeEn: string;
  badgeSw: string;
  image?: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface SplashConfig {
  enabled: boolean;
  slides: SplashSlide[];
}

export type MobileTab = 'home' | 'categories' | 'wholesale' | 'cart' | 'more';
export type AdminTab = 'dashboard' | 'products' | 'orders' | 'splash';
export type PreviewMode = 'web' | 'app';
