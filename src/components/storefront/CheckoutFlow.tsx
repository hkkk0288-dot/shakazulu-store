import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bus,
  Check,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  MapPin,
  MessageCircle,
  Minus,
  PackageCheck,
  Plane,
  Plus,
  Printer,
  ShoppingBag,
  Smartphone,
  Store,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  DarAreaId,
  DeliveryMethod,
  Order,
  PaymentMethod,
} from '../../types';
import {
  buildWhatsAppOrderUrl,
  calculateLinePricing,
  DAR_AREAS,
  formatPrice,
  formatRawAmount,
  FREE_DAR_DELIVERY_THRESHOLD_TZS,
  getDeliveryFeeTzs,
  getDisplayProductName,
  VACUUM_PACK_FEE_TZS,
} from '../../utils/pricing';
import { BrandMark } from '../common/BrandMark';
import { ProductArtwork } from '../common/ProductArtwork';
import { OrderTrackerModal } from './OrderTrackerModal';

interface CheckoutFlowProps {
  mode: 'mobile-tab' | 'desktop-modal';
  onBrowseProducts: () => void;
  onCloseDesktop?: () => void;
}

type MobileStep = 'cart' | 'delivery' | 'payment' | 'confirm';

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({
  mode,
  onBrowseProducts,
  onCloseDesktop,
}) => {
  const {
    products,
    cart,
    cartSummary,
    language,
    currency,
    vacuumPacked,
    appliedCoupon,
    user,
    signInWithGoogle,
    setVacuumPacked,
    applyPromoCode,
    removePromoCode,
    updateCartItemQuantity,
    removeFromCart,
    addToCart,
    clearCart,
    placeOrder,
    setAdminMode,
    unlockAdmin,
    brandingConfig,
    t,
  } = useStore();

  const [mobileStep, setMobileStep] = useState<MobileStep>('cart');
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('dar_delivery');
  const [darArea, setDarArea] = useState<DarAreaId>('mikocheni');
  const [upcountryCity, setUpcountryCity] = useState('');
  const [exportDestination, setExportDestination] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [notes, setNotes] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [trackerOpen, setTrackerOpen] = useState(false);

  const crossSellProducts = useMemo(
    () =>
      products
        .filter((p) => p.inStock && !cart.some((c) => c.productId === p.id))
        .slice(0, 2),
    [products, cart]
  );

  const selectedAreaObj = DAR_AREAS.find((a) => a.id === darArea) || DAR_AREAS[0];

  const deliveryFeeTzs = useMemo(
    () => getDeliveryFeeTzs(deliveryMethod, darArea, cartSummary.subtotalAfterPromoTzs),
    [deliveryMethod, darArea, cartSummary.subtotalAfterPromoTzs]
  );

  const deliveryLocationLabel = useMemo(() => {
    if (deliveryMethod === 'dar_delivery') {
      return `${selectedAreaObj.name}, Dar es Salaam`;
    }
    if (deliveryMethod === 'upcountry_bus') {
      return upcountryCity.trim() || (language === 'sw' ? 'Mikoani (Basi)' : 'Upcountry Bus Parcel');
    }
    if (deliveryMethod === 'international_dhl') {
      return exportDestination.trim() || 'International (DHL / EMS)';
    }
    return 'Shakazulu Store, Dar es Salaam';
  }, [deliveryMethod, selectedAreaObj.name, upcountryCity, exportDestination, language]);

  const vacuumFeeTzs = vacuumPacked ? VACUUM_PACK_FEE_TZS : 0;
  const grandTotalTzs =
    cartSummary.subtotalAfterPromoTzs + vacuumFeeTzs + (deliveryFeeTzs ?? 0);

  const freeDeliveryRemainingTzs = Math.max(
    0,
    FREE_DAR_DELIVERY_THRESHOLD_TZS - cartSummary.subtotalAfterPromoTzs
  );
  const freeDeliveryPct = Math.min(
    100,
    Math.round((cartSummary.subtotalAfterPromoTzs / FREE_DAR_DELIVERY_THRESHOLD_TZS) * 100)
  );

  const whatsAppPreviewUrl = useMemo(() => {
    const targetOrder = completedOrder;
    return buildWhatsAppOrderUrl({
      orderId: targetOrder?.orderCode || targetOrder?.id,
      language,
      currency: targetOrder ? targetOrder.currency : currency,
      customerName: targetOrder ? targetOrder.customerName : customerName || 'Customer',
      customerPhone: targetOrder ? targetOrder.customerPhone : customerPhone,
      items: targetOrder ? targetOrder.items : cartSummary.snapshots,
      vacuumPacked: targetOrder ? targetOrder.vacuumPacked : vacuumPacked,
      vacuumFeeTzs: targetOrder ? targetOrder.vacuumFeeTzs : vacuumFeeTzs,
      deliveryMethod: targetOrder ? targetOrder.deliveryMethod : deliveryMethod,
      deliveryLocation: targetOrder ? targetOrder.location : deliveryLocationLabel,
      deliveryFeeTzs: targetOrder ? targetOrder.deliveryFeeTzs : deliveryFeeTzs,
      paymentMethod: targetOrder ? targetOrder.paymentMethod : paymentMethod,
      subtotalTzs: targetOrder ? targetOrder.subtotalTzs : cartSummary.subtotalTzs,
      savingsTzs: targetOrder ? targetOrder.savingsTzs : cartSummary.savingsTzs,
      promoCode: targetOrder ? targetOrder.promoCode : appliedCoupon?.code,
      promoDiscountTzs: targetOrder ? targetOrder.promoDiscountTzs : cartSummary.promoDiscountTzs,
      totalTzs: targetOrder ? targetOrder.totalTzs : grandTotalTzs,
      notes: targetOrder ? targetOrder.notes : notes,
    });
  }, [
    completedOrder,
    language,
    currency,
    customerName,
    customerPhone,
    cartSummary,
    appliedCoupon,
    vacuumPacked,
    vacuumFeeTzs,
    deliveryMethod,
    deliveryLocationLabel,
    deliveryFeeTzs,
    paymentMethod,
    grandTotalTzs,
    notes,
  ]);

  const validateCustomerAndDelivery = (): boolean => {
    if (!customerName.trim()) {
      setFormError(
        language === 'sw' ? 'Tafadhali jaza jina lako kamili.' : 'Please enter your full name.'
      );
      return false;
    }
    if (!customerPhone.trim()) {
      setFormError(
        language === 'sw'
          ? 'Tafadhali weka namba yako ya simu au WhatsApp.'
          : 'Please enter your phone or WhatsApp number.'
      );
      return false;
    }
    if (deliveryMethod === 'upcountry_bus' && !upcountryCity.trim()) {
      setFormError(
        language === 'sw'
          ? 'Tafadhali taja mkoa au mji wa basi.'
          : 'Please enter your destination town or region.'
      );
      return false;
    }
    if (deliveryMethod === 'international_dhl' && !exportDestination.trim()) {
      setFormError(
        language === 'sw'
          ? 'Tafadhali taja nchi na mji wa kutuma mzigo.'
          : 'Please enter your destination country and city.'
      );
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleConfirmOrder = async () => {
    if (cartSummary.hasOutOfStockItem || cart.length === 0 || isSubmitting) return;
    if (!validateCustomerAndDelivery()) return;

    setIsSubmitting(true);
    try {
      const created = await placeOrder({
        customerName,
        customerPhone,
        deliveryMethod,
        location: deliveryLocationLabel,
        paymentMethod,
        vacuumPacked,
        vacuumFeeTzs,
        deliveryFeeTzs,
        notes,
      });
      setCompletedOrder(created);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppComplete = async () => {
    if (completedOrder || isSubmitting) return;
    if (cartSummary.hasOutOfStockItem || cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const created = await placeOrder({
        customerName: customerName.trim() || user?.displayName || 'WhatsApp Customer',
        customerPhone: customerPhone.trim() || '-',
        deliveryMethod,
        location: deliveryLocationLabel,
        paymentMethod: 'whatsapp',
        vacuumPacked,
        vacuumFeeTzs,
        deliveryFeeTzs,
        notes,
      });
      setCompletedOrder(created);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Receipt View
  if (completedOrder) {
    const receiptCode = completedOrder.orderCode || completedOrder.id;
    return (
      <>
        <div className="bg-white rounded-2xl border border-[#2B1B17]/10 p-6 md:p-8 text-center max-w-xl mx-auto my-4 shadow-sm animate-modal-in">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#2B1B17]">
            {t.checkout.successTitle}
          </h2>
          <p className="text-sm text-[#2B1B17]/70 mt-2 leading-relaxed">
            {t.checkout.successBody}
          </p>

          <div className="mt-5 bg-[#FAF7F2] rounded-2xl p-4 text-left space-y-2 border border-[#2B1B17]/8">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#2B1B17]/55 uppercase tracking-wider pb-1.5 border-b border-[#2B1B17]/10">
              <span className="inline-flex items-center gap-1.5">
                <BrandMark size="xs" />
                <span>{brandingConfig.siteName} · Dar es Salaam</span>
              </span>
              <span>{t.conversion.receiptTitle}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#2B1B17]/60">{t.checkout.orderNumber}</span>
              <span className="font-mono font-bold text-[#2B1B17]">#{receiptCode}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#2B1B17]/60">{t.checkout.fullName}</span>
              <span className="font-semibold text-[#2B1B17]">{completedOrder.customerName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#2B1B17]/60">{t.checkout.deliveryMethodTitle}</span>
              <span className="font-semibold text-[#2B1B17] text-right">
                {completedOrder.location}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#2B1B17]/60">{t.checkout.paymentTitle}</span>
              <span className="font-semibold text-[#2B1B17]">
                {t.checkout.paymentOptions[completedOrder.paymentMethod]}
              </span>
            </div>
            {completedOrder.items.length > 0 && (
              <div className="pt-2 border-t border-[#2B1B17]/8 space-y-1 text-[11px] text-[#2B1B17]/80">
                {completedOrder.items.map((it, idx) => (
                  <div key={`${it.productId}-${idx}`} className="flex justify-between gap-2">
                    <span className="truncate">
                      {language === 'sw' ? it.nameSw : it.nameEn} ({it.size}) × {it.quantity}
                    </span>
                    <span className="font-mono tabular-nums shrink-0">
                      {formatPrice(it.lineTotalTzs, completedOrder.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {completedOrder.promoCode && (
              <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
                <span>
                  {t.conversion.promoDiscount} ({completedOrder.promoCode})
                </span>
                <span className="tabular-nums">
                  -{formatPrice(completedOrder.promoDiscountTzs || 0, completedOrder.currency)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-[#2B1B17]/10">
              <span className="font-bold text-[#2B1B17]">{t.cart.total}</span>
              <span className="font-display font-bold text-[#D95D39] tabular-nums">
                {formatRawAmount(completedOrder.totalInOrderCurrency, completedOrder.currency)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 no-print">
            <a
              href={whatsAppPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              {t.checkout.completeWhatsAppBtn}
            </a>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#2B1B17]/15 text-[#2B1B17] font-semibold text-xs inline-flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {t.conversion.printReceipt}
              </button>
              <button
                type="button"
                onClick={() => setTrackerOpen(true)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#2B1B17]/15 text-[#2B1B17] font-semibold text-xs inline-flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-4 h-4 text-[#D95D39]" />
                {t.ordersTrack.trackThisOrder}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                unlockAdmin();
                setAdminMode(true);
                onCloseDesktop?.();
              }}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#2B1B17] hover:bg-[#3F2923] text-white font-semibold text-xs inline-flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {t.checkout.viewInAdmin}
            </button>
            <button
              type="button"
              onClick={() => {
                setCompletedOrder(null);
                setMobileStep('cart');
                onBrowseProducts();
                onCloseDesktop?.();
              }}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#2B1B17]/15 text-[#2B1B17] font-semibold text-xs hover:bg-[#FAF7F2] transition-all"
            >
              {t.checkout.continueShopping}
            </button>
          </div>
        </div>

        <OrderTrackerModal
          open={trackerOpen}
          isMobileLayout={mode === 'mobile-tab'}
          initialTab="lookup"
          initialOrderCode={receiptCode}
          onClose={() => setTrackerOpen(false)}
        />
      </>
    );
  }

  // Empty Cart State
  if (cart.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#2B1B17]/10 p-8 text-center my-4">
        <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] text-[#D95D39] flex items-center justify-center mx-auto mb-3">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h3 className="font-display text-lg font-bold text-[#2B1B17]">{t.cart.emptyTitle}</h3>
        <p className="text-sm text-[#2B1B17]/65 mt-1 max-w-sm mx-auto">{t.cart.emptyBody}</p>
        <button
          type="button"
          onClick={() => {
            onBrowseProducts();
            onCloseDesktop?.();
          }}
          className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white font-semibold text-sm transition-all active:scale-95"
        >
          {t.cart.browseCatalog}
        </button>
      </div>
    );
  }

  const renderCartItems = () => (
    <div className="space-y-3">
      {/* Free Dar Delivery Progress Banner */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#2B1B17]/10 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#2B1B17] inline-flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-[#D95D39]" />
            {freeDeliveryRemainingTzs === 0 ? (
              <span className="text-emerald-700">{t.conversion.freeDeliveryUnlocked}</span>
            ) : (
              <span>
                {formatPrice(freeDeliveryRemainingTzs, currency)} {t.conversion.freeDeliveryProgress}
              </span>
            )}
          </span>
          <span className="font-mono text-[11px] font-bold text-[#2B1B17]/60 tabular-nums">
            {freeDeliveryPct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#FAF7F2] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              freeDeliveryRemainingTzs === 0 ? 'bg-emerald-600' : 'bg-[#D95D39]'
            }`}
            style={{ width: `${freeDeliveryPct}%` }}
          />
        </div>
      </div>

      {cart.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const name = getDisplayProductName(product, language);
        const pricing = calculateLinePricing(
          product.basePrice250g,
          item.size,
          item.quantity,
          product.wholesaleDiscount
        );

        return (
          <div
            key={`${item.productId}-${item.size}`}
            className={`bg-white rounded-2xl p-3 border transition-colors ${
              !product.inStock
                ? 'border-red-300 bg-red-50/40'
                : 'border-[#2B1B17]/10'
            }`}
          >
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                <ProductArtwork product={product} language={language} compact className="w-full h-full" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-sm text-[#2B1B17] truncate">
                      {name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-[#2B1B17]/60 mt-0.5">
                      <span>{item.size === '5kg' ? '5kg Bulk Bucket' : item.size}</span>
                      {pricing.isWholesaleApplied && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#D95D39] font-semibold">
                            {t.product.wholesaleBadge} (-{pricing.discountPercent}%)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId, item.size)}
                    aria-label={`${t.cart.remove} ${name}`}
                    className="w-9 h-9 -mt-1 -mr-1 rounded-lg flex items-center justify-center text-[#2B1B17]/45 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {!product.inStock && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.cart.outOfStockWarning}</span>
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 bg-[#FAF7F2] rounded-xl p-0.5 border border-[#2B1B17]/10">
                    <button
                      type="button"
                      onClick={() =>
                        updateCartItemQuantity(item.productId, item.size, item.quantity - 1)
                      }
                      aria-label="Decrease quantity"
                      className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCartItemQuantity(item.productId, item.size, item.quantity + 1)
                      }
                      aria-label="Increase quantity"
                      className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="font-display font-bold text-sm text-[#D95D39] tabular-nums">
                      {formatPrice(pricing.lineFinalTzs, currency)}
                    </div>
                    {pricing.isWholesaleApplied && (
                      <div className="text-[11px] text-[#2B1B17]/45 line-through tabular-nums">
                        {formatPrice(pricing.lineRetailTzs, currency)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Vacuum Packing Option */}
      <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-[#2B1B17]/10 cursor-pointer hover:border-[#D95D39]/50 transition-colors">
        <input
          type="checkbox"
          checked={vacuumPacked}
          onChange={(e) => setVacuumPacked(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded border-[#2B1B17]/30 accent-[#D95D39] shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#2B1B17] flex items-center justify-between gap-2">
            <span>{t.cart.vacuumLabel}</span>
            <span className="text-xs font-mono font-semibold text-[#D95D39] tabular-nums shrink-0">
              +{formatPrice(VACUUM_PACK_FEE_TZS, currency)}
            </span>
          </div>
          <p className="text-xs text-[#2B1B17]/60 mt-0.5">{t.cart.vacuumHint}</p>
        </div>
      </label>

      {/* Cart Cross-Sell ("Customers Also Add") */}
      {crossSellProducts.length > 0 && (
        <div className="bg-white rounded-2xl p-3.5 border border-[#2B1B17]/10 space-y-2.5">
          <div className="text-xs font-bold text-[#2B1B17]">{t.cart.crossSellTitle}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {crossSellProducts.map((prod) => {
              const prodName = getDisplayProductName(prod, language);
              const pricing = calculateLinePricing(
                prod.basePrice250g,
                '250g',
                1,
                prod.wholesaleDiscount
              );
              return (
                <div
                  key={prod.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/8"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                    <ProductArtwork
                      product={prod}
                      language={language}
                      compact
                      className="w-full h-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#2B1B17] truncate">{prodName}</div>
                    <div className="text-[11px] font-semibold text-[#D95D39] tabular-nums">
                      {formatPrice(pricing.unitFinalTzs, currency)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(prod.id, '250g', 1)}
                    className="min-h-[34px] px-2.5 rounded-lg bg-[#2B1B17] hover:bg-[#3F2923] text-white text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t.cart.quickAdd}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderDeliverySection = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10 flex flex-wrap items-center justify-between gap-2.5">
        {user ? (
          <div className="text-xs text-emerald-800 font-semibold">
            {t.cloudAuth.checkoutSignedInAs} {user.email}
          </div>
        ) : (
          <>
            <span className="text-xs text-[#2B1B17]/75 flex-1 min-w-[180px]">
              {t.cloudAuth.checkoutSignInPrompt}
            </span>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="min-h-[38px] px-3.5 rounded-xl bg-[#2B1B17] text-white text-xs font-semibold hover:bg-[#3F2923] transition-colors shrink-0"
            >
              {t.cloudAuth.signInGoogle}
            </button>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10 space-y-3">
        <h3 className="font-display font-bold text-sm text-[#2B1B17]">
          {t.checkout.customerDetails}
        </h3>
        <div>
          <label className="block text-xs font-semibold text-[#2B1B17]/80 mb-1">
            {t.checkout.fullName}
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t.checkout.fullNamePlaceholder}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#2B1B17]/15 bg-[#FAF7F2] text-sm focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2B1B17]/80 mb-1">
            {t.checkout.phone}
          </label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder={t.checkout.phonePlaceholder}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#2B1B17]/15 bg-[#FAF7F2] text-sm focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10 space-y-3">
        <h3 className="font-display font-bold text-sm text-[#2B1B17]">
          {t.checkout.deliveryMethodTitle}
        </h3>

        <div className="grid grid-cols-1 gap-2">
          {(
            [
              { id: 'dar_delivery', icon: Truck },
              { id: 'upcountry_bus', icon: Bus },
              { id: 'international_dhl', icon: Plane },
              { id: 'store_pickup', icon: Store },
            ] as const
          ).map(({ id, icon: Icon }) => {
            const active = deliveryMethod === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setDeliveryMethod(id)}
                className={`min-h-[48px] p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  active
                    ? 'border-[#D95D39] bg-[#D95D39]/8 text-[#2B1B17]'
                    : 'border-[#2B1B17]/12 bg-[#FAF7F2]/60 text-[#2B1B17]/80 hover:border-[#2B1B17]/25'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    active ? 'text-[#D95D39]' : 'text-[#2B1B17]/60'
                  }`}
                />
                <span className="text-xs font-semibold flex-1">
                  {t.checkout.deliveryOptions[id]}
                </span>
                {active && <Check className="w-4 h-4 text-[#D95D39] shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Conditional Delivery Fields */}
        {deliveryMethod === 'dar_delivery' && (
          <div className="pt-2 space-y-2">
            <label className="block text-xs font-semibold text-[#2B1B17]/80">
              {t.checkout.darAreaLabel}
            </label>
            <select
              value={darArea}
              onChange={(e) => setDarArea(e.target.value as DarAreaId)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#2B1B17]/15 bg-[#FAF7F2] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            >
              {DAR_AREAS.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} — {formatPrice(area.feeTzs, currency)} (
                  {language === 'sw' ? area.etaSw : area.etaEn})
                </option>
              ))}
            </select>
          </div>
        )}

        {deliveryMethod === 'upcountry_bus' && (
          <div className="pt-2 space-y-2">
            <label className="block text-xs font-semibold text-[#2B1B17]/80">
              {t.checkout.upcountryCityLabel}
            </label>
            <input
              type="text"
              value={upcountryCity}
              onChange={(e) => setUpcountryCity(e.target.value)}
              placeholder={t.checkout.upcountryCityPlaceholder}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#2B1B17]/15 bg-[#FAF7F2] text-sm focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            />
            <p className="text-xs text-[#2B1B17]/65">{t.checkout.upcountryNote}</p>
          </div>
        )}

        {deliveryMethod === 'international_dhl' && (
          <div className="pt-2 space-y-2">
            <label className="block text-xs font-semibold text-[#2B1B17]/80">
              {t.checkout.exportCountryLabel}
            </label>
            <input
              type="text"
              value={exportDestination}
              onChange={(e) => setExportDestination(e.target.value)}
              placeholder={t.checkout.exportCountryPlaceholder}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#2B1B17]/15 bg-[#FAF7F2] text-sm focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            />
            <p className="text-xs text-[#2B1B17]/65">{t.checkout.exportNote}</p>
          </div>
        )}

        {deliveryMethod === 'store_pickup' && (
          <div className="pt-1 flex items-center gap-2 text-xs text-emerald-700 font-medium">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{t.checkout.pickupNote}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderPaymentSection = () => (
    <div className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10 space-y-3">
      <h3 className="font-display font-bold text-sm text-[#2B1B17]">{t.checkout.paymentTitle}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(
          [
            { id: 'mpesa', icon: Smartphone },
            { id: 'mixx_yas', icon: Smartphone },
            { id: 'airtel_money', icon: Smartphone },
            { id: 'card', icon: CreditCard },
            { id: 'whatsapp', icon: MessageCircle },
          ] as const
        ).map(({ id, icon: Icon }) => {
          const active = paymentMethod === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPaymentMethod(id)}
              className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                active
                  ? 'border-[#D95D39] bg-[#D95D39]/8 text-[#2B1B17]'
                  : 'border-[#2B1B17]/12 bg-[#FAF7F2]/60 text-[#2B1B17]/80 hover:border-[#2B1B17]/25'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${active ? 'text-[#D95D39]' : 'text-[#2B1B17]/60'}`}
              />
              <span className="text-xs font-semibold flex-1">
                {t.checkout.paymentOptions[id]}
              </span>
              {active && <Check className="w-4 h-4 text-[#D95D39] shrink-0" />}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-[#2B1B17]/60">{t.checkout.paymentSimHint}</p>

      <div className="pt-1">
        <label className="block text-xs font-semibold text-[#2B1B17]/80 mb-1">
          {t.checkout.notesLabel}
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.checkout.notesPlaceholder}
          className="w-full px-3.5 py-2 rounded-xl border border-[#2B1B17]/15 bg-[#FAF7F2] text-sm focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
        />
      </div>
    </div>
  );

  const renderSummaryBox = () => (
    <div className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10 space-y-3">
      {/* Promo Code Input */}
      <div className="pb-2.5 border-b border-[#2B1B17]/8 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#2B1B17]">{t.conversion.promoLabel}</span>
          {!appliedCoupon && (
            <button
              type="button"
              onClick={() => {
                setPromoInput('KARIBU10');
                setPromoError(!applyPromoCode('KARIBU10'));
              }}
              className="text-[11px] font-semibold text-[#D95D39] hover:underline"
            >
              KARIBU10 (-10%)
            </button>
          )}
        </div>
        {appliedCoupon ? (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs">
            <span className="font-bold text-emerald-800">
              {appliedCoupon.code} (-{appliedCoupon.discountPercent}%)
            </span>
            <button
              type="button"
              onClick={() => {
                removePromoCode();
                setPromoInput('');
              }}
              className="text-emerald-800 font-semibold hover:underline"
            >
              {t.conversion.promoRemove}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value.toUpperCase());
                setPromoError(false);
              }}
              placeholder={t.conversion.promoPlaceholder}
              className="flex-1 min-h-[38px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            />
            <button
              type="button"
              onClick={() => {
                const ok = applyPromoCode(promoInput);
                setPromoError(!ok);
              }}
              className="min-h-[38px] px-3.5 rounded-xl bg-[#2B1B17] text-white text-xs font-semibold hover:bg-[#3F2923]"
            >
              {t.conversion.promoApply}
            </button>
          </div>
        )}
        {promoError && (
          <p className="text-[11px] font-semibold text-red-600">{t.conversion.promoInvalid}</p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#2B1B17]/75">
        <span>{t.cart.subtotal}</span>
        <span className="font-semibold tabular-nums">
          {formatPrice(cartSummary.subtotalTzs, currency)}
        </span>
      </div>
      {cartSummary.savingsTzs > 0 && (
        <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
          <span className="inline-flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />
            {t.cart.wholesaleSavings}
          </span>
          <span className="tabular-nums">-{formatPrice(cartSummary.savingsTzs, currency)}</span>
        </div>
      )}
      {cartSummary.promoDiscountTzs > 0 && appliedCoupon && (
        <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
          <span>
            {t.conversion.promoDiscount} ({appliedCoupon.code})
          </span>
          <span className="tabular-nums">
            -{formatPrice(cartSummary.promoDiscountTzs, currency)}
          </span>
        </div>
      )}
      {vacuumPacked && (
        <div className="flex items-center justify-between text-xs text-[#2B1B17]/75">
          <span>{t.cart.vacuumFee}</span>
          <span className="font-semibold tabular-nums">
            +{formatPrice(VACUUM_PACK_FEE_TZS, currency)}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-[#2B1B17]/75">
        <span>{t.cart.deliveryFee}</span>
        <span className="font-semibold tabular-nums">
          {deliveryFeeTzs === null
            ? deliveryMethod === 'upcountry_bus'
              ? t.checkout.feeConfirmedWhatsApp
              : t.checkout.feeQuotedWhatsApp
            : deliveryFeeTzs === 0
              ? t.checkout.feeFree
              : formatPrice(deliveryFeeTzs, currency)}
        </span>
      </div>
      <div className="pt-2.5 border-t border-[#2B1B17]/10 flex items-baseline justify-between">
        <span className="font-display font-bold text-sm text-[#2B1B17]">{t.cart.total}</span>
        <span className="font-display font-bold text-lg text-[#D95D39] tabular-nums">
          {formatPrice(grandTotalTzs, currency)}
        </span>
      </div>
    </div>
  );

  // Desktop 2-column Checkout
  if (mode === 'desktop-modal') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-5">
          {renderCartItems()}
          {renderDeliverySection()}
          {renderPaymentSection()}
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-4">
          {renderSummaryBox()}

          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {formError}
            </div>
          )}

          {cartSummary.hasOutOfStockItem && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t.cart.outOfStockWarning}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={cartSummary.hasOutOfStockItem}
              onClick={handleConfirmOrder}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] disabled:opacity-45 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <PackageCheck className="w-4 h-4" />
              {t.checkout.placeOrderBtn}
            </button>

            <a
              href={whatsAppPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (cartSummary.hasOutOfStockItem) {
                  e.preventDefault();
                  return;
                }
                handleWhatsAppComplete();
              }}
              className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                cartSummary.hasOutOfStockItem ? 'opacity-45 pointer-events-none' : ''
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              {t.checkout.completeWhatsAppBtn}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Mobile Step Flow: Cart -> Delivery -> Payment -> Confirm
  const steps: { id: MobileStep; label: string }[] = [
    { id: 'cart', label: t.checkout.steps.cart },
    { id: 'delivery', label: t.checkout.steps.delivery },
    { id: 'payment', label: t.checkout.steps.payment },
    { id: 'confirm', label: t.checkout.steps.confirm },
  ];
  const currentStepIdx = steps.findIndex((s) => s.id === mobileStep);

  return (
    <div className="space-y-4 pb-24">
      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-3 border border-[#2B1B17]/8">
        <div className="grid grid-cols-4 gap-1.5">
          {steps.map((step, idx) => {
            const done = idx < currentStepIdx;
            const active = idx === currentStepIdx;
            return (
              <button
                key={step.id}
                type="button"
                disabled={idx > currentStepIdx}
                onClick={() => {
                  if (idx <= currentStepIdx) setMobileStep(step.id);
                }}
                className="flex flex-col items-center gap-1 disabled:opacity-60"
              >
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    active
                      ? 'bg-[#D95D39]'
                      : done
                        ? 'bg-[#F4A261]'
                        : 'bg-[#2B1B17]/12'
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold truncate max-w-full ${
                    active ? 'text-[#D95D39]' : 'text-[#2B1B17]/65'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {mobileStep === 'cart' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-[#2B1B17]/70">
              {cartSummary.itemCount} {t.admin.orders.itemsCount}
            </span>
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-semibold text-red-600 hover:underline min-h-[36px] px-2"
            >
              {t.cart.clearCart}
            </button>
          </div>
          {renderCartItems()}
          {renderSummaryBox()}
        </div>
      )}

      {mobileStep === 'delivery' && renderDeliverySection()}
      {mobileStep === 'payment' && renderPaymentSection()}

      {mobileStep === 'confirm' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10 space-y-2 text-xs">
            <h3 className="font-display font-bold text-sm text-[#2B1B17] mb-2">
              {t.checkout.title}
            </h3>
            <div className="flex justify-between">
              <span className="text-[#2B1B17]/60">{t.checkout.fullName}</span>
              <span className="font-semibold text-[#2B1B17]">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#2B1B17]/60">{t.checkout.phone}</span>
              <span className="font-semibold text-[#2B1B17]">{customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#2B1B17]/60">{t.checkout.deliveryMethodTitle}</span>
              <span className="font-semibold text-[#2B1B17] text-right max-w-[60%]">
                {deliveryLocationLabel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#2B1B17]/60">{t.checkout.paymentTitle}</span>
              <span className="font-semibold text-[#2B1B17]">
                {t.checkout.paymentOptions[paymentMethod]}
              </span>
            </div>
          </div>

          {renderSummaryBox()}

          <a
            href={whatsAppPreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (cartSummary.hasOutOfStockItem) {
                e.preventDefault();
                return;
              }
              handleWhatsAppComplete();
            }}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#16A34A] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <MessageCircle className="w-4 h-4" />
            {t.checkout.completeWhatsAppBtn}
          </a>
        </div>
      )}

      {formError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          {formError}
        </div>
      )}

      {/* Sticky Bottom Step Action Bar (positioned nicely above bottom tab bar) */}
      <div className="bg-white/95 backdrop-blur-md border border-[#2B1B17]/10 rounded-2xl p-3 shadow-lg flex items-center gap-2">
        {mobileStep !== 'cart' && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              if (mobileStep === 'delivery') setMobileStep('cart');
              if (mobileStep === 'payment') setMobileStep('delivery');
              if (mobileStep === 'confirm') setMobileStep('payment');
            }}
            className="min-h-[46px] px-3.5 rounded-xl bg-[#FAF7F2] text-[#2B1B17] font-semibold text-xs inline-flex items-center gap-1 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.checkout.backBtn}
          </button>
        )}

        {mobileStep === 'cart' && (
          <button
            type="button"
            disabled={cartSummary.hasOutOfStockItem}
            onClick={() => setMobileStep('delivery')}
            className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#D95D39] disabled:opacity-45 text-white font-semibold text-sm flex items-center justify-between active:scale-95 transition-transform"
          >
            <span>
              {t.cart.checkoutShort} · {formatPrice(grandTotalTzs, currency)}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {mobileStep === 'delivery' && (
          <button
            type="button"
            onClick={() => {
              if (validateCustomerAndDelivery()) setMobileStep('payment');
            }}
            className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#D95D39] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <span>{t.checkout.nextBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {mobileStep === 'payment' && (
          <button
            type="button"
            onClick={() => setMobileStep('confirm')}
            className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#D95D39] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <span>{t.checkout.nextBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {mobileStep === 'confirm' && (
          <button
            type="button"
            disabled={cartSummary.hasOutOfStockItem}
            onClick={handleConfirmOrder}
            className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#D95D39] disabled:opacity-45 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <PackageCheck className="w-4 h-4" />
            <span>{t.checkout.placeOrderBtn}</span>
          </button>
        )}
      </div>
    </div>
  );
};
