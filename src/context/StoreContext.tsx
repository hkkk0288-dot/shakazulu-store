import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { SEED_CATEGORIES, SEED_COUPONS, SEED_ORDERS, SEED_PRODUCTS } from '../data/seedData';
import {
  ADMIN_EMAIL,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { getTranslations } from '../i18n/translations';
import {
  CartItem,
  CategoryItem,
  ComboBundle,
  Coupon,
  Currency,
  DeliveryMethod,
  Language,
  Order,
  OrderItemSnapshot,
  OrderStatus,
  OrderTimestamp,
  OrderType,
  PaymentMethod,
  PreviewMode,
  Product,
  ProductBadge,
  SizeOption,
  TrackedOrderResult,
} from '../types';
import { calculateLinePricing, convertTzsToCurrency } from '../utils/pricing';
import { computeTrackingHash, normalizePhoneSuffix } from '../utils/tracking';

const STORAGE_KEYS = {
  products: 'shakazulu_products_v1',
  orders: 'shakazulu_orders_v1',
  cart: 'shakazulu_cart_v1',
  wishlist: 'shakazulu_wishlist_v1',
  language: 'shakazulu_lang_v1',
  currency: 'shakazulu_currency_v1',
  vacuumPacked: 'shakazulu_vacuum_v1',
  coupons: 'shakazulu_coupons_v1',
  categories: 'shakazulu_categories_v1',
};

function safeReadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

function tsToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export interface PlaceOrderInput {
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  location: string;
  paymentMethod: PaymentMethod;
  vacuumPacked: boolean;
  vacuumFeeTzs: number;
  deliveryFeeTzs: number | null;
  notes?: string;
}

interface StoreContextValue {
  products: Product[];
  categories: CategoryItem[];
  orders: Order[];
  coupons: Coupon[];
  cart: CartItem[];
  wishlist: string[];
  language: Language;
  currency: Currency;
  vacuumPacked: boolean;
  appliedCoupon: Coupon | null;
  adminMode: boolean;
  adminUnlocked: boolean;
  previewMode: PreviewMode;
  toastMessage: string | null;
  user: User | null;
  authReady: boolean;
  isCloudAdmin: boolean;
  cloudCatalogSynced: boolean;
  t: ReturnType<typeof getTranslations>;
  getCategoryLabel: (categoryId: string) => string;
  setLanguage: (lang: Language) => void;
  setCurrency: (curr: Currency) => void;
  setVacuumPacked: (val: boolean) => void;
  setAdminMode: (val: boolean) => void;
  unlockAdmin: () => void;
  setPreviewMode: (mode: PreviewMode) => void;
  showToast: (msg: string) => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  seedCatalogToCloud: () => Promise<void>;
  loadOrderItems: (orderId: string) => Promise<OrderItemSnapshot[]>;
  trackOrderByCode: (orderCode: string, phone: string) => Promise<TrackedOrderResult | null>;
  applyPromoCode: (rawCode: string) => boolean;
  removePromoCode: () => void;
  addBundleToCart: (bundle: ComboBundle) => void;
  upsertCoupon: (coupon: Omit<Coupon, 'active'> & { active?: boolean }) => void;
  toggleCouponActive: (code: string) => void;
  addToCart: (productId: string, size: SizeOption, quantity: number) => void;
  updateCartItemQuantity: (productId: string, size: SizeOption, quantity: number) => void;
  removeFromCart: (productId: string, size: SizeOption) => void;
  clearCart: () => void;
  placeOrder: (input: PlaceOrderInput) => Promise<Order>;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  addProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewCount' | 'badge'> & { badge?: ProductBadge }) => Product;
  addCategory: (input: { nameEn: string; nameSw: string }) => CategoryItem;
  updateCategory: (categoryId: string, updates: { nameEn: string; nameSw: string }) => void;
  deleteCategory: (categoryId: string) => boolean;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  resetDemoData: () => void;
  cartSummary: {
    itemCount: number;
    subtotalTzs: number;
    savingsTzs: number;
    promoDiscountTzs: number;
    subtotalAfterPromoTzs: number;
    hasOutOfStockItem: boolean;
    snapshots: OrderItemSnapshot[];
  };
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localProducts, setLocalProducts] = useState<Product[]>(() =>
    safeReadStorage<Product[]>(STORAGE_KEYS.products, SEED_PRODUCTS)
  );
  const [cloudProducts, setCloudProducts] = useState<Product[] | null>(null);

  const [localCategories, setLocalCategories] = useState<CategoryItem[]>(() =>
    safeReadStorage<CategoryItem[]>(STORAGE_KEYS.categories, SEED_CATEGORIES)
  );
  const [cloudCategories, setCloudCategories] = useState<CategoryItem[] | null>(null);

  const [localOrders, setLocalOrders] = useState<Order[]>(() =>
    safeReadStorage<Order[]>(STORAGE_KEYS.orders, SEED_ORDERS)
  );
  const [cloudOrders, setCloudOrders] = useState<Order[] | null>(null);

  const [localCoupons, setLocalCoupons] = useState<Coupon[]>(() =>
    safeReadStorage<Coupon[]>(STORAGE_KEYS.coupons, SEED_COUPONS)
  );
  const [cloudCoupons, setCloudCoupons] = useState<Coupon[] | null>(null);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() =>
    safeReadStorage<CartItem[]>(STORAGE_KEYS.cart, [])
  );
  const [wishlist, setWishlist] = useState<string[]>(() =>
    safeReadStorage<string[]>(STORAGE_KEYS.wishlist, [])
  );
  const [language, setLanguageState] = useState<Language>(() =>
    safeReadStorage<Language>(STORAGE_KEYS.language, 'en')
  );
  const [currency, setCurrencyState] = useState<Currency>(() =>
    safeReadStorage<Currency>(STORAGE_KEYS.currency, 'TZS')
  );
  const [vacuumPacked, setVacuumPackedState] = useState<boolean>(() =>
    safeReadStorage<boolean>(STORAGE_KEYS.vacuumPacked, false)
  );

  const [adminMode, setAdminMode] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('web');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const isCloudAdmin = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL
  );

  // Sync Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser && nextUser.emailVerified && nextUser.email?.toLowerCase() === ADMIN_EMAIL) {
        setAdminUnlocked(true);
      }
    });
    return () => unsub();
  }, []);

  // Real-time Products listener (public catalog, zero PII)
  useEffect(() => {
    const productsRef = collection(db, 'products');
    const unsub = onSnapshot(
      productsRef,
      (snapshot) => {
        if (snapshot.empty) {
          setCloudProducts(null);
          return;
        }
        const loaded: Product[] = snapshot.docs.map((d) => {
          const data = d.data();
          const badgeRaw = data.badge as string | undefined;
          const badge: ProductBadge =
            badgeRaw === 'best_seller' || badgeRaw === 'new' ? badgeRaw : null;
          const seedMatch = SEED_PRODUCTS.find((sp) => sp.id === d.id);
          const resolvedImage =
            typeof data.image === 'string' && data.image.length > 0
              ? data.image
              : seedMatch?.image;
          return {
            id: d.id,
            nameEn: String(data.nameEn || ''),
            nameSw: String(data.nameSw || data.nameEn || ''),
            descriptionEn: String(data.descriptionEn || ''),
            descriptionSw: String(data.descriptionSw || data.descriptionEn || ''),
            category: data.category || 'ubuyu_achari',
            basePrice250g: Number(data.basePrice250g || 4000),
            wholesaleDiscount: Number(data.wholesaleDiscount ?? 15),
            inStock: Boolean(data.inStock),
            stockCount: typeof data.stockCount === 'number' ? data.stockCount : undefined,
            rating: Number(data.rating ?? 5),
            reviewCount: Number(data.reviewCount ?? 1),
            badge,
            emoji: String(data.emoji || '🍒'),
            gradientFrom: String(data.gradientFrom || '#D95D39'),
            gradientTo: String(data.gradientTo || '#8C1D18'),
            originEn: String(data.originEn || 'Tanzania'),
            originSw: String(data.originSw || 'Tanzania'),
            image: resolvedImage,
          };
        });
        setCloudProducts(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );
    return () => unsub();
  }, []);

  // Real-time Categories listener
  useEffect(() => {
    const categoriesRef = collection(db, 'categories');
    const unsub = onSnapshot(
      categoriesRef,
      (snapshot) => {
        if (snapshot.empty) {
          setCloudCategories(null);
          return;
        }
        const loaded: CategoryItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            nameEn: String(data.nameEn || d.id),
            nameSw: String(data.nameSw || data.nameEn || d.id),
          };
        });
        setCloudCategories(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    );
    return () => unsub();
  }, []);

  // Real-time Coupons listener
  useEffect(() => {
    const couponsRef = collection(db, 'coupons');
    const unsub = onSnapshot(
      couponsRef,
      (snapshot) => {
        if (snapshot.empty) {
          setCloudCoupons(null);
          return;
        }
        const loaded: Coupon[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            code: String(data.code || d.id),
            discountPercent: Number(data.discountPercent || 10),
            active: Boolean(data.active),
            descriptionEn: String(data.descriptionEn || ''),
            descriptionSw: String(data.descriptionSw || ''),
          };
        });
        setCloudCoupons(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'coupons');
      }
    );
    return () => unsub();
  }, []);

  // Real-time Orders listener (ONLY attached when auth is ready and user is authenticated)
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setCloudOrders(null);
      return;
    }

    const ordersRef = collection(db, 'orders');
    const ordersQuery = isCloudAdmin
      ? query(ordersRef)
      : query(ordersRef, where('userId', '==', user.uid));

    const unsub = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const loaded: Order[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdAtIso = tsToIso(data.createdAt);
          const status = (data.status as OrderStatus) || 'pending';
          const history: OrderTimestamp[] = [{ status: 'pending', at: createdAtIso }];
          if (data.packedAt) {
            history.push({ status: 'packed', at: tsToIso(data.packedAt) });
          } else if (status === 'packed' || status === 'dispatched') {
            history.push({ status: 'packed', at: tsToIso(data.updatedAt) });
          }
          if (data.dispatchedAt) {
            history.push({ status: 'dispatched', at: tsToIso(data.dispatchedAt) });
          } else if (status === 'dispatched') {
            history.push({ status: 'dispatched', at: tsToIso(data.updatedAt) });
          }

          const feeVal = Number(data.deliveryFeeTzs);
          return {
            id: d.id,
            orderCode: String(data.orderCode || d.id),
            userId: String(data.userId || ''),
            customerName: String(data.customerName || 'Customer'),
            customerPhone: String(data.customerPhone || '-'),
            type: (data.type as OrderType) || 'retail',
            deliveryMethod: data.deliveryMethod || 'dar_delivery',
            location: String(data.location || ''),
            paymentMethod: data.paymentMethod || 'mpesa',
            vacuumPacked: Boolean(data.vacuumPacked),
            vacuumFeeTzs: Number(data.vacuumFeeTzs || 0),
            deliveryFeeTzs: feeVal < 0 ? null : feeVal,
            subtotalTzs: Number(data.subtotalTzs || 0),
            savingsTzs: Number(data.savingsTzs || 0),
            totalTzs: Number(data.totalTzs || 0),
            currency: data.currency === 'USD' ? 'USD' : 'TZS',
            totalInOrderCurrency: Number(data.totalInOrderCurrency || 0),
            status,
            createdAt: createdAtIso,
            statusHistory: history,
            items: [],
            itemCount: Number(data.itemCount || 1),
            itemsSummary: String(data.itemsSummary || ''),
            isCloudSynced: true,
            notes: typeof data.notes === 'string' ? data.notes : undefined,
          };
        });

        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCloudOrders(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => unsub();
  }, [authReady, user, isCloudAdmin]);

  const products = useMemo(() => {
    const baseList = cloudProducts ?? localProducts;
    if (!cloudProducts) {
      // Ensure studio images are present for seeded IDs even if localStorage had older seed cache
      return baseList.map((p) => {
        if (p.image) return p;
        const seedMatch = SEED_PRODUCTS.find((sp) => sp.id === p.id);
        return seedMatch?.image ? { ...p, image: seedMatch.image } : p;
      });
    }
    return baseList;
  }, [cloudProducts, localProducts]);

  const categories = useMemo(() => {
    const source = cloudCategories ?? localCategories;
    const seedOrder = SEED_CATEGORIES.map((c) => c.id);
    return [...source].sort((a, b) => {
      const idxA = seedOrder.indexOf(a.id);
      const idxB = seedOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.nameEn.localeCompare(b.nameEn);
    });
  }, [cloudCategories, localCategories]);

  const coupons = cloudCoupons ?? localCoupons;
  const appliedCoupon = useMemo(
    () =>
      appliedCouponCode
        ? coupons.find((c) => c.code === appliedCouponCode && c.active) ?? null
        : null,
    [appliedCouponCode, coupons]
  );

  const orders = useMemo(() => {
    if (cloudOrders) {
      return isCloudAdmin ? [...cloudOrders, ...localOrders.filter((o) => !o.isCloudSynced)] : cloudOrders;
    }
    return localOrders;
  }, [cloudOrders, localOrders, isCloudAdmin]);

  useEffect(() => {
    safeWriteStorage(STORAGE_KEYS.products, localProducts);
  }, [localProducts]);

  useEffect(() => {
    safeWriteStorage(STORAGE_KEYS.categories, localCategories);
  }, [localCategories]);

  useEffect(() => {
    safeWriteStorage(STORAGE_KEYS.orders, localOrders);
  }, [localOrders]);

  useEffect(() => {
    safeWriteStorage(STORAGE_KEYS.coupons, localCoupons);
  }, [localCoupons]);

  useEffect(() => {
    safeWriteStorage(STORAGE_KEYS.cart, cart);
  }, [cart]);

  useEffect(() => {
    safeWriteStorage(STORAGE_KEYS.wishlist, wishlist);
  }, [wishlist]);

  useEffect(() => {
    safeWriteStorage(STORAGE_KEYS.language, language);
  }, [language]);

  useEffect(() => {
    safeWriteStorage(STORAGE_KEYS.currency, currency);
  }, [currency]);

  useEffect(() => {
    safeWriteStorage(STORAGE_KEYS.vacuumPacked, vacuumPacked);
  }, [vacuumPacked]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const t = useMemo(() => getTranslations(language), [language]);

  const getCategoryLabel = useCallback(
    (categoryId: string): string => {
      if (categoryId === 'all') return t.categories.all;
      const found = categories.find((c) => c.id === categoryId);
      if (found) {
        return language === 'sw' ? found.nameSw || found.nameEn : found.nameEn;
      }
      return (t.categories as Record<string, string>)[categoryId] || categoryId;
    },
    [categories, language, t.categories]
  );

  const setLanguage = useCallback((lang: Language) => setLanguageState(lang), []);
  const setCurrency = useCallback((curr: Currency) => setCurrencyState(curr), []);
  const setVacuumPacked = useCallback((val: boolean) => setVacuumPackedState(val), []);
  const unlockAdmin = useCallback(() => setAdminUnlocked(true), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        showToast(result.user.displayName || result.user.email || 'Signed in');
      }
    } catch (error) {
      console.error('Google sign-in failed:', error);
      showToast(language === 'sw' ? 'Imeshindikana kuingia na Google' : 'Google sign-in cancelled');
    }
  }, [language, showToast]);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setAdminUnlocked(false);
      showToast(t.cloudAuth.signOut);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, [showToast, t.cloudAuth.signOut]);

  const seedCatalogToCloud = useCallback(async () => {
    if (!isCloudAdmin) return;
    try {
      const batch = writeBatch(db);
      SEED_CATEGORIES.forEach((cat) => {
        const catRef = doc(db, 'categories', cat.id);
        batch.set(catRef, {
          id: cat.id,
          nameEn: cat.nameEn.slice(0, 80),
          nameSw: cat.nameSw.slice(0, 80),
          updatedAt: serverTimestamp(),
        });
      });
      SEED_PRODUCTS.forEach((p) => {
        const ref = doc(db, 'products', p.id);
        const payload: Record<string, unknown> = {
          nameEn: p.nameEn.slice(0, 120),
          nameSw: p.nameSw.slice(0, 120),
          descriptionEn: p.descriptionEn.slice(0, 600),
          descriptionSw: p.descriptionSw.slice(0, 600),
          category: p.category,
          basePrice250g: p.basePrice250g,
          wholesaleDiscount: p.wholesaleDiscount,
          inStock: p.inStock,
          rating: p.rating,
          reviewCount: p.reviewCount,
          badge: p.badge ?? 'none',
          emoji: p.emoji.slice(0, 16),
          gradientFrom: p.gradientFrom,
          gradientTo: p.gradientTo,
          originEn: p.originEn.slice(0, 80),
          originSw: p.originSw.slice(0, 80),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (p.image) payload.image = p.image;
        batch.set(ref, payload);
      });
      await batch.commit();
      showToast(t.admin.products.updatedToast);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  }, [isCloudAdmin, showToast, t.admin.products.updatedToast]);

  const loadOrderItems = useCallback(
    async (orderId: string): Promise<OrderItemSnapshot[]> => {
      const existingOrder = orders.find((o) => o.id === orderId);
      if (existingOrder && existingOrder.items.length > 0) {
        return existingOrder.items;
      }
      if (!user || !user.emailVerified) return [];
      const path = `orders/${orderId}/items`;
      try {
        const snap = await getDocs(collection(db, path));
        return snap.docs.map((d) => {
          const data = d.data();
          return {
            productId: String(data.productId || ''),
            nameEn: String(data.nameEn || ''),
            nameSw: String(data.nameSw || ''),
            size: (data.size as SizeOption) || '250g',
            quantity: Number(data.quantity || 1),
            unitPriceTzs: Number(data.unitPriceTzs || 0),
            lineTotalTzs: Number(data.lineTotalTzs || 0),
            isWholesale: Boolean(data.isWholesale),
          };
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    },
    [orders, user]
  );

  const trackOrderByCode = useCallback(
    async (rawCode: string, rawPhone: string): Promise<TrackedOrderResult | null> => {
      const cleanCode = rawCode.trim().toUpperCase().replace(/^#/, '');
      const cleanSuffix = normalizePhoneSuffix(rawPhone);
      if (!cleanCode || cleanSuffix.length < 4) return null;

      // 1. Check orders already visible in state (local guest orders or user's cloud orders)
      const localMatch = orders.find(
        (o) =>
          (o.orderCode || o.id).toUpperCase() === cleanCode ||
          o.id.toUpperCase() === cleanCode
      );
      if (localMatch) {
        const orderSuffix = normalizePhoneSuffix(localMatch.customerPhone);
        if (orderSuffix === cleanSuffix || localMatch.customerPhone === '-') {
          const packedLog = localMatch.statusHistory.find((h) => h.status === 'packed')?.at;
          const dispatchedLog = localMatch.statusHistory.find((h) => h.status === 'dispatched')?.at;
          return {
            orderCode: localMatch.orderCode || localMatch.id,
            status: localMatch.status,
            type: localMatch.type,
            deliveryMethod: localMatch.deliveryMethod,
            itemCount: localMatch.itemCount || localMatch.items.length || 1,
            totalTzs: localMatch.totalTzs,
            currency: localMatch.currency,
            totalInOrderCurrency: localMatch.totalInOrderCurrency,
            createdAt: localMatch.createdAt,
            packedAt: packedLog,
            dispatchedAt: dispatchedLog,
            location: localMatch.location,
            itemsSummary: localMatch.itemsSummary,
            isLocal: !localMatch.isCloudSynced,
          };
        }
      }

      // 2. Zero-PII Cloud Lookup on /orderTracking/{orderCode}
      try {
        const snap = await getDoc(doc(db, 'orderTracking', cleanCode));
        if (!snap.exists()) return null;
        const data = snap.data();
        const expectedHash = await computeTrackingHash(cleanCode, rawPhone);
        if (data.verifyHash !== expectedHash) {
          return null;
        }
        return {
          orderCode: String(data.orderCode || cleanCode),
          status: (data.status as OrderStatus) || 'pending',
          type: (data.type as OrderType) || 'retail',
          deliveryMethod: (data.deliveryMethod as DeliveryMethod) || 'dar_delivery',
          itemCount: Number(data.itemCount || 1),
          totalTzs: Number(data.totalTzs || 0),
          currency: data.currency === 'USD' ? 'USD' : 'TZS',
          totalInOrderCurrency: Number(data.totalInOrderCurrency || 0),
          createdAt: tsToIso(data.createdAt),
          packedAt: data.packedAt ? tsToIso(data.packedAt) : undefined,
          dispatchedAt: data.dispatchedAt ? tsToIso(data.dispatchedAt) : undefined,
        };
      } catch (err) {
        console.error('Order lookup error:', err);
        return null;
      }
    },
    [orders]
  );

  const addToCart = useCallback(
    (productId: string, size: SizeOption, quantity: number) => {
      const target = products.find((p) => p.id === productId);
      if (!target || !target.inStock) return;
      const qtyToAdd = Math.max(1, quantity);
      setCart((prev) => {
        const idx = prev.findIndex((item) => item.productId === productId && item.size === size);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qtyToAdd };
          return updated;
        }
        return [...prev, { productId, size, quantity: qtyToAdd }];
      });
      showToast(`${language === 'sw' ? target.nameSw : target.nameEn} · ${t.product.addedToast}`);
    },
    [products, language, t.product.addedToast, showToast]
  );

  const updateCartItemQuantity = useCallback(
    (productId: string, size: SizeOption, quantity: number) => {
      setCart((prev) => {
        if (quantity <= 0) {
          return prev.filter((item) => !(item.productId === productId && item.size === size));
        }
        return prev.map((item) =>
          item.productId === productId && item.size === size ? { ...item, quantity } : item
        );
      });
    },
    []
  );

  const removeFromCart = useCallback((productId: string, size: SizeOption) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.size === size)));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setVacuumPackedState(false);
    setAppliedCouponCode(null);
  }, []);

  const applyPromoCode = useCallback(
    (rawCode: string): boolean => {
      const normalized = rawCode.trim().toUpperCase();
      const found = coupons.find((c) => c.code === normalized && c.active);
      if (!found) {
        return false;
      }
      setAppliedCouponCode(found.code);
      showToast(`${t.conversion.promoApplied}: ${found.code} (-${found.discountPercent}%)`);
      return true;
    },
    [coupons, showToast, t.conversion.promoApplied]
  );

  const removePromoCode = useCallback(() => {
    setAppliedCouponCode(null);
  }, []);

  const addBundleToCart = useCallback(
    (bundle: ComboBundle) => {
      setCart((prev) => {
        let next = [...prev];
        bundle.items.forEach((bItem) => {
          const prod = products.find((p) => p.id === bItem.productId);
          if (!prod || !prod.inStock) return;
          const idx = next.findIndex(
            (c) => c.productId === bItem.productId && c.size === bItem.size
          );
          if (idx >= 0) {
            next[idx] = { ...next[idx], quantity: next[idx].quantity + bItem.quantity };
          } else {
            next.push({
              productId: bItem.productId,
              size: bItem.size,
              quantity: bItem.quantity,
            });
          }
        });
        return next;
      });
      const promo = coupons.find((c) => c.code === bundle.recommendedPromoCode && c.active);
      if (promo) {
        setAppliedCouponCode(promo.code);
      }
      showToast(`${language === 'sw' ? bundle.nameSw : bundle.nameEn} · ${t.conversion.bundleAddedToast}`);
    },
    [products, coupons, language, showToast, t.conversion.bundleAddedToast]
  );

  const upsertCoupon = useCallback(
    (input: Omit<Coupon, 'active'> & { active?: boolean }) => {
      const cleanCode = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
      if (cleanCode.length < 3) return;
      const pct = Math.max(1, Math.min(40, Math.round(input.discountPercent)));
      const couponObj: Coupon = {
        code: cleanCode,
        discountPercent: pct,
        active: input.active ?? true,
        descriptionEn: input.descriptionEn.slice(0, 140) || `${pct}% discount`,
        descriptionSw: input.descriptionSw.slice(0, 140) || `Punguzo la ${pct}%`,
      };
      if (isCloudAdmin) {
        setDoc(doc(db, 'coupons', cleanCode), {
          ...couponObj,
          updatedAt: serverTimestamp(),
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, `coupons/${cleanCode}`));
      } else {
        setLocalCoupons((prev) => {
          const exists = prev.some((c) => c.code === cleanCode);
          return exists
            ? prev.map((c) => (c.code === cleanCode ? couponObj : c))
            : [couponObj, ...prev];
        });
      }
      showToast(t.admin.products.updatedToast);
    },
    [isCloudAdmin, showToast, t.admin.products.updatedToast]
  );

  const toggleCouponActive = useCallback(
    (code: string) => {
      const target = coupons.find((c) => c.code === code);
      if (!target) return;
      if (isCloudAdmin && cloudCoupons) {
        updateDoc(doc(db, 'coupons', code), {
          active: !target.active,
          updatedAt: serverTimestamp(),
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `coupons/${code}`));
      } else {
        setLocalCoupons((prev) =>
          prev.map((c) => (c.code === code ? { ...c, active: !c.active } : c))
        );
      }
      showToast(t.admin.products.updatedToast);
    },
    [coupons, isCloudAdmin, cloudCoupons, showToast, t.admin.products.updatedToast]
  );

  const cartSummary = useMemo(() => {
    let itemCount = 0;
    let subtotalTzs = 0;
    let savingsTzs = 0;
    let hasOutOfStockItem = false;
    const snapshots: OrderItemSnapshot[] = [];

    cart.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return;
      itemCount += item.quantity;
      if (!product.inStock) {
        hasOutOfStockItem = true;
      }
      const pricing = calculateLinePricing(
        product.basePrice250g,
        item.size,
        item.quantity,
        product.wholesaleDiscount
      );
      subtotalTzs += pricing.lineFinalTzs;
      savingsTzs += pricing.savingsTzs;
      snapshots.push({
        productId: product.id,
        nameEn: product.nameEn,
        nameSw: product.nameSw,
        size: item.size,
        quantity: item.quantity,
        unitPriceTzs: pricing.unitFinalTzs,
        lineTotalTzs: pricing.lineFinalTzs,
        isWholesale: pricing.isWholesaleApplied,
      });
    });

    const promoDiscountTzs = appliedCoupon
      ? Math.round((subtotalTzs * appliedCoupon.discountPercent) / 100 / 100) * 100
      : 0;
    const subtotalAfterPromoTzs = Math.max(0, subtotalTzs - promoDiscountTzs);

    return {
      itemCount,
      subtotalTzs,
      savingsTzs,
      promoDiscountTzs,
      subtotalAfterPromoTzs,
      hasOutOfStockItem,
      snapshots,
    };
  }, [cart, products, appliedCoupon]);

  const placeOrder = useCallback(
    async (input: PlaceOrderInput): Promise<Order> => {
      const nowIso = new Date().toISOString();
      const snapshots = cartSummary.snapshots;
      const subtotalTzs = cartSummary.subtotalTzs;
      const savingsTzs = cartSummary.savingsTzs;
      const promoDiscountTzs = cartSummary.promoDiscountTzs;
      const promoCode = appliedCoupon?.code;
      const vacuumFeeTzs = input.vacuumPacked ? input.vacuumFeeTzs : 0;
      const deliveryFeeValue = input.deliveryFeeTzs ?? 0;
      const totalTzs = Math.max(0, subtotalTzs - promoDiscountTzs + vacuumFeeTzs + deliveryFeeValue);

      let orderType: OrderType = 'retail';
      if (input.deliveryMethod === 'international_dhl') {
        orderType = 'export';
      } else if (snapshots.some((s) => s.isWholesale || s.size === '5kg' || s.quantity >= 5)) {
        orderType = 'wholesale';
      }

      const orderNum = 1049 + orders.length + Math.floor(Math.random() * 90);
      const orderCode = `SHK-${orderNum}`;
      const orderDocId = `ord-${Date.now()}`;
      const itemsSummary = snapshots
        .map((s) => `${s.nameEn} (${s.size}) x${s.quantity}`)
        .join(', ')
        .slice(0, 600);

      const newOrder: Order = {
        id: orderCode,
        orderCode,
        userId: user?.uid,
        customerName: (input.customerName.trim() || 'Guest Customer').slice(0, 120),
        customerPhone: (input.customerPhone.trim() || '-').slice(0, 40),
        type: orderType,
        deliveryMethod: input.deliveryMethod,
        location: input.location.slice(0, 160),
        paymentMethod: input.paymentMethod,
        vacuumPacked: input.vacuumPacked,
        vacuumFeeTzs,
        deliveryFeeTzs: input.deliveryFeeTzs,
        subtotalTzs,
        savingsTzs,
        promoCode,
        promoDiscountTzs,
        totalTzs,
        currency,
        totalInOrderCurrency: convertTzsToCurrency(totalTzs, currency),
        status: 'pending',
        createdAt: nowIso,
        statusHistory: [{ status: 'pending', at: nowIso }],
        items: snapshots,
        itemCount: snapshots.length,
        itemsSummary,
        isCloudSynced: Boolean(user && user.emailVerified),
        notes: input.notes?.trim() ? input.notes.trim().slice(0, 400) : undefined,
      };

      // If verified signed-in user, commit atomically to Firestore via Master Gate writeBatch
      if (user && user.emailVerified && snapshots.length > 0) {
        const orderPath = `orders/${orderDocId}`;
        try {
          const verifyHash = await computeTrackingHash(orderCode, newOrder.customerPhone);
          const batch = writeBatch(db);
          const orderRef = doc(db, 'orders', orderDocId);
          const orderPayload: Record<string, unknown> = {
            orderCode,
            userId: user.uid,
            customerName: newOrder.customerName,
            customerPhone: newOrder.customerPhone,
            type: newOrder.type,
            deliveryMethod: newOrder.deliveryMethod,
            location: newOrder.location,
            paymentMethod: newOrder.paymentMethod,
            vacuumPacked: newOrder.vacuumPacked,
            vacuumFeeTzs: newOrder.vacuumFeeTzs,
            deliveryFeeTzs: input.deliveryFeeTzs ?? -1,
            subtotalTzs: newOrder.subtotalTzs,
            savingsTzs: newOrder.savingsTzs,
            totalTzs: newOrder.totalTzs,
            currency: newOrder.currency,
            totalInOrderCurrency: newOrder.totalInOrderCurrency,
            status: 'pending',
            itemCount: snapshots.length,
            itemsSummary,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (promoCode) {
            orderPayload.promoCode = promoCode;
            orderPayload.promoDiscountTzs = promoDiscountTzs;
          }
          if (newOrder.notes) {
            orderPayload.notes = newOrder.notes;
          }
          batch.set(orderRef, orderPayload);

          // Zero-PII public lookup doc
          batch.set(doc(db, 'orderTracking', orderCode), {
            orderCode,
            verifyHash,
            status: 'pending',
            type: newOrder.type,
            deliveryMethod: newOrder.deliveryMethod,
            itemCount: snapshots.length,
            totalTzs: newOrder.totalTzs,
            currency: newOrder.currency,
            totalInOrderCurrency: newOrder.totalInOrderCurrency,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          snapshots.forEach((snapItem, idx) => {
            const itemRef = doc(db, 'orders', orderDocId, 'items', `item-${idx}`);
            batch.set(itemRef, {
              userId: user.uid,
              productId: snapItem.productId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128),
              nameEn: snapItem.nameEn.slice(0, 120),
              nameSw: snapItem.nameSw.slice(0, 120),
              size: snapItem.size,
              quantity: snapItem.quantity,
              unitPriceTzs: snapItem.unitPriceTzs,
              lineTotalTzs: snapItem.lineTotalTzs,
              isWholesale: snapItem.isWholesale,
            });
          });

          await batch.commit();
          newOrder.id = orderDocId;
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, orderPath);
        }
      } else {
        setLocalOrders((prev) => [newOrder, ...prev]);
      }

      // Decrement local inventory stock counts if tracked
      if (!cloudProducts) {
        setLocalProducts((prev) =>
          prev.map((prod) => {
            if (typeof prod.stockCount !== 'number') return prod;
            const orderedUnits = snapshots
              .filter((s) => s.productId === prod.id)
              .reduce((sum, s) => sum + s.quantity, 0);
            if (orderedUnits <= 0) return prod;
            const nextCount = Math.max(0, prod.stockCount - orderedUnits);
            return {
              ...prod,
              stockCount: nextCount,
              inStock: nextCount > 0 ? prod.inStock : false,
            };
          })
        );
      }

      setCart([]);
      setVacuumPackedState(false);
      setAppliedCouponCode(null);
      return newOrder;
    },
    [cartSummary, appliedCoupon, currency, orders.length, user, cloudProducts]
  );

  const updateProduct = useCallback(
    (productId: string, updates: Partial<Product>) => {
      if (isCloudAdmin && cloudProducts) {
        const path = `products/${productId}`;
        const allowedUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
        if (typeof updates.basePrice250g === 'number') {
          allowedUpdates.basePrice250g = Math.max(100, Math.round(updates.basePrice250g));
        }
        if (typeof updates.wholesaleDiscount === 'number') {
          allowedUpdates.wholesaleDiscount = Math.max(0, Math.min(40, Math.round(updates.wholesaleDiscount)));
        }
        if (typeof updates.inStock === 'boolean') {
          allowedUpdates.inStock = updates.inStock;
        }
        if (typeof updates.stockCount === 'number') {
          allowedUpdates.stockCount = Math.max(0, Math.min(100000, Math.round(updates.stockCount)));
        }
        if (typeof updates.nameEn === 'string') {
          allowedUpdates.nameEn = updates.nameEn.trim().slice(0, 120);
        }
        if (typeof updates.nameSw === 'string') {
          allowedUpdates.nameSw = updates.nameSw.trim().slice(0, 120);
        }
        if (typeof updates.descriptionEn === 'string') {
          allowedUpdates.descriptionEn = updates.descriptionEn.trim().slice(0, 600);
        }
        if (typeof updates.descriptionSw === 'string') {
          allowedUpdates.descriptionSw = updates.descriptionSw.trim().slice(0, 600);
        }
        if (typeof updates.category === 'string' && updates.category !== 'all') {
          allowedUpdates.category = updates.category.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        }
        if (typeof updates.originEn === 'string') {
          allowedUpdates.originEn = updates.originEn.trim().slice(0, 80);
        }
        if (typeof updates.originSw === 'string') {
          allowedUpdates.originSw = updates.originSw.trim().slice(0, 80);
        }
        if ('badge' in updates) {
          allowedUpdates.badge = updates.badge ?? 'none';
        }
        if (typeof updates.emoji === 'string') {
          allowedUpdates.emoji = updates.emoji.slice(0, 16);
        }
        if (typeof updates.gradientFrom === 'string') {
          allowedUpdates.gradientFrom = updates.gradientFrom;
        }
        if (typeof updates.gradientTo === 'string') {
          allowedUpdates.gradientTo = updates.gradientTo;
        }
        if ('image' in updates) {
          if (updates.image && updates.image.length <= 500000) {
            allowedUpdates.image = updates.image;
          } else {
            allowedUpdates.image = deleteField();
          }
        }
        updateDoc(doc(db, 'products', productId), allowedUpdates).catch((error) => {
          handleFirestoreError(error, OperationType.UPDATE, path);
        });
      } else {
        setLocalProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
        );
      }
      showToast(t.admin.products.updatedToast);
    },
    [isCloudAdmin, cloudProducts, showToast, t.admin.products.updatedToast]
  );

  const deleteProduct = useCallback(
    (productId: string) => {
      if (isCloudAdmin && cloudProducts) {
        const path = `products/${productId}`;
        deleteDoc(doc(db, 'products', productId)).catch((error) => {
          handleFirestoreError(error, OperationType.DELETE, path);
        });
      } else {
        setLocalProducts((prev) => prev.filter((p) => p.id !== productId));
      }
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      showToast(t.admin.products.deletedToast);
    },
    [isCloudAdmin, cloudProducts, showToast, t.admin.products.deletedToast]
  );

  const addProduct = useCallback(
    (
      productInput: Omit<Product, 'id' | 'rating' | 'reviewCount' | 'badge'> & {
        badge?: ProductBadge;
      }
    ): Product => {
      const id = `prod-${Date.now()}`;
      const badgeVal: ProductBadge =
        productInput.badge === undefined ? 'new' : productInput.badge;
      const created: Product = {
        ...productInput,
        id,
        rating: 5.0,
        reviewCount: 1,
        badge: badgeVal,
      };

      if (isCloudAdmin) {
        const path = `products/${id}`;
        const payload: Record<string, unknown> = {
          nameEn: created.nameEn.slice(0, 120),
          nameSw: (created.nameSw || created.nameEn).slice(0, 120),
          descriptionEn: created.descriptionEn.slice(0, 600),
          descriptionSw: created.descriptionSw.slice(0, 600),
          category: created.category,
          basePrice250g: Math.max(100, Math.round(created.basePrice250g)),
          wholesaleDiscount: Math.max(0, Math.min(40, Math.round(created.wholesaleDiscount))),
          inStock: created.inStock,
          ...(typeof created.stockCount === 'number'
            ? { stockCount: Math.max(0, Math.min(100000, Math.round(created.stockCount))) }
            : {}),
          rating: created.rating,
          reviewCount: created.reviewCount,
          badge: badgeVal ?? 'none',
          emoji: created.emoji.slice(0, 16),
          gradientFrom: created.gradientFrom,
          gradientTo: created.gradientTo,
          originEn: created.originEn.slice(0, 80),
          originSw: created.originSw.slice(0, 80),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (created.image && created.image.length <= 500000) {
          payload.image = created.image;
        }
        setDoc(doc(db, 'products', id), payload).catch((error) => {
          handleFirestoreError(error, OperationType.CREATE, path);
        });
      } else {
        setLocalProducts((prev) => [created, ...prev]);
      }

      showToast(t.admin.addModal.createdToast);
      return created;
    },
    [isCloudAdmin, showToast, t.admin.addModal.createdToast]
  );

  const addCategory = useCallback(
    (input: { nameEn: string; nameSw: string }): CategoryItem => {
      const cleanEn = input.nameEn.trim().slice(0, 80);
      const cleanSw = (input.nameSw.trim() || cleanEn).slice(0, 80);
      let baseSlug = cleanEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 36);
      if (!baseSlug || baseSlug === 'all') {
        baseSlug = `cat_${Date.now()}`;
      }
      const id = categories.some((c) => c.id === baseSlug)
        ? `${baseSlug}_${Date.now().toString().slice(-4)}`
        : baseSlug;

      const created: CategoryItem = {
        id,
        nameEn: cleanEn || id,
        nameSw: cleanSw || cleanEn || id,
      };

      if (isCloudAdmin) {
        if (!cloudCategories) {
          const batch = writeBatch(db);
          localCategories.forEach((cat) => {
            batch.set(doc(db, 'categories', cat.id), {
              id: cat.id,
              nameEn: cat.nameEn.slice(0, 80),
              nameSw: cat.nameSw.slice(0, 80),
              updatedAt: serverTimestamp(),
            });
          });
          batch.set(doc(db, 'categories', created.id), {
            ...created,
            updatedAt: serverTimestamp(),
          });
          batch.commit().catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `categories/${created.id}`)
          );
        } else {
          setDoc(doc(db, 'categories', created.id), {
            ...created,
            updatedAt: serverTimestamp(),
          }).catch((err) =>
            handleFirestoreError(err, OperationType.CREATE, `categories/${created.id}`)
          );
        }
      } else {
        setLocalCategories((prev) => [...prev, created]);
      }

      showToast(t.admin.products.catSavedToast);
      return created;
    },
    [
      categories,
      cloudCategories,
      isCloudAdmin,
      localCategories,
      showToast,
      t.admin.products.catSavedToast,
    ]
  );

  const updateCategory = useCallback(
    (categoryId: string, updates: { nameEn: string; nameSw: string }) => {
      const cleanEn = updates.nameEn.trim().slice(0, 80);
      const cleanSw = (updates.nameSw.trim() || cleanEn).slice(0, 80);
      if (!cleanEn || categoryId === 'all') return;

      if (isCloudAdmin && cloudCategories) {
        setDoc(doc(db, 'categories', categoryId), {
          id: categoryId,
          nameEn: cleanEn,
          nameSw: cleanSw,
          updatedAt: serverTimestamp(),
        }).catch((err) =>
          handleFirestoreError(err, OperationType.UPDATE, `categories/${categoryId}`)
        );
      } else {
        setLocalCategories((prev) =>
          prev.map((c) => (c.id === categoryId ? { ...c, nameEn: cleanEn, nameSw: cleanSw } : c))
        );
      }
      showToast(t.admin.products.catSavedToast);
    },
    [cloudCategories, isCloudAdmin, showToast, t.admin.products.catSavedToast]
  );

  const deleteCategory = useCallback(
    (categoryId: string): boolean => {
      if (categoryId === 'all') return false;
      const inUse = products.some((p) => p.category === categoryId);
      if (inUse) {
        showToast(t.admin.products.catInUse);
        return false;
      }
      if (isCloudAdmin && cloudCategories) {
        deleteDoc(doc(db, 'categories', categoryId)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`)
        );
      } else {
        setLocalCategories((prev) => prev.filter((c) => c.id !== categoryId));
      }
      showToast(t.admin.products.catDeletedToast);
      return true;
    },
    [
      cloudCategories,
      isCloudAdmin,
      products,
      showToast,
      t.admin.products.catDeletedToast,
      t.admin.products.catInUse,
    ]
  );

  const updateOrderStatus = useCallback(
    (orderId: string, nextStatus: OrderStatus) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target || target.status === nextStatus) return;

      if (target.isCloudSynced && isCloudAdmin) {
        const path = `orders/${orderId}`;
        const updates: Record<string, unknown> = {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        };
        if (nextStatus === 'packed') updates.packedAt = serverTimestamp();
        if (nextStatus === 'dispatched') updates.dispatchedAt = serverTimestamp();
        updateDoc(doc(db, 'orders', orderId), updates).catch((error) => {
          handleFirestoreError(error, OperationType.UPDATE, path);
        });
        if (target.orderCode) {
          updateDoc(doc(db, 'orderTracking', target.orderCode), updates).catch(() => {
            // Older orders may not have a tracking doc; ignore safely
          });
        }
      } else {
        const nowIso = new Date().toISOString();
        setLocalOrders((prev) =>
          prev.map((order) => {
            if (order.id !== orderId) return order;
            const alreadyLogged = order.statusHistory.some((h) => h.status === nextStatus);
            const nextHistory = alreadyLogged
              ? order.statusHistory.map((h) =>
                  h.status === nextStatus ? { ...h, at: nowIso } : h
                )
              : [...order.statusHistory, { status: nextStatus, at: nowIso }];
            return {
              ...order,
              status: nextStatus,
              statusHistory: nextHistory,
            };
          })
        );
      }
      showToast(t.admin.products.updatedToast);
    },
    [orders, isCloudAdmin, showToast, t.admin.products.updatedToast]
  );

  const resetDemoData = useCallback(() => {
    setLocalProducts(SEED_PRODUCTS);
    setLocalCategories(SEED_CATEGORIES);
    setLocalOrders(SEED_ORDERS);
    setCart([]);
    setVacuumPackedState(false);
    safeWriteStorage(STORAGE_KEYS.products, SEED_PRODUCTS);
    safeWriteStorage(STORAGE_KEYS.categories, SEED_CATEGORIES);
    safeWriteStorage(STORAGE_KEYS.orders, SEED_ORDERS);
    safeWriteStorage(STORAGE_KEYS.cart, []);
    showToast(t.admin.resetDone);
  }, [showToast, t.admin.resetDone]);

  const value: StoreContextValue = {
    products,
    categories,
    orders,
    coupons,
    cart,
    wishlist,
    language,
    currency,
    vacuumPacked,
    appliedCoupon,
    adminMode,
    adminUnlocked,
    previewMode,
    toastMessage,
    user,
    authReady,
    isCloudAdmin,
    cloudCatalogSynced: cloudProducts !== null,
    t,
    getCategoryLabel,
    setLanguage,
    setCurrency,
    setVacuumPacked,
    setAdminMode,
    unlockAdmin,
    setPreviewMode,
    showToast,
    toggleWishlist,
    isInWishlist,
    signInWithGoogle,
    signOutUser,
    seedCatalogToCloud,
    loadOrderItems,
    trackOrderByCode,
    applyPromoCode,
    removePromoCode,
    addBundleToCart,
    upsertCoupon,
    toggleCouponActive,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    placeOrder,
    updateProduct,
    deleteProduct,
    addProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    updateOrderStatus,
    resetDemoData,
    cartSummary,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
}
