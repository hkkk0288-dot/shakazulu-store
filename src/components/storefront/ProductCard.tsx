import React, { useState } from 'react';
import { ShoppingBag, Star, Tag } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, SizeOption } from '../../types';
import {
  calculateLinePricing,
  formatPrice,
  getDisplayProductName,
  SIZE_OPTIONS,
} from '../../utils/pricing';
import { ProductArtwork } from '../common/ProductArtwork';

interface ProductCardProps {
  product: Product;
  defaultSize?: SizeOption;
  compact?: boolean;
  onOpenDetail: (product: Product, initialSize: SizeOption) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  defaultSize = '250g',
  compact = false,
  onOpenDetail,
}) => {
  const { language, currency, t, getCategoryLabel, addToCart } = useStore();
  const [selectedSize, setSelectedSize] = useState<SizeOption>(defaultSize);

  // Sync defaultSize prop when weight filter changes
  React.useEffect(() => {
    setSelectedSize(defaultSize);
  }, [defaultSize]);

  const name = getDisplayProductName(product, language);
  const pricing = calculateLinePricing(
    product.basePrice250g,
    selectedSize,
    1,
    product.wholesaleDiscount
  );

  const badgeLabel = !product.inStock
    ? t.product.outOfStock
    : product.badge === 'best_seller'
      ? t.product.bestSeller
      : product.badge === 'new'
        ? t.product.newBadge
        : null;

  return (
    <article
      className={`group bg-white rounded-2xl border border-[#2B1B17]/8 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden ${
        !product.inStock ? 'opacity-85' : ''
      }`}
    >
      {/* Visual Tile */}
      <button
        type="button"
        onClick={() => onOpenDetail(product, selectedSize)}
        className={`relative w-full text-left overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D95D39] ${
          compact ? 'aspect-[4/3]' : 'aspect-[4/3]'
        }`}
        aria-label={`${name} - ${t.product.quickView}`}
      >
        <ProductArtwork product={product} language={language} compact={compact} className="w-full h-full" />

        {/* Single crisp status/highlight badge */}
        {badgeLabel && (
          <span
            className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-tight shadow-sm whitespace-nowrap ${
              !product.inStock
                ? 'bg-[#2B1B17]/85 text-white'
                : product.badge === 'new'
                  ? 'bg-[#2B1B17] text-[#F4A261]'
                  : 'bg-white/95 text-[#2B1B17]'
            }`}
          >
            {badgeLabel}
          </span>
        )}

        {/* Wholesale Price badge when 5kg is selected */}
        {pricing.isWholesaleApplied && product.inStock && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4A261] text-[#2B1B17] text-[10px] font-bold shadow-sm whitespace-nowrap">
            <Tag className="w-3 h-3" aria-hidden="true" />
            {t.product.wholesaleBadge} (-{pricing.discountPercent}%)
          </span>
        )}
      </button>

      {/* Card Body */}
      <div className={`${compact ? 'p-3' : 'p-4'} flex-1 flex flex-col justify-between gap-2.5`}>
        <div>
          {/* Unboxed metadata row */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#2B1B17]/60 mb-1">
            <span className="truncate">{getCategoryLabel(product.category)}</span>
            <span className="inline-flex items-center gap-1 shrink-0 font-medium text-[#2B1B17]/80 tabular-nums">
              <Star className="w-3 h-3 fill-[#F4A261] text-[#F4A261]" aria-hidden="true" />
              {product.rating.toFixed(1)}
            </span>
          </div>

          {/* Product Title */}
          <button
            type="button"
            onClick={() => onOpenDetail(product, selectedSize)}
            className="text-left w-full focus:outline-none focus-visible:underline"
          >
            <h3
              className={`font-display font-bold text-[#2B1B17] leading-snug line-clamp-2 ${
                compact ? 'text-sm min-h-[2.5rem]' : 'text-base min-h-[2.75rem]'
              }`}
            >
              {name}
            </h3>
          </button>

          {/* Weight Size Selector */}
          <div
            className="mt-2.5 grid grid-cols-4 gap-1"
            role="group"
            aria-label={t.product.selectSize}
          >
            {SIZE_OPTIONS.map((opt) => {
              const active = selectedSize === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedSize(opt.id)}
                  className={`min-h-[32px] py-1 px-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95 whitespace-nowrap ${
                    active
                      ? 'bg-[#2B1B17] text-white shadow-xs'
                      : 'bg-[#FAF7F2] text-[#2B1B17]/75 hover:bg-[#2B1B17]/10'
                  }`}
                >
                  {opt.id === '5kg' ? '5kg' : opt.id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price + Add to Cart */}
        <div className="pt-2 border-t border-[#2B1B17]/8 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`font-display font-bold text-[#D95D39] tabular-nums ${
                  compact ? 'text-sm' : 'text-base'
                }`}
              >
                {formatPrice(pricing.unitFinalTzs, currency)}
              </span>
              {pricing.isWholesaleApplied && (
                <span className="text-[11px] text-[#2B1B17]/45 line-through tabular-nums">
                  {formatPrice(pricing.unitRetailTzs, currency)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#2B1B17]/50 whitespace-nowrap">
              {selectedSize === '5kg' ? (language === 'sw' ? 'Ndoo 5kg' : '5kg Bucket') : selectedSize}
            </span>
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => addToCart(product.id, selectedSize, 1)}
            className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D95D39] ${
              product.inStock
                ? 'bg-[#D95D39] hover:bg-[#C14C2B] text-white shadow-xs'
                : 'bg-[#2B1B17]/10 text-[#2B1B17]/40 cursor-not-allowed'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap truncate">
              {product.inStock ? t.product.addToCart : t.product.outOfStock}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
};
