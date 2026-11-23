import React, { useEffect, useRef, useState } from 'react';
import { Check, Heart, ShoppingBag, Star } from 'lucide-react';
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
  const { language, currency, t, getCategoryLabel, addToCart, isInWishlist, toggleWishlist } =
    useStore();
  const [selectedSize, setSelectedSize] = useState<SizeOption>(defaultSize);
  const [justAdded, setJustAdded] = useState(false);
  const addedTimerRef = useRef<number | null>(null);

  const favorited = isInWishlist(product.id);
  const isLowStock =
    product.inStock &&
    typeof product.stockCount === 'number' &&
    product.stockCount > 0 &&
    product.stockCount <= 5;

  useEffect(() => {
    setSelectedSize(defaultSize);
  }, [defaultSize]);

  useEffect(() => {
    return () => {
      if (addedTimerRef.current !== null) {
        window.clearTimeout(addedTimerRef.current);
      }
    };
  }, []);

  const handleQuickAdd = () => {
    if (!product.inStock) return;
    addToCart(product.id, selectedSize, 1);
    setJustAdded(true);
    if (addedTimerRef.current !== null) {
      window.clearTimeout(addedTimerRef.current);
    }
    addedTimerRef.current = window.setTimeout(() => {
      setJustAdded(false);
    }, 1100);
  };

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
      className={`group bg-white rounded-2xl border border-[#2B1B17]/8 shadow-[0_2px_10px_rgba(43,27,23,0.04)] hover:shadow-[0_8px_22px_rgba(43,27,23,0.08)] transition-all duration-200 flex flex-col overflow-hidden ${
        !product.inStock ? 'opacity-85' : ''
      }`}
    >
      {/* Clean Inset Photography Frame */}
      <div className={compact ? 'p-1.5 pb-0' : 'p-2 pb-0'}>
        <div className="relative w-full rounded-xl overflow-hidden bg-[#F5EFE6]">
          <button
            type="button"
            onClick={() => onOpenDetail(product, selectedSize)}
            className="relative w-full text-left overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D95D39] aspect-[4/3] block"
            aria-label={`${name} - ${t.product.quickView}`}
          >
            <ProductArtwork
              product={product}
              language={language}
              compact={compact}
              className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]"
            />

            {/* Subtle top gradient only for clean icon contrast */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/25 to-transparent pointer-events-none"
            />

            {/* Out of stock clean overlay status */}
            {!product.inStock && (
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-[#2B1B17]/90 text-white text-[10px] font-semibold tracking-tight whitespace-nowrap">
                {t.product.outOfStock}
              </span>
            )}
          </button>

          {/* Minimal Frosted Wishlist Heart */}
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={favorited ? t.product.favoriteRemove : t.product.favoriteAdd}
            className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all ${
              favorited
                ? 'bg-white text-[#D95D39] shadow-sm'
                : 'bg-black/30 backdrop-blur-md text-white hover:bg-black/45'
            }`}
          >
            <Heart className={`w-4 h-4 ${favorited ? 'fill-[#D95D39]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div
        className={`${
          compact ? 'px-2.5 pb-2.5 pt-2' : 'px-4 pb-4 pt-3'
        } flex-1 flex flex-col justify-between gap-2.5`}
      >
        <div>
          {/* Unboxed Clean Metadata Row (Category · Badge/Rating) */}
          <div className="flex items-center justify-between gap-1.5 text-[11px] text-[#2B1B17]/55 mb-1">
            <span className="truncate">
              {badgeLabel && product.inStock ? (
                <>
                  <span className="font-semibold text-[#D95D39]">{badgeLabel}</span>
                  <span aria-hidden="true"> · </span>
                </>
              ) : null}
              {getCategoryLabel(product.category)}
            </span>
            <span className="inline-flex items-center gap-0.5 shrink-0 font-semibold text-[#2B1B17]/80 tabular-nums">
              <Star className="w-3 h-3 fill-[#F4A261] text-[#F4A261]" aria-hidden="true" />
              {product.rating.toFixed(1)}
            </span>
          </div>

          {/* Balanced Product Title */}
          <button
            type="button"
            onClick={() => onOpenDetail(product, selectedSize)}
            className="text-left w-full focus:outline-none focus-visible:underline"
          >
            <h3
              className={`font-display font-bold text-[#2B1B17] leading-snug line-clamp-2 ${
                compact ? 'text-[13px] min-h-[2.3rem]' : 'text-[15px] min-h-[2.6rem]'
              }`}
              style={{ textWrap: 'balance' }}
            >
              {name}
            </h3>
          </button>

          {/* Clean Recessed Segmented Weight Control — Zero Clipping */}
          <div
            className="mt-2 bg-[#F5EFE6] p-1 rounded-xl grid grid-cols-4 gap-0.5"
            role="group"
            aria-label={t.product.selectSize}
          >
            {SIZE_OPTIONS.map((opt) => {
              const active = selectedSize === opt.id;
              const isBulk = opt.id === '5kg';
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedSize(opt.id)}
                  className={`h-7 rounded-lg flex items-center justify-center text-[10px] sm:text-[11px] leading-none tracking-tight transition-all duration-150 whitespace-nowrap ${
                    active
                      ? isBulk
                        ? 'bg-white text-[#D95D39] font-bold shadow-xs ring-1 ring-[#D95D39]/25'
                        : 'bg-white text-[#2B1B17] font-bold shadow-xs ring-1 ring-[#2B1B17]/8'
                      : 'text-[#2B1B17]/65 hover:text-[#2B1B17] font-semibold'
                  }`}
                >
                  {opt.id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Crisp Price Line + Refined Boutique CTA */}
        <div className="pt-1.5 border-t border-[#2B1B17]/8 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-1.5">
            <div className="flex items-baseline gap-1 min-w-0">
              <span
                className={`font-display font-extrabold text-[#D95D39] tabular-nums truncate ${
                  compact ? 'text-[13px]' : 'text-base'
                }`}
              >
                {formatPrice(pricing.unitFinalTzs, currency)}
              </span>
              {pricing.isWholesaleApplied && (
                <span className="text-[10px] text-[#2B1B17]/40 line-through tabular-nums hidden sm:inline">
                  {formatPrice(pricing.unitRetailTzs, currency)}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-[#2B1B17]/55 whitespace-nowrap shrink-0 tabular-nums">
              {isLowStock ? (
                <span className="text-amber-700">
                  {t.product.lowStock.replace('{n}', String(product.stockCount))}
                </span>
              ) : pricing.isWholesaleApplied ? (
                <span className="text-[#D95D39]">-{pricing.discountPercent}%</span>
              ) : selectedSize === '5kg' ? (
                language === 'sw' ? (
                  'Ndoo 5kg'
                ) : (
                  '5kg Bucket'
                )
              ) : (
                selectedSize
              )}
            </span>
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={handleQuickAdd}
            className={`w-full min-h-[42px] px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D95D39] ${
              !product.inStock
                ? 'bg-[#2B1B17]/10 text-[#2B1B17]/40 cursor-not-allowed'
                : justAdded
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-[#2B1B17] hover:bg-[#3F2923] text-white shadow-xs'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#F4A261] shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap truncate">{t.product.addedToast}</span>
              </>
            ) : (
              <>
                <ShoppingBag
                  className={`w-3.5 h-3.5 shrink-0 ${
                    product.inStock ? 'text-[#F4A261]' : 'text-[#2B1B17]/35'
                  }`}
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap truncate">
                  {product.inStock ? t.product.addToCart : t.product.outOfStock}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
