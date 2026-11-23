import React, { useEffect, useState } from 'react';
import { Heart, Minus, Plus, Share2, ShieldCheck, ShoppingBag, Star, Tag, TrendingUp, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, SizeOption } from '../../types';
import {
  calculateLinePricing,
  calculateWholesaleProfit,
  formatPrice,
  getDisplayProductName,
  SIZE_OPTIONS,
} from '../../utils/pricing';
import { ProductArtwork } from '../common/ProductArtwork';

interface ProductDetailModalProps {
  product: Product | null;
  initialSize: SizeOption;
  isMobileLayout: boolean;
  isScopedFrame?: boolean;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  initialSize,
  isMobileLayout,
  isScopedFrame = false,
  onClose,
}) => {
  const { language, currency, t, getCategoryLabel, addToCart, isInWishlist, toggleWishlist, showToast } = useStore();
  const [size, setSize] = useState<SizeOption>(initialSize);
  const [qty, setQty] = useState<number>(1);

  useEffect(() => {
    setSize(initialSize);
    setQty(1);
  }, [product, initialSize]);

  if (!product) return null;

  const favorited = isInWishlist(product.id);
  const isLowStock =
    product.inStock &&
    typeof product.stockCount === 'number' &&
    product.stockCount > 0 &&
    product.stockCount <= 5;

  const name = getDisplayProductName(product, language);
  const description = language === 'sw' ? product.descriptionSw : product.descriptionEn;
  const origin = language === 'sw' ? product.originSw : product.originEn;

  const pricing = calculateLinePricing(
    product.basePrice250g,
    size,
    qty,
    product.wholesaleDiscount
  );

  const profitEstimate = calculateWholesaleProfit(
    product.basePrice250g,
    product.wholesaleDiscount
  );

  const handleAdd = () => {
    if (!product.inStock) return;
    addToCart(product.id, size, qty);
    onClose();
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?product=${encodeURIComponent(product.id)}`;
    const shareTitle = `${name} — ${t.brandName}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: description, url: shareUrl });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(t.product.linkCopied);
    } catch {
      showToast(shareUrl);
    }
  };

  const positionClass = isScopedFrame ? 'absolute' : 'fixed';

  if (isMobileLayout) {
    return (
      <div
        className={`${positionClass} inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-[2px]`}
        role="dialog"
        aria-modal="true"
        aria-label={name}
      >
        <div className="flex-1" onClick={onClose} />
        <div className="bg-white rounded-t-3xl max-h-[88%] flex flex-col shadow-2xl animate-sheet-up overflow-hidden">
          {/* Drag Handle + Header */}
          <div className="pt-3 pb-2 px-4 flex items-center justify-between border-b border-[#2B1B17]/8 shrink-0">
            <div className="w-10" />
            <div className="w-10 h-1.5 rounded-full bg-[#2B1B17]/20" aria-hidden="true" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-[#2B1B17]/70 hover:bg-[#FAF7F2] active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto px-4 py-4 space-y-4">
            <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden">
              <ProductArtwork product={product} language={language} className="w-full h-full" />
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-[#2B1B17]/60 mb-1">
                <span>{getCategoryLabel(product.category)}</span>
                <span aria-hidden="true">·</span>
                <span>{origin}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[#2B1B17] font-semibold">
                  <Star className="w-3.5 h-3.5 fill-[#F4A261] text-[#F4A261]" aria-hidden="true" />
                  {product.rating.toFixed(1)} ({product.reviewCount})
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-[#2B1B17]">{name}</h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product.id)}
                    aria-label={favorited ? t.product.favoriteRemove : t.product.favoriteAdd}
                    className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/10 flex items-center justify-center"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        favorited ? 'fill-[#D95D39] text-[#D95D39]' : 'text-[#2B1B17]/70'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShare()}
                    aria-label={t.product.shareBtn}
                    className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/10 flex items-center justify-center"
                  >
                    <Share2 className="w-4 h-4 text-[#2B1B17]/75" />
                  </button>
                </div>
              </div>
              {isLowStock && (
                <div className="mt-1 inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold">
                  {t.product.lowStock.replace('{n}', String(product.stockCount))}
                </div>
              )}
              <p className="mt-1.5 text-sm text-[#2B1B17]/75 leading-relaxed">{description}</p>
            </div>

            {/* Size Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#2B1B17]">{t.product.selectSize}</span>
                <span className="text-[11px] text-[#D95D39] font-medium">
                  -{product.wholesaleDiscount}% {t.product.wholesaleBadge}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SIZE_OPTIONS.map((opt) => {
                  const active = size === opt.id;
                  const optPrice = calculateLinePricing(
                    product.basePrice250g,
                    opt.id,
                    1,
                    product.wholesaleDiscount
                  );
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSize(opt.id)}
                      className={`min-h-[48px] px-3 py-2 rounded-xl border text-left transition-all active:scale-95 ${
                        active
                          ? 'border-[#D95D39] bg-[#D95D39]/8 text-[#2B1B17]'
                          : 'border-[#2B1B17]/12 bg-[#FAF7F2] text-[#2B1B17]/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">
                          {language === 'sw' ? opt.labelSw : opt.labelEn}
                        </span>
                        {opt.id === '5kg' && (
                          <span className="text-[10px] font-bold text-[#D95D39]">
                            -{product.wholesaleDiscount}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-[#D95D39] tabular-nums mt-0.5">
                        {formatPrice(optPrice.unitFinalTzs, currency)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity + Wholesale Hint */}
            <div className="flex items-center justify-between gap-3 bg-[#FAF7F2] p-3 rounded-2xl">
              <span className="text-xs font-semibold text-[#2B1B17]">{t.product.quantity}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-11 h-11 rounded-xl bg-white border border-[#2B1B17]/12 flex items-center justify-center active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-display font-bold text-base tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="w-11 h-11 rounded-xl bg-white border border-[#2B1B17]/12 flex items-center justify-center active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#2B1B17]/65">{t.product.bulkTip}</p>

            <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>{t.conversion.trustFresh}</span>
            </div>

            {size === '5kg' && (
              <div className="rounded-2xl bg-[#2B1B17] text-[#FAF7F2] p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-display font-bold text-[#F4A261]">
                  <TrendingUp className="w-4 h-4" />
                  <span>{t.conversion.profitTitle}</span>
                </div>
                <div className="flex justify-between text-[#FAF7F2]/80">
                  <span>{t.conversion.profitCost}</span>
                  <span className="font-mono tabular-nums">
                    {formatPrice(profitEstimate.bulkCostTzs, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-[#FAF7F2]/80">
                  <span>{t.conversion.profitResale}</span>
                  <span className="font-mono tabular-nums">
                    {formatPrice(profitEstimate.retailResaleValueTzs, currency)}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-white/15 flex justify-between font-bold text-emerald-300">
                  <span>{t.conversion.profitNet}</span>
                  <span className="font-mono tabular-nums">
                    +{formatPrice(profitEstimate.estimatedProfitTzs, currency)} (
                    {profitEstimate.marginPercent}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom CTA */}
          <div className="p-4 border-t border-[#2B1B17]/10 bg-white pb-safe shrink-0 space-y-2">
            {pricing.isWholesaleApplied && (
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-[#2B1B17]">
                  <Tag className="w-3.5 h-3.5 text-[#D95D39]" />
                  {t.product.wholesaleBadge} (-{pricing.discountPercent}%)
                </span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  {t.product.saveLabel} {formatPrice(pricing.savingsTzs, currency)}
                </span>
              </div>
            )}
            <button
              type="button"
              disabled={!product.inStock}
              onClick={handleAdd}
              className={`w-full min-h-[48px] rounded-xl font-semibold text-sm flex items-center justify-between px-4 transition-all active:scale-95 ${
                product.inStock
                  ? 'bg-[#D95D39] text-white shadow-md'
                  : 'bg-[#2B1B17]/15 text-[#2B1B17]/40 cursor-not-allowed'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                {product.inStock ? t.product.addToCart : t.product.outOfStock}
              </span>
              <span className="font-display font-bold tabular-nums">
                {formatPrice(pricing.lineFinalTzs, currency)}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Quick-View Modal
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#2B1B17]/10 grid grid-cols-1 md:grid-cols-2 animate-modal-in">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#2B1B17] flex items-center justify-center shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D95D39]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Artwork */}
        <div className="min-h-[260px] md:min-h-[420px]">
          <ProductArtwork product={product} language={language} className="w-full h-full" />
        </div>

        {/* Right Details */}
        <div className="p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#2B1B17]/60">
              <span>{getCategoryLabel(product.category)}</span>
              <span aria-hidden="true">·</span>
              <span>{origin}</span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-2xl font-bold text-[#2B1B17] leading-tight">{name}</h2>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label={favorited ? t.product.favoriteRemove : t.product.favoriteAdd}
                  className="w-9 h-9 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#2B1B17]/10 flex items-center justify-center"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      favorited ? 'fill-[#D95D39] text-[#D95D39]' : 'text-[#2B1B17]/70'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  aria-label={t.product.shareBtn}
                  className="h-9 px-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#2B1B17]/10 text-xs font-semibold text-[#2B1B17] inline-flex items-center gap-1"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#D95D39]" />
                  <span>{t.product.shareBtn}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#2B1B17]/75 flex-wrap">
              <span className="inline-flex items-center gap-1 font-semibold text-[#2B1B17]">
                <Star className="w-3.5 h-3.5 fill-[#F4A261] text-[#F4A261]" aria-hidden="true" />
                {product.rating.toFixed(1)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{product.reviewCount} reviews</span>
              <span aria-hidden="true">·</span>
              <span className={product.inStock ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                {product.inStock ? t.product.inStock : t.product.outOfStock}
              </span>
              {isLowStock && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold">
                  {t.product.lowStock.replace('{n}', String(product.stockCount))}
                </span>
              )}
            </div>

            <p className="text-sm text-[#2B1B17]/75 leading-relaxed">{description}</p>

            <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>{t.conversion.trustFresh}</span>
            </div>

            {/* Size grid */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#2B1B17]">{t.product.selectSize}</span>
                <span className="text-[11px] text-[#D95D39] font-medium">
                  5kg / 5+ = -{product.wholesaleDiscount}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SIZE_OPTIONS.map((opt) => {
                  const active = size === opt.id;
                  const optPrice = calculateLinePricing(
                    product.basePrice250g,
                    opt.id,
                    1,
                    product.wholesaleDiscount
                  );
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSize(opt.id)}
                      className={`px-3 py-2 rounded-xl border text-left transition-all ${
                        active
                          ? 'border-[#D95D39] bg-[#D95D39]/8 text-[#2B1B17]'
                          : 'border-[#2B1B17]/12 bg-[#FAF7F2] text-[#2B1B17]/80 hover:border-[#2B1B17]/30'
                      }`}
                    >
                      <div className="text-xs font-bold">
                        {language === 'sw' ? opt.labelSw : opt.labelEn}
                      </div>
                      <div className="text-xs font-semibold text-[#D95D39] tabular-nums">
                        {formatPrice(optPrice.unitFinalTzs, currency)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {size === '5kg' && (
              <div className="rounded-2xl bg-[#2B1B17] text-[#FAF7F2] p-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-display font-bold text-[#F4A261]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{t.conversion.profitTitle}</span>
                </div>
                <div className="flex justify-between text-[#FAF7F2]/80">
                  <span>{t.conversion.profitResale}</span>
                  <span className="font-mono tabular-nums">
                    {formatPrice(profitEstimate.retailResaleValueTzs, currency)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-emerald-300">
                  <span>{t.conversion.profitNet}</span>
                  <span className="font-mono tabular-nums">
                    +{formatPrice(profitEstimate.estimatedProfitTzs, currency)} (
                    {profitEstimate.marginPercent}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Price + Quantity + CTA */}
          <div className="pt-3 border-t border-[#2B1B17]/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold text-[#D95D39] tabular-nums">
                    {formatPrice(pricing.lineFinalTzs, currency)}
                  </span>
                  {pricing.isWholesaleApplied && (
                    <span className="text-xs text-[#2B1B17]/45 line-through tabular-nums">
                      {formatPrice(pricing.lineRetailTzs, currency)}
                    </span>
                  )}
                </div>
                {pricing.isWholesaleApplied && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <Tag className="w-3 h-3" />
                    {t.product.wholesaleBadge} (-{pricing.discountPercent}% · {t.product.saveLabel}{' '}
                    {formatPrice(pricing.savingsTzs, currency)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1 rounded-xl border border-[#2B1B17]/10">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-9 h-9 rounded-lg bg-white flex items-center justify-center hover:bg-[#FAF7F2] active:scale-95"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-bold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="w-9 h-9 rounded-lg bg-white flex items-center justify-center hover:bg-[#FAF7F2] active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={!product.inStock}
              onClick={handleAdd}
              className={`w-full min-h-[46px] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                product.inStock
                  ? 'bg-[#D95D39] hover:bg-[#C14C2B] text-white shadow-sm'
                  : 'bg-[#2B1B17]/15 text-[#2B1B17]/40 cursor-not-allowed'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {product.inStock ? t.product.addToCart : t.product.outOfStock}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
