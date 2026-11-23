import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Box,
  Check,
  ClipboardCopy,
  Clock,
  Cloud,
  Globe,
  KeyRound,
  LogIn,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingBag,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AdminTab, CategoryId, Order, OrderItemSnapshot, OrderStatus, OrderType, Product } from '../../types';
import {
  calculateLinePricing,
  formatPrice,
  formatRawAmount,
  getDisplayProductName,
  USD_EXCHANGE_RATE,
} from '../../utils/pricing';
import { ProductArtwork } from '../common/ProductArtwork';
import { AddProductModal } from './AddProductModal';

interface AdminViewProps {
  isMobileLayout: boolean;
  isScopedFrame?: boolean;
}

const formatTimestamp = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

export const AdminView: React.FC<AdminViewProps> = ({
  isMobileLayout,
  isScopedFrame = false,
}) => {
  const {
    products,
    orders,
    coupons,
    language,
    currency,
    adminUnlocked,
    isCloudAdmin,
    cloudCatalogSynced,
    setLanguage,
    setCurrency,
    setAdminMode,
    unlockAdmin,
    signInWithGoogle,
    seedCatalogToCloud,
    loadOrderItems,
    upsertCoupon,
    toggleCouponActive,
    updateProduct,
    updateOrderStatus,
    resetDemoData,
    showToast,
    t,
  } = useStore();

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState<CategoryId>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPct, setNewCouponPct] = useState('10');

  const [orderFilter, setOrderFilter] = useState<'all' | OrderType>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadedDetailItems, setLoadedDetailItems] = useState<OrderItemSnapshot[]>([]);

  React.useEffect(() => {
    if (!selectedOrder) {
      setLoadedDetailItems([]);
      return;
    }
    if (selectedOrder.items.length > 0) {
      setLoadedDetailItems(selectedOrder.items);
      return;
    }
    let active = true;
    void loadOrderItems(selectedOrder.id).then((items) => {
      if (active) setLoadedDetailItems(items);
    });
    return () => {
      active = false;
    };
  }, [selectedOrder, loadOrderItems]);

  // Track inline draft edits & validation errors per product
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, string>>({});
  const [productErrors, setProductErrors] = useState<Record<string, string>>({});

  // KPIs derived directly from live orders list
  const kpis = useMemo(() => {
    let salesTzs = 0;
    let wholesaleCount = 0;
    let exportCount = 0;
    let pendingCount = 0;

    orders.forEach((order) => {
      const orderTzs =
        order.currency === 'USD'
          ? Math.round(order.totalInOrderCurrency * USD_EXCHANGE_RATE)
          : order.totalTzs;
      salesTzs += orderTzs;
      if (order.type === 'wholesale') wholesaleCount += 1;
      if (order.type === 'export') exportCount += 1;
      if (order.status === 'pending') pendingCount += 1;
    });

    return { salesTzs, wholesaleCount, exportCount, pendingCount };
  }, [orders]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (productCategory !== 'all' && p.category !== productCategory) return false;
      if (q) {
        return (
          p.nameEn.toLowerCase().includes(q) ||
          p.nameSw.toLowerCase().includes(q) ||
          t.categories[p.category].toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, productSearch, productCategory, t.categories]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter((o) => o.type === orderFilter);
  }, [orders, orderFilter]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === '1234') {
      setPinError(false);
      unlockAdmin();
    } else {
      setPinError(true);
    }
  };

  const handlePriceCommit = (product: Product, rawValue: string) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setProductErrors((prev) => ({ ...prev, [product.id]: t.admin.products.invalidPrice }));
      return;
    }
    setProductErrors((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    if (Math.round(parsed) !== product.basePrice250g) {
      updateProduct(product.id, { basePrice250g: Math.round(parsed) });
    }
  };

  const handleDiscountCommit = (product: Product, rawValue: string) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 40) {
      setProductErrors((prev) => ({ ...prev, [product.id]: t.admin.products.invalidDiscount }));
      return;
    }
    setProductErrors((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    if (Math.round(parsed) !== product.wholesaleDiscount) {
      updateProduct(product.id, { wholesaleDiscount: Math.round(parsed) });
    }
  };

  const copyOrderSummary = async (order: Order) => {
    const itemsText = order.items
      .map(
        (it) =>
          `- ${language === 'sw' ? it.nameSw : it.nameEn} (${it.size}) x${it.quantity}: ${formatPrice(
            it.lineTotalTzs,
            order.currency
          )}`
      )
      .join('\n');
    const summary = [
      `Order #${order.id} [${t.admin.orders.types[order.type]}]`,
      `Customer: ${order.customerName} (${order.customerPhone})`,
      `Location: ${order.location}`,
      `Payment: ${t.checkout.paymentOptions[order.paymentMethod]}`,
      `Vacuum Packed: ${order.vacuumPacked ? 'Yes' : 'No'}`,
      `Status: ${t.admin.orders.statuses[order.status]}`,
      `Items:\n${itemsText}`,
      `Total: ${formatRawAmount(order.totalInOrderCurrency, order.currency)}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      showToast(t.admin.orders.copiedToast);
    } catch {
      showToast(t.admin.orders.copiedToast);
    }
  };

  const statusBadgeClass = (status: OrderStatus) => {
    if (status === 'pending') return 'bg-amber-100 text-amber-900 border-amber-200';
    if (status === 'packed') return 'bg-sky-100 text-sky-900 border-sky-200';
    return 'bg-emerald-100 text-emerald-900 border-emerald-200';
  };

  const typeBadgeClass = (type: OrderType) => {
    if (type === 'wholesale') return 'bg-[#F4A261]/25 text-[#2B1B17]';
    if (type === 'export') return 'bg-[#2B1B17] text-[#F4A261]';
    return 'bg-[#FAF7F2] text-[#2B1B17]/80 border border-[#2B1B17]/15';
  };

  // Optional Demo PIN Lock Screen
  if (!adminUnlocked) {
    return (
      <div
        className={`${
          isScopedFrame ? 'h-full overflow-y-auto' : 'min-h-screen'
        } bg-[#FAF7F2] flex flex-col items-center justify-center p-5`}
      >
        <div className="w-full max-w-sm bg-white rounded-3xl border border-[#2B1B17]/10 p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-[#F4A261]/25 text-[#2B1B17] text-[11px] font-bold">
              {t.admin.pinBadge}
            </span>
            <button
              type="button"
              onClick={() => setAdminMode(false)}
              className="text-xs font-semibold text-[#D95D39] hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t.nav.backToStore}
            </button>
          </div>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#2B1B17] text-[#F4A261] flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-[#2B1B17]">{t.admin.pinTitle}</h1>
            <p className="text-xs text-[#2B1B17]/70 leading-relaxed">{t.admin.pinSubtitle}</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder={t.admin.pinPlaceholder}
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            />

            {pinError && (
              <p className="text-xs font-semibold text-red-600 text-center">{t.admin.pinError}</p>
            )}

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white font-semibold text-sm active:scale-95 transition-transform"
            >
              {t.admin.pinUnlock}
            </button>

            <button
              type="button"
              onClick={() => {
                setPinInput('1234');
                setPinError(false);
                unlockAdmin();
              }}
              className="w-full min-h-[44px] rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#2B1B17]/12 text-[#2B1B17] font-semibold text-xs"
            >
              {t.admin.pinQuickFill}
            </button>

            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="w-full min-h-[44px] rounded-xl bg-[#2B1B17] hover:bg-[#3F2923] text-white font-semibold text-xs inline-flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-[#F4A261]" />
              <span>{t.cloudAuth.adminGoogleSignIn}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const adminTabs: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: t.admin.tabs.dashboard, icon: BarChart3 },
    { id: 'products', label: t.admin.tabs.products, icon: Box },
    { id: 'orders', label: t.admin.tabs.orders, icon: ShoppingBag },
  ];

  // Dashboard Content
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10">
          <span className="text-xs text-[#2B1B17]/65 font-medium">{t.admin.kpi.todaySales}</span>
          <div className="font-display font-bold text-lg md:text-xl text-[#D95D39] tabular-nums mt-1">
            {formatPrice(kpis.salesTzs, currency)}
          </div>
          <span className="text-[11px] text-[#2B1B17]/50">{t.admin.kpi.allTimeNote}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10">
          <span className="text-xs text-[#2B1B17]/65 font-medium">
            {t.admin.kpi.wholesaleOrders}
          </span>
          <div className="font-display font-bold text-lg md:text-xl text-[#2B1B17] tabular-nums mt-1">
            {kpis.wholesaleCount}
          </div>
          <span className="text-[11px] text-[#2B1B17]/50">5kg / 5+ bulk</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10">
          <span className="text-xs text-[#2B1B17]/65 font-medium">
            {t.admin.kpi.exportOrders}
          </span>
          <div className="font-display font-bold text-lg md:text-xl text-[#2B1B17] tabular-nums mt-1">
            {kpis.exportCount}
          </div>
          <span className="text-[11px] text-[#2B1B17]/50">DHL / EMS</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10">
          <span className="text-xs text-[#2B1B17]/65 font-medium">
            {t.admin.kpi.pendingOrders}
          </span>
          <div className="font-display font-bold text-lg md:text-xl text-amber-700 tabular-nums mt-1">
            {kpis.pendingCount}
          </div>
          <span className="text-[11px] text-[#2B1B17]/50">{t.admin.orders.statuses.pending}</span>
        </div>
      </div>

      {/* Quick Recent Orders Preview */}
      <div className="bg-white rounded-2xl border border-[#2B1B17]/10 p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-base text-[#2B1B17]">
              {t.admin.orders.title}
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.admin.orders.liveBadge}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="text-xs font-semibold text-[#D95D39] hover:underline"
          >
            {t.admin.orders.filters.all} ({orders.length})
          </button>
        </div>

        <div className="divide-y divide-[#2B1B17]/8">
          {orders.slice(0, 4).map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedOrder(order)}
              className="w-full py-3 flex items-center justify-between gap-3 text-left hover:bg-[#FAF7F2]/60 rounded-xl px-2 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-[#2B1B17]">#{order.id}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${typeBadgeClass(order.type)}`}>
                    {t.admin.orders.types[order.type]}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#2B1B17] truncate mt-0.5">
                  {order.customerName} · {order.location}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-bold text-xs text-[#D95D39] tabular-nums">
                  {formatRawAmount(order.totalInOrderCurrency, order.currency)}
                </div>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${statusBadgeClass(
                    order.status
                  )}`}
                >
                  {t.admin.orders.statuses[order.status]}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Promo Codes / Coupons Manager */}
      <div className="bg-white rounded-2xl border border-[#2B1B17]/10 p-4 md:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-base text-[#2B1B17] inline-flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#D95D39]" />
            <span>{t.conversion.couponsAdminTitle}</span>
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newCouponCode}
            onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
            placeholder={t.conversion.addCouponCode}
            className="flex-1 min-w-[140px] min-h-[40px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
          />
          <input
            type="number"
            min={1}
            max={50}
            value={newCouponPct}
            onChange={(e) => setNewCouponPct(e.target.value)}
            aria-label={t.conversion.addCouponPct}
            className="w-24 min-h-[40px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 font-mono text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
          />
          <button
            type="button"
            onClick={() => {
              const code = newCouponCode.trim().toUpperCase();
              const pct = Math.max(1, Math.min(50, Math.round(Number(newCouponPct) || 10)));
              if (!code) return;
              upsertCoupon({
                code,
                discountPercent: pct,
                descriptionEn: `${pct}% discount code`,
                descriptionSw: `Punguzo la ${pct}%`,
                active: true,
              });
              setNewCouponCode('');
            }}
            className="min-h-[40px] px-4 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            {t.conversion.addCouponBtn}
          </button>
        </div>

        <div className="divide-y divide-[#2B1B17]/8">
          {coupons.map((coupon) => (
            <div
              key={coupon.code}
              className="py-2.5 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#2B1B17]">{coupon.code}</span>
                  <span className="font-semibold text-[#D95D39] tabular-nums">
                    -{coupon.discountPercent}%
                  </span>
                </div>
                <p className="text-[11px] text-[#2B1B17]/60">
                  {language === 'sw' ? coupon.descriptionSw : coupon.descriptionEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleCouponActive(coupon.code)}
                className={`min-h-[34px] px-3 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 ${
                  coupon.active
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-[#2B1B17]/10 text-[#2B1B17]/65'
                }`}
              >
                {coupon.active ? t.product.inStock : t.conversion.promoRemove}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Quick Price & Stock Manager
  const renderProductsManager = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display font-bold text-lg text-[#2B1B17]">
          {t.admin.products.title}
        </h2>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="min-h-[44px] px-4 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>{t.admin.products.addProduct}</span>
        </button>
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#2B1B17]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder={t.admin.products.searchPlaceholder}
            className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-white border border-[#2B1B17]/12 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
          />
        </div>

        <select
          value={productCategory}
          onChange={(e) => setProductCategory(e.target.value as CategoryId)}
          className="min-h-[42px] px-3 rounded-xl bg-white border border-[#2B1B17]/12 text-xs font-semibold"
        >
          <option value="all">{t.categories.all}</option>
          <option value="ubuyu_achari">{t.categories.ubuyu_achari}</option>
          <option value="nuts_seeds">{t.categories.nuts_seeds}</option>
          <option value="spices_masalas">{t.categories.spices_masalas}</option>
          <option value="dried_fruits_oils">{t.categories.dried_fruits_oils}</option>
        </select>
      </div>

      {/* Mobile Card List vs Desktop Table */}
      {isMobileLayout ? (
        <div className="space-y-3">
          {filteredProducts.map((prod) => {
            const p500 = calculateLinePricing(prod.basePrice250g, '500g', 1, prod.wholesaleDiscount);
            const p1kg = calculateLinePricing(prod.basePrice250g, '1kg', 1, prod.wholesaleDiscount);
            const p5kg = calculateLinePricing(prod.basePrice250g, '5kg', 1, prod.wholesaleDiscount);
            const draftPrice = priceDrafts[prod.id] ?? String(prod.basePrice250g);
            const draftDisc = discountDrafts[prod.id] ?? String(prod.wholesaleDiscount);
            const err = productErrors[prod.id];

            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl p-3.5 border border-[#2B1B17]/10 space-y-3"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
                      <ProductArtwork product={prod} language={language} compact className="w-full h-full" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-sm text-[#2B1B17] truncate">
                        {getDisplayProductName(prod, language)}
                      </h3>
                      <span className="text-[11px] text-[#2B1B17]/60">
                        {t.categories[prod.category]}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateProduct(prod.id, { inStock: !prod.inStock })}
                    className={`min-h-[36px] px-2.5 rounded-lg text-[11px] font-bold shrink-0 ${
                      prod.inStock
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {prod.inStock ? t.product.inStock : t.product.outOfStock}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#2B1B17]/65 mb-1">
                      {t.admin.products.basePrice}
                    </label>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      value={draftPrice}
                      onChange={(e) =>
                        setPriceDrafts((prev) => ({ ...prev, [prod.id]: e.target.value }))
                      }
                      onBlur={(e) => handlePriceCommit(prod, e.target.value)}
                      className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 font-mono text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#2B1B17]/65 mb-1">
                      {t.admin.products.wholesalePct}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={draftDisc}
                      onChange={(e) =>
                        setDiscountDrafts((prev) => ({ ...prev, [prod.id]: e.target.value }))
                      }
                      onBlur={(e) => handleDiscountCommit(prod, e.target.value)}
                      className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 font-mono text-xs tabular-nums"
                    />
                  </div>
                </div>

                {err && <p className="text-[11px] font-semibold text-red-600">{err}</p>}

                <div className="text-[11px] text-[#2B1B17]/70 bg-[#FAF7F2] rounded-xl p-2 flex flex-wrap justify-between gap-2 tabular-nums">
                  <span>500g: {formatPrice(p500.unitFinalTzs, currency)}</span>
                  <span>1kg: {formatPrice(p1kg.unitFinalTzs, currency)}</span>
                  <span className="font-bold text-[#D95D39]">
                    5kg: {formatPrice(p5kg.unitFinalTzs, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#2B1B17]/10 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2B1B17]/10 text-[11px] font-bold text-[#2B1B17]/65 bg-[#FAF7F2]/60">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3">{t.admin.products.basePrice}</th>
                <th className="py-3 px-3">{t.admin.products.wholesalePct}</th>
                <th className="py-3 px-3">{t.admin.products.livePreview}</th>
                <th className="py-3 px-4 text-right">{t.admin.products.stockStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B1B17]/8 text-xs">
              {filteredProducts.map((prod) => {
                const p500 = calculateLinePricing(
                  prod.basePrice250g,
                  '500g',
                  1,
                  prod.wholesaleDiscount
                );
                const p1kg = calculateLinePricing(
                  prod.basePrice250g,
                  '1kg',
                  1,
                  prod.wholesaleDiscount
                );
                const p5kg = calculateLinePricing(
                  prod.basePrice250g,
                  '5kg',
                  1,
                  prod.wholesaleDiscount
                );
                const draftPrice = priceDrafts[prod.id] ?? String(prod.basePrice250g);
                const draftDisc = discountDrafts[prod.id] ?? String(prod.wholesaleDiscount);
                const err = productErrors[prod.id];

                return (
                  <tr key={prod.id} className="hover:bg-[#FAF7F2]/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                          <ProductArtwork
                            product={prod}
                            language={language}
                            compact
                            className="w-full h-full"
                          />
                        </div>
                        <div>
                          <div className="font-display font-bold text-[#2B1B17]">
                            {getDisplayProductName(prod, language)}
                          </div>
                          <div className="text-[11px] text-[#2B1B17]/55">
                            {t.categories[prod.category]}
                          </div>
                          {err && <div className="text-[11px] font-semibold text-red-600">{err}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min={100}
                        step={100}
                        value={draftPrice}
                        onChange={(e) =>
                          setPriceDrafts((prev) => ({ ...prev, [prod.id]: e.target.value }))
                        }
                        onBlur={(e) => handlePriceCommit(prod, e.target.value)}
                        className="w-28 h-9 px-2.5 rounded-lg bg-[#FAF7F2] border border-[#2B1B17]/15 font-mono text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                      />
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={draftDisc}
                        onChange={(e) =>
                          setDiscountDrafts((prev) => ({ ...prev, [prod.id]: e.target.value }))
                        }
                        onBlur={(e) => handleDiscountCommit(prod, e.target.value)}
                        className="w-20 h-9 px-2.5 rounded-lg bg-[#FAF7F2] border border-[#2B1B17]/15 font-mono text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                      />
                    </td>

                    <td className="py-3 px-3 tabular-nums text-[11px] text-[#2B1B17]/75">
                      <div>500g: {formatPrice(p500.unitFinalTzs, currency)}</div>
                      <div>1kg: {formatPrice(p1kg.unitFinalTzs, currency)}</div>
                      <div className="font-semibold text-[#D95D39]">
                        5kg: {formatPrice(p5kg.unitFinalTzs, currency)}{' '}
                        <span className="line-through text-[#2B1B17]/40 font-normal">
                          {formatPrice(p5kg.unitRetailTzs, currency)}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => updateProduct(prod.id, { inStock: !prod.inStock })}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                          prod.inStock
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {prod.inStock ? t.product.inStock : t.product.outOfStock}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Live Incoming Orders Tracker
  const renderOrdersTracker = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display font-bold text-lg text-[#2B1B17]">
            {t.admin.orders.title}
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t.admin.orders.liveBadge}
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#2B1B17]/10 overflow-x-auto">
          {(['all', 'retail', 'wholesale', 'export'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setOrderFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                orderFilter === f
                  ? 'bg-[#2B1B17] text-white'
                  : 'text-[#2B1B17]/70 hover:text-[#2B1B17]'
              }`}
            >
              {t.admin.orders.filters[f]}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#2B1B17]/10 p-8 text-center">
          <Package className="w-8 h-8 text-[#D95D39] mx-auto mb-2" />
          <h3 className="font-display font-bold text-base text-[#2B1B17]">
            {t.admin.orders.emptyTitle}
          </h3>
          <p className="text-xs text-[#2B1B17]/65 mt-1">{t.admin.orders.emptyBody}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statuses: OrderStatus[] = ['pending', 'packed', 'dispatched'];
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#2B1B17]/10 p-4 space-y-3 hover:border-[#D95D39]/40 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="text-left group"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-[#2B1B17] group-hover:text-[#D95D39]">
                        #{order.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${typeBadgeClass(
                          order.type
                        )}`}
                      >
                        {t.admin.orders.types[order.type]}
                      </span>
                      {order.vacuumPacked && (
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#2B1B17]/15 text-[10px] font-bold text-[#2B1B17]">
                          {t.admin.orders.vacuumYes}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-[#2B1B17] mt-1">
                      {order.customerName} · {order.location}
                    </div>
                    <div className="text-[11px] text-[#2B1B17]/60 mt-0.5">
                      {order.items.length} {t.admin.orders.itemsCount} ·{' '}
                      {t.checkout.paymentOptions[order.paymentMethod]} ·{' '}
                      {formatTimestamp(order.createdAt)}
                    </div>
                  </button>

                  <div className="text-right">
                    <div className="font-display font-bold text-base text-[#D95D39] tabular-nums">
                      {formatRawAmount(order.totalInOrderCurrency, order.currency)}
                    </div>
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${statusBadgeClass(
                        order.status
                      )}`}
                    >
                      {t.admin.orders.statuses[order.status]}
                    </span>
                  </div>
                </div>

                {/* Status Stepper Buttons */}
                <div className="pt-2 border-t border-[#2B1B17]/8 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {statuses.map((st) => {
                      const active = order.status === st;
                      const loggedEntry = order.statusHistory.find((h) => h.status === st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => updateOrderStatus(order.id, st)}
                          className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-95 ${
                            active
                              ? 'bg-[#2B1B17] text-white'
                              : loggedEntry
                                ? 'bg-[#F4A261]/20 text-[#2B1B17]'
                                : 'bg-[#FAF7F2] text-[#2B1B17]/65 hover:bg-[#2B1B17]/10'
                          }`}
                        >
                          {active && <Check className="w-3.5 h-3.5 text-[#F4A261]" />}
                          <span>{t.admin.orders.statuses[st]}</span>
                          {loggedEntry && (
                            <span className="text-[10px] opacity-75 font-mono">
                              {formatTimestamp(loggedEntry.at)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="text-xs font-semibold text-[#D95D39] hover:underline min-h-[36px] px-2"
                  >
                    {t.product.quickView}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Banner shared across desktop & mobile admin
  const adminBanner = (
    <div className="no-print bg-[#2B1B17] text-[#FAF7F2] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2 text-xs font-bold">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
            isCloudAdmin ? 'bg-emerald-400 text-[#2B1B17]' : 'bg-[#F4A261] text-[#2B1B17]'
          }`}
        >
          {isCloudAdmin ? t.cloudAuth.cloudSynced : 'DEMO'}
        </span>
        <span>{isCloudAdmin ? 'shakazulu-store' : t.admin.banner}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {isCloudAdmin && !cloudCatalogSynced && (
          <button
            type="button"
            onClick={() => void seedCatalogToCloud()}
            className="px-2.5 py-1 rounded-lg bg-[#F4A261] text-[#2B1B17] text-[11px] font-bold inline-flex items-center gap-1"
          >
            <Cloud className="w-3 h-3" />
            <span>{t.cloudAuth.seedCatalogBtn}</span>
          </button>
        )}

        {!isCloudAdmin && (
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="px-2.5 py-1 rounded-lg bg-white/12 hover:bg-white/20 text-[11px] font-semibold inline-flex items-center gap-1"
          >
            <LogIn className="w-3 h-3 text-[#F4A261]" />
            <span>{t.cloudAuth.signInGoogle}</span>
          </button>
        )}

        {/* EN/SW & TZS/USD inside Admin */}
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold inline-flex items-center gap-1"
        >
          <Globe className="w-3 h-3" />
          <span className="uppercase">{language}</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrency(currency === 'TZS' ? 'USD' : 'TZS')}
          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold"
        >
          {currency}
        </button>

        <button
          type="button"
          onClick={resetDemoData}
          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span className={isMobileLayout ? 'hidden sm:inline' : ''}>{t.admin.resetDemo}</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminMode(false)}
          className="px-3 py-1 rounded-lg bg-[#D95D39] hover:bg-[#C14C2B] text-white text-[11px] font-semibold inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>{t.nav.backToStore}</span>
        </button>
      </div>
    </div>
  );

  // Order Detail Modal / Sheet
  const activeOrderDetail = selectedOrder
    ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder
    : null;

  const orderDetailOverlay = activeOrderDetail && (
    <div
      className={`${isScopedFrame ? 'absolute' : 'fixed'} inset-0 z-50 flex ${
        isMobileLayout ? 'items-end' : 'items-center justify-center p-4'
      } bg-black/55 backdrop-blur-xs print:static print:bg-white print:p-0 print:block`}
      role="dialog"
      aria-modal="true"
      aria-label={`Order #${activeOrderDetail.id}`}
    >
      <div className="no-print absolute inset-0" onClick={() => setSelectedOrder(null)} />
      <div
        className={`relative z-10 bg-white w-full flex flex-col overflow-hidden shadow-2xl print:shadow-none print:max-h-none print:max-w-none print:rounded-none ${
          isMobileLayout
            ? 'rounded-t-3xl max-h-[88%] animate-sheet-up'
            : 'rounded-2xl max-w-lg max-h-[88vh] animate-modal-in border border-[#2B1B17]/10'
        }`}
      >
        <div className="px-5 py-4 border-b border-[#2B1B17]/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-base text-[#2B1B17]">
              #{activeOrderDetail.id}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${typeBadgeClass(
                activeOrderDetail.type
              )}`}
            >
              {t.admin.orders.types[activeOrderDetail.type]}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedOrder(null)}
            aria-label="Close"
            className="w-9 h-9 rounded-full hover:bg-[#FAF7F2] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="bg-[#FAF7F2] rounded-2xl p-3.5 space-y-1.5">
            <div className="font-bold text-sm text-[#2B1B17]">
              {activeOrderDetail.customerName}
            </div>
            <div className="text-[#2B1B17]/75">{activeOrderDetail.customerPhone}</div>
            <div className="flex items-center gap-1.5 text-[#2B1B17]/80">
              <Truck className="w-3.5 h-3.5 text-[#D95D39]" />
              <span>{activeOrderDetail.location}</span>
            </div>
            <div className="text-[#2B1B17]/70">
              {t.checkout.paymentOptions[activeOrderDetail.paymentMethod]}
              {activeOrderDetail.vacuumPacked && ` · ${t.admin.orders.vacuumYes}`}
            </div>
          </div>

          <div className="space-y-2">
            {loadedDetailItems.length > 0 ? (
              loadedDetailItems.map((item, idx) => (
                <div
                  key={`${item.productId}-${idx}`}
                  className="flex items-center justify-between py-1.5 border-b border-[#2B1B17]/8"
                >
                  <div>
                    <span className="font-semibold text-[#2B1B17]">
                      {language === 'sw' ? item.nameSw : item.nameEn}
                    </span>
                    <span className="text-[#2B1B17]/60 ml-1.5">
                      ({item.size}) × {item.quantity}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-[#2B1B17] tabular-nums">
                    {formatPrice(item.lineTotalTzs, activeOrderDetail.currency)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[#2B1B17]/75 py-1.5 border-b border-[#2B1B17]/8">
                {activeOrderDetail.itemsSummary || '-'}
              </p>
            )}
            {activeOrderDetail.promoCode && (activeOrderDetail.promoDiscountTzs ?? 0) > 0 && (
              <div className="flex items-center justify-between pt-1.5 text-emerald-700 font-semibold">
                <span>
                  {t.conversion.promoDiscount} ({activeOrderDetail.promoCode})
                </span>
                <span className="tabular-nums">
                  -{formatPrice(activeOrderDetail.promoDiscountTzs ?? 0, activeOrderDetail.currency)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 font-display font-bold text-sm">
              <span>{t.cart.total}</span>
              <span className="text-[#D95D39] tabular-nums">
                {formatRawAmount(
                  activeOrderDetail.totalInOrderCurrency,
                  activeOrderDetail.currency
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[#2B1B17]">{t.admin.orders.timeline}</h4>
            <div className="space-y-1.5">
              {activeOrderDetail.statusHistory.map((h) => (
                <div key={h.status} className="flex items-center justify-between text-[#2B1B17]/75">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-[#D95D39]" />
                    {t.admin.orders.statuses[h.status]}
                  </span>
                  <span className="font-mono">{formatTimestamp(h.at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="no-print p-4 border-t border-[#2B1B17]/10 bg-white pb-safe shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => copyOrderSummary(activeOrderDetail)}
            className="w-full min-h-[44px] rounded-xl bg-[#2B1B17] hover:bg-[#3F2923] text-white font-semibold text-xs inline-flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <ClipboardCopy className="w-4 h-4" />
            <span>{t.admin.orders.copySummary}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full min-h-[44px] rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#2B1B17]/15 text-[#2B1B17] font-semibold text-xs inline-flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Printer className="w-4 h-4 text-[#D95D39]" />
            <span>{t.conversion.printReceipt}</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile Admin Layout
  if (isMobileLayout) {
    return (
      <div
        className={`relative flex flex-col bg-[#FAF7F2] text-[#2B1B17] ${
          isScopedFrame ? 'h-full overflow-hidden' : 'min-h-screen'
        }`}
      >
        {adminBanner}

        <main className={`flex-1 overflow-y-auto p-3.5 pb-24 ${activeOrderDetail ? 'no-print' : ''}`}>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'products' && renderProductsManager()}
          {activeTab === 'orders' && renderOrdersTracker()}
        </main>

        {/* Mobile Admin Bottom Tabs */}
        <nav
          aria-label="Admin Navigation"
          className={`no-print ${
            isScopedFrame ? 'absolute' : 'fixed'
          } bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#2B1B17]/10 grid grid-cols-3 items-center h-[60px] pb-safe`}
        >
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 ${
                  active ? 'text-[#D95D39]' : 'text-[#2B1B17]/60'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <AddProductModal
          open={addModalOpen}
          isMobileLayout
          isScopedFrame={isScopedFrame}
          onClose={() => setAddModalOpen(false)}
        />
        {orderDetailOverlay}
      </div>
    );
  }

  // Desktop Admin Layout: Left Sidebar + Content Area
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2B1B17]">
      {adminBanner}

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <aside className="no-print w-60 shrink-0 border-r border-[#2B1B17]/10 bg-white p-4 space-y-1.5">
          <div className="px-3 py-2 mb-2">
            <div className="font-display font-extrabold text-base text-[#2B1B17]">
              {t.brandName}
            </div>
            <div className="text-[11px] text-[#2B1B17]/60">{t.admin.pinTitle}</div>
          </div>

          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full min-h-[44px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  active
                    ? 'bg-[#2B1B17] text-white'
                    : 'text-[#2B1B17]/75 hover:bg-[#FAF7F2]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#F4A261]' : ''}`} />
                <span>{tab.label}</span>
                {tab.id === 'orders' && kpis.pendingCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-md bg-[#D95D39] text-white text-[10px] font-bold tabular-nums">
                    {kpis.pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        <main className={`flex-1 p-6 lg:p-8 overflow-x-hidden ${activeOrderDetail ? 'no-print' : ''}`}>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'products' && renderProductsManager()}
          {activeTab === 'orders' && renderOrdersTracker()}
        </main>
      </div>

      <AddProductModal
        open={addModalOpen}
        isMobileLayout={false}
        onClose={() => setAddModalOpen(false)}
      />
      {orderDetailOverlay}
    </div>
  );
};
