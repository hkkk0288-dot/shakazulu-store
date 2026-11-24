import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  ClipboardList,
  Clock,
  Coins,
  Gift,
  Globe,
  Grid,
  Heart,
  Home,
  Instagram,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Search,
  Shield,
  ShoppingBag,
  Smartphone,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { COMBO_BUNDLES, CUSTOMER_REVIEWS } from '../../data/seedData';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { CategoryId, MobileTab, Product, SizeOption } from '../../types';
import {
  calculateLinePricing,
  calculateWholesaleProfit,
  formatPrice,
  formatRawAmount,
  getDisplayProductName,
  PHONE_DISPLAY,
  WHATSAPP_DISPLAY,
  WHATSAPP_NUMBER,
} from '../../utils/pricing';
import { BrandMark } from '../common/BrandMark';
import { ProductArtwork } from '../common/ProductArtwork';
import { PWAInstallButton } from '../common/PWAComponents';
import { CheckoutFlow } from '../storefront/CheckoutFlow';
import { OrderTrackerModal } from '../storefront/OrderTrackerModal';
import { ProductCard } from '../storefront/ProductCard';
import { ProductDetailModal } from '../storefront/ProductDetailModal';
import { MobileSplashOnboarding } from './MobileSplashOnboarding';

const MOBILE_SPLASH_STORAGE_KEY = 'shakazulu_mobile_splash_seen_v1';

interface MobileStorefrontProps {
  isScopedFrame?: boolean;
}

export const MobileStorefront: React.FC<MobileStorefrontProps> = ({
  isScopedFrame = false,
}) => {
  const {
    products,
    categories: storeCategories,
    orders,
    cartSummary,
    wishlist,
    language,
    currency,
    user,
    signInWithGoogle,
    signOutUser,
    getCategoryLabel,
    isInWishlist,
    setLanguage,
    setCurrency,
    setAdminMode,
    addBundleToCart,
    splashConfig,
    brandingConfig,
    t,
  } = useStore();

  const { isInstallable, isInstalled, isIOS } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const hasActiveSplash = splashConfig.enabled && splashConfig.slides.length > 0;

  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !hasActiveSplash) return false;
    try {
      const hasDeepLink = new URLSearchParams(window.location.search).has('product');
      if (hasDeepLink) return false;
      return window.localStorage.getItem(MOBILE_SPLASH_STORAGE_KEY) !== 'true';
    } catch {
      return false;
    }
  });
  const [promoIndex, setPromoIndex] = useState(0);
  const [isFilteringSkeleton, setIsFilteringSkeleton] = useState(false);
  const promoTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasActiveSplash && showSplash) {
      setShowSplash(false);
    }
  }, [hasActiveSplash, showSplash]);

  const handleFinishSplash = () => {
    try {
      window.localStorage.setItem(MOBILE_SPLASH_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    setShowSplash(false);
  };

  const [detailTarget, setDetailTarget] = useState<{
    product: Product;
    size: SizeOption;
  } | null>(null);
  const deepLinkHandledRef = useRef(false);

  useEffect(() => {
    if (deepLinkHandledRef.current || products.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get('product');
    if (prodId) {
      const matched = products.find((p) => p.id === prodId);
      if (matched) {
        setDetailTarget({ product: matched, size: '250g' });
        deepLinkHandledRef.current = true;
      }
    }
  }, [products]);

  const handleCategoryChange = (cat: CategoryId) => {
    if (cat === selectedCategory && !savedOnly) return;
    setSavedOnly(false);
    setSelectedCategory(cat);
    setIsFilteringSkeleton(true);
    window.setTimeout(() => setIsFilteringSkeleton(false), 160);
  };

  const bestSellers = useMemo(
    () => products.filter((p) => p.badge === 'best_seller' && p.inStock),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (savedOnly && !isInWishlist(p.id)) return false;
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (q) {
        const catLabel = getCategoryLabel(p.category).toLowerCase();
        return (
          p.nameEn.toLowerCase().includes(q) ||
          p.nameSw.toLowerCase().includes(q) ||
          catLabel.includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, savedOnly, isInWishlist, searchQuery, getCategoryLabel]);

  const categoryIds: CategoryId[] = useMemo(
    () => ['all', ...storeCategories.map((c) => c.id)],
    [storeCategories]
  );

  const activeBanners = useMemo(
    () => (brandingConfig.bannersEnabled ? brandingConfig.banners : []),
    [brandingConfig.bannersEnabled, brandingConfig.banners]
  );

  useEffect(() => {
    if (promoIndex >= activeBanners.length && activeBanners.length > 0) {
      setPromoIndex(0);
    }
  }, [promoIndex, activeBanners.length]);

  const scrollToBannerSlide = (idx: number) => {
    setPromoIndex(idx);
    const el = promoTrackRef.current;
    if (!el) return;
    const width = el.clientWidth;
    el.scrollTo({ left: idx * (width + 12), behavior: 'smooth' });
  };

  const handlePromoScroll = () => {
    const el = promoTrackRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / (el.clientWidth + 12));
    if (idx >= 0 && idx < activeBanners.length && idx !== promoIndex) {
      setPromoIndex(idx);
    }
  };

  const tabs: { id: MobileTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: t.mobileTabs.home, icon: Home },
    { id: 'categories', label: t.mobileTabs.categories, icon: Grid },
    { id: 'wholesale', label: t.mobileTabs.wholesale, icon: Package },
    { id: 'cart', label: t.mobileTabs.cart, icon: ShoppingBag },
    { id: 'more', label: t.mobileTabs.more, icon: Menu },
  ];

  const handlePromoAction = (target: string) => {
    if (target === 'wholesale') {
      setActiveTab('wholesale');
    } else if (target === 'cart') {
      setActiveTab('cart');
    } else {
      setSavedOnly(false);
      setSelectedCategory(target || 'all');
      setActiveTab('categories');
    }
  };

  const getBundleTotalTzs = (items: typeof COMBO_BUNDLES[number]['items']) =>
    items.reduce((sum, entry) => {
      const prod = products.find((p) => p.id === entry.productId);
      if (!prod) return sum;
      const pricing = calculateLinePricing(
        prod.basePrice250g,
        entry.size,
        entry.quantity,
        prod.wholesaleDiscount
      );
      return sum + pricing.lineFinalTzs;
    }, 0);

  const sampleWholesaleProduct =
    products.find((p) => p.id === 'prod-red-ubuyu') ?? products[0] ?? null;
  const sampleWholesaleProfit = sampleWholesaleProduct
    ? calculateWholesaleProfit(
        sampleWholesaleProduct.basePrice250g,
        sampleWholesaleProduct.wholesaleDiscount
      )
    : null;

  return (
    <div
      className={`relative flex flex-col bg-[#FAF7F2] text-[#2B1B17] ${
        isScopedFrame ? 'h-full overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Sticky Top App Bar (52px) */}
      <header className="sticky top-0 z-30 h-[52px] px-3.5 bg-white/95 backdrop-blur-md border-b border-[#2B1B17]/10 flex items-center justify-between gap-2 shrink-0">
        {searchOpen ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-[#2B1B17]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchShort}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/12 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
              aria-label="Close search"
              className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl text-[#2B1B17]/70 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2 min-h-[44px] min-w-0 active:scale-95 transition-transform"
            >
              <BrandMark size="xs" />
              <span className="font-display font-extrabold text-base tracking-tight text-[#2B1B17] truncate">
                {brandingConfig.siteShortName}
              </span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(true);
                  if (activeTab === 'cart' || activeTab === 'more') {
                    setActiveTab('categories');
                  }
                }}
                aria-label="Search"
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[#2B1B17]/80 hover:bg-[#FAF7F2] active:scale-95 transition-transform"
              >
                <Search className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cart')}
                aria-label={t.mobileTabs.cart}
                className="relative w-11 h-11 rounded-xl flex items-center justify-center text-[#2B1B17] hover:bg-[#FAF7F2] active:scale-95 transition-transform"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartSummary.itemCount > 0 && (
                  <span className="absolute top-1.5 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D95D39] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {cartSummary.itemCount}
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </header>

      {/* Main Scrollable Content */}
      <main
        className={`flex-1 overflow-y-auto px-3 pt-3.5 ${
          isScopedFrame ? 'pb-20' : 'pb-24'
        }`}
      >
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            {/* Admin-Managed Slide Banners Carousel */}
            {activeBanners.length > 0 && (
              <div>
                <div
                  ref={promoTrackRef}
                  onScroll={handlePromoScroll}
                  className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar"
                >
                  {activeBanners.map((banner, idx) => {
                    const bannerTitle =
                      language === 'sw'
                        ? banner.titleSw || banner.titleEn
                        : banner.titleEn || banner.titleSw;
                    const bannerSubtitle =
                      language === 'sw'
                        ? banner.subtitleSw || banner.subtitleEn
                        : banner.subtitleEn || banner.subtitleSw;
                    const bannerCta =
                      language === 'sw'
                        ? banner.ctaSw || banner.ctaEn
                        : banner.ctaEn || banner.ctaSw;

                    return (
                      <div
                        key={banner.id}
                        onClick={() => scrollToBannerSlide(idx)}
                        className="snap-center shrink-0 w-full rounded-2xl p-4 text-white relative overflow-hidden shadow-sm min-h-[144px] flex flex-col justify-end"
                        style={{
                          background: `linear-gradient(135deg, ${banner.gradientFrom} 0%, ${banner.gradientTo} 100%)`,
                        }}
                      >
                        {banner.image && (
                          <img
                            src={banner.image}
                            alt={bannerTitle}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15"
                        />
                        <div className="relative z-10">
                          <h2 className="font-display font-bold text-base leading-snug max-w-[88%]">
                            {bannerTitle}
                          </h2>
                          {bannerSubtitle && (
                            <p className="text-xs text-white/85 mt-1 max-w-[92%] leading-relaxed line-clamp-2">
                              {bannerSubtitle}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromoAction(banner.target);
                            }}
                            className="mt-3 min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white text-[#2B1B17] text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-transform whitespace-nowrap"
                          >
                            <span>{bannerCta}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {activeBanners.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    {activeBanners.map((b, idx) => (
                      <button
                        key={b.id}
                        type="button"
                        aria-label={`Slide ${idx + 1}`}
                        onClick={() => scrollToBannerSlide(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          promoIndex === idx ? 'w-5 bg-[#D95D39]' : 'w-1.5 bg-[#2B1B17]/20'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Category & Saved Favorites Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {wishlist.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSavedOnly((v) => !v)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-all active:scale-95 ${
                    savedOnly
                      ? 'bg-[#D95D39] text-white shadow-xs'
                      : 'bg-white text-[#D95D39] border border-[#D95D39]/25'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${savedOnly ? 'fill-white text-white' : 'fill-[#D95D39]'}`}
                  />
                  <span>
                    {t.catalog.savedOnly} ({wishlist.length})
                  </span>
                </button>
              )}
              {categoryIds.map((cat) => {
                const active = !savedOnly && selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                      active
                        ? 'bg-[#2B1B17] text-white shadow-xs'
                        : 'bg-white text-[#2B1B17]/80 border border-[#2B1B17]/10'
                    }`}
                  >
                    {getCategoryLabel(cat)}
                  </button>
                );
              })}
            </div>

            {/* Best Sellers Horizontal Row */}
            {!searchQuery && !savedOnly && selectedCategory === 'all' && (
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="font-display font-bold text-base text-[#2B1B17]">
                    {t.catalog.bestSellers}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('categories')}
                    className="text-xs font-semibold text-[#D95D39] min-h-[36px] px-1"
                  >
                    {t.catalog.allItems}
                  </button>
                </div>

                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {bestSellers.map((prod) => {
                    const name = getDisplayProductName(prod, language);
                    const pricing = calculateLinePricing(
                      prod.basePrice250g,
                      '250g',
                      1,
                      prod.wholesaleDiscount
                    );
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => setDetailTarget({ product: prod, size: '250g' })}
                        className="w-[152px] shrink-0 bg-white rounded-2xl border border-[#2B1B17]/8 overflow-hidden text-left shadow-[0_2px_10px_rgba(43,27,23,0.04)] active:scale-95 transition-transform"
                      >
                        <div className="p-1.5 pb-0">
                          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#F5EFE6]">
                            <ProductArtwork
                              product={prod}
                              language={language}
                              compact
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                        <div className="p-2.5 pt-2">
                          <div className="flex items-center gap-1 text-[10px] text-[#2B1B17]/65 mb-0.5">
                            <Star className="w-3 h-3 fill-[#F4A261] text-[#F4A261]" />
                            <span className="tabular-nums font-semibold">
                              {prod.rating.toFixed(1)}
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-xs text-[#2B1B17] line-clamp-1">
                            {name}
                          </h3>
                          <p className="font-display font-bold text-xs text-[#D95D39] tabular-nums mt-1">
                            {formatPrice(pricing.unitFinalTzs, currency)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Curated Value Combo Boxes */}
            {!searchQuery && selectedCategory === 'all' && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display font-bold text-base text-[#2B1B17] inline-flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-[#D95D39]" />
                    <span>{t.conversion.bundlesTitle}</span>
                  </h2>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {COMBO_BUNDLES.map((bundle) => {
                    const bundleTotal = getBundleTotalTzs(bundle.items);
                    return (
                      <div
                        key={bundle.id}
                        className="w-[244px] shrink-0 bg-white rounded-2xl border border-[#2B1B17]/10 overflow-hidden shadow-xs flex flex-col"
                      >
                        <div
                          className="relative h-24 overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${bundle.gradientFrom}, ${bundle.gradientTo})`,
                          }}
                        >
                          <img
                            src={bundle.image}
                            alt={language === 'sw' ? bundle.nameSw : bundle.nameEn}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#2B1B17]/90 text-[#F4A261] text-[9px] font-bold">
                            {language === 'sw' ? bundle.badgeSw : bundle.badgeEn}
                          </span>
                          <div className="absolute bottom-2 left-2.5 right-2.5 text-white font-display font-bold text-xs truncate">
                            {language === 'sw' ? bundle.nameSw : bundle.nameEn}
                          </div>
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                          <p className="text-[11px] text-[#2B1B17]/70 line-clamp-2">
                            {language === 'sw' ? bundle.subtitleSw : bundle.subtitleEn}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display font-bold text-xs text-[#D95D39] tabular-nums">
                              {formatPrice(bundleTotal, currency)}
                            </span>
                            <button
                              type="button"
                              onClick={() => addBundleToCart(bundle)}
                              className="min-h-[36px] px-2.5 rounded-xl bg-[#2B1B17] text-white text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap active:scale-95 transition-transform"
                            >
                              <ShoppingBag className="w-3 h-3 text-[#F4A261]" />
                              <span>{t.conversion.addBundleBtn}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 2-Column Product Grid */}
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="font-display font-bold text-base text-[#2B1B17]">
                  {getCategoryLabel(selectedCategory)}
                </h2>
                <span className="text-xs text-[#2B1B17]/60 tabular-nums">
                  {filteredProducts.length} {t.catalog.showingCount}
                </span>
              </div>

              {isFilteringSkeleton ? (
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-white rounded-2xl p-3 border border-[#2B1B17]/8 space-y-2.5 animate-pulse"
                    >
                      <div className="aspect-[4/3] rounded-xl bg-[#2B1B17]/10" />
                      <div className="h-3 w-3/4 rounded bg-[#2B1B17]/10" />
                      <div className="h-3 w-1/2 rounded bg-[#2B1B17]/10" />
                      <div className="h-10 rounded-xl bg-[#2B1B17]/10" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center border border-[#2B1B17]/10">
                  <h3 className="font-display font-bold text-sm text-[#2B1B17]">
                    {t.catalog.noResultsTitle}
                  </h3>
                  <p className="text-xs text-[#2B1B17]/65 mt-1">{t.catalog.noResultsBody}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSavedOnly(false);
                    }}
                    className="mt-3 min-h-[44px] px-4 rounded-xl bg-[#D95D39] text-white text-xs font-semibold"
                  >
                    {t.catalog.clearFilters}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      compact
                      onOpenDetail={(prod, sz) => setDetailTarget({ product: prod, size: sz })}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Customer Testimonials Strip */}
            <section className="pt-1">
              <h2 className="font-display font-bold text-base text-[#2B1B17] mb-2.5">
                {t.conversion.reviewsTitle}
              </h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {CUSTOMER_REVIEWS.map((rev) => (
                  <div
                    key={rev.id}
                    className="w-[260px] shrink-0 bg-white rounded-2xl p-3.5 border border-[#2B1B17]/10 space-y-2"
                  >
                    <div className="flex items-center gap-0.5 text-[#F4A261]">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-[#F4A261]" />
                      ))}
                    </div>
                    <p className="text-xs text-[#2B1B17]/80 leading-relaxed line-clamp-3">
                      “{language === 'sw' ? rev.quoteSw : rev.quoteEn}”
                    </p>
                    <div className="pt-1.5 border-t border-[#2B1B17]/8">
                      <div className="font-display font-bold text-xs text-[#2B1B17]">{rev.name}</div>
                      <div className="text-[10px] text-[#2B1B17]/60">
                        {language === 'sw' ? rev.roleLocationSw : rev.roleLocationEn}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <h1 className="font-display text-lg font-bold text-[#2B1B17]">
              {t.mobileTabs.categories}
            </h1>

            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {wishlist.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSavedOnly((v) => !v)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-all active:scale-95 ${
                    savedOnly
                      ? 'bg-[#D95D39] text-white'
                      : 'bg-white text-[#D95D39] border border-[#D95D39]/25'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${savedOnly ? 'fill-white text-white' : 'fill-[#D95D39]'}`}
                  />
                  <span>
                    {t.catalog.savedOnly} ({wishlist.length})
                  </span>
                </button>
              )}
              {categoryIds.map((cat) => {
                const active = !savedOnly && selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                      active
                        ? 'bg-[#2B1B17] text-white'
                        : 'bg-white text-[#2B1B17]/80 border border-[#2B1B17]/10'
                    }`}
                  >
                    {getCategoryLabel(cat)}
                  </button>
                );
              })}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-[#2B1B17]/10">
                <p className="text-sm font-semibold">{t.catalog.noResultsTitle}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSavedOnly(false);
                  }}
                  className="mt-3 min-h-[44px] px-4 rounded-xl bg-[#D95D39] text-white text-xs font-semibold"
                >
                  {t.catalog.clearFilters}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    compact
                    onOpenDetail={(prod, sz) => setDetailTarget({ product: prod, size: sz })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* WHOLESALE TAB */}
        {activeTab === 'wholesale' && (
          <div className="space-y-4">
            <div className="bg-[#2B1B17] text-[#FAF7F2] rounded-2xl p-4 space-y-1.5">
              <h1 className="font-display text-lg font-bold">{t.wholesaleSection.title}</h1>
              <p className="text-xs text-[#FAF7F2]/80 leading-relaxed">
                {t.wholesaleSection.subtitle}
              </p>
            </div>

            {sampleWholesaleProduct && sampleWholesaleProfit && (
              <div className="bg-white rounded-2xl p-3.5 border border-[#2B1B17]/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold text-xs text-[#2B1B17] inline-flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#D95D39]" />
                    <span>{t.conversion.profitTitle}</span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    +{sampleWholesaleProfit.marginPercent}%
                  </span>
                </div>
                <p className="text-[11px] text-[#2B1B17]/65">
                  {getDisplayProductName(sampleWholesaleProduct, language)}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] tabular-nums">
                  <div className="bg-[#FAF7F2] rounded-xl p-2">
                    <div className="text-[#2B1B17]/60 text-[10px]">{t.conversion.profitCost}</div>
                    <div className="font-bold text-[#2B1B17] mt-0.5">
                      {formatPrice(sampleWholesaleProfit.bulkCostTzs, currency)}
                    </div>
                  </div>
                  <div className="bg-[#FAF7F2] rounded-xl p-2">
                    <div className="text-[#2B1B17]/60 text-[10px]">{t.conversion.profitResale}</div>
                    <div className="font-bold text-[#2B1B17] mt-0.5">
                      {formatPrice(sampleWholesaleProfit.retailResaleValueTzs, currency)}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2">
                    <div className="text-emerald-800 text-[10px]">{t.conversion.profitNet}</div>
                    <div className="font-bold text-emerald-700 mt-0.5">
                      +{formatPrice(sampleWholesaleProfit.estimatedProfitTzs, currency)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  defaultSize="5kg"
                  compact
                  onOpenDetail={(prod, sz) => setDetailTarget({ product: prod, size: sz })}
                />
              ))}
            </div>
          </div>
        )}

        {/* CART TAB */}
        {activeTab === 'cart' && (
          <div>
            <h1 className="font-display text-lg font-bold text-[#2B1B17] mb-3">
              {t.cart.title}
            </h1>
            <CheckoutFlow
              mode="mobile-tab"
              onBrowseProducts={() => setActiveTab('home')}
            />
          </div>
        )}

        {/* MORE TAB — Native Grouped Mobile Settings & Store Hub */}
        {activeTab === 'more' && (
          <div className="space-y-5 pb-4">
            {/* Boutique Identity & Quick Actions Hero Card */}
            <div className="bg-[#2B1B17] text-[#FAF7F2] rounded-3xl p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {user?.displayName ? (
                    <div className="w-11 h-11 rounded-2xl bg-[#D95D39] text-white font-display font-extrabold text-base flex items-center justify-center shrink-0">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <BrandMark size="lg" />
                  )}
                  <div className="min-w-0">
                    <h1 className="font-display font-bold text-sm text-white truncate">
                      {user?.displayName || brandingConfig.siteName}
                    </h1>
                    <p className="text-[11px] text-[#FAF7F2]/70 truncate">
                      {user?.email || t.moreTab.guestSubtitle}
                    </p>
                  </div>
                </div>

                {user ? (
                  <button
                    type="button"
                    onClick={() => void signOutUser()}
                    className="min-h-[38px] px-3 rounded-xl bg-white/12 hover:bg-white/20 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95 transition-transform"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#F4A261]" />
                    <span>{t.cloudAuth.signOut}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    className="min-h-[38px] px-3 rounded-xl bg-[#F4A261] hover:bg-[#e8944f] text-[#2B1B17] text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95 transition-transform"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t.cloudAuth.signInGoogle}</span>
                  </button>
                )}
              </div>

              {/* 2-Column Quick Shortcuts */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOrdersModalOpen(true)}
                  className="min-h-[44px] px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <ClipboardList className="w-4 h-4 text-[#F4A261] shrink-0" />
                  <span className="truncate">{t.moreTab.trackOrdersAction}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (wishlist.length > 0) {
                      setSavedOnly(true);
                      setSelectedCategory('all');
                      setActiveTab('home');
                    } else {
                      setActiveTab('categories');
                    }
                  }}
                  className="min-h-[44px] px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Heart
                    className={`w-4 h-4 shrink-0 ${
                      wishlist.length > 0 ? 'fill-[#D95D39] text-[#D95D39]' : 'text-[#F4A261]'
                    }`}
                  />
                  <span className="truncate tabular-nums">
                    {t.moreTab.favoritesAction} ({wishlist.length})
                  </span>
                </button>
              </div>
            </div>

            {/* Section 1: Preferences & App Experience (Clean Grouped List) */}
            <section className="space-y-1.5">
              <h2 className="font-display font-bold text-xs text-[#2B1B17]/60 px-1.5">
                {t.moreTab.preferences}
              </h2>

              <div className="bg-white rounded-2xl border border-[#2B1B17]/10 divide-y divide-[#2B1B17]/8 overflow-hidden">
                {/* Language Row */}
                <div className="min-h-[56px] px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[#FAF7F2] text-[#D95D39] flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold text-[#2B1B17] whitespace-nowrap">
                      {t.moreTab.language}
                    </span>
                  </div>
                  <div className="inline-flex bg-[#FAF7F2] rounded-xl p-0.5 border border-[#2B1B17]/8 shrink-0">
                    {(['sw', 'en'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setLanguage(lang)}
                        className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                          language === lang
                            ? 'bg-[#2B1B17] text-white shadow-xs'
                            : 'text-[#2B1B17]/65'
                        }`}
                      >
                        {lang === 'en' ? 'English' : 'Kiswahili'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Currency Row */}
                <div className="min-h-[56px] px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[#FAF7F2] text-[#D95D39] flex items-center justify-center shrink-0">
                      <Coins className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold text-[#2B1B17] whitespace-nowrap">
                      {t.moreTab.currency}
                    </span>
                  </div>
                  <div className="inline-flex bg-[#FAF7F2] rounded-xl p-0.5 border border-[#2B1B17]/8 shrink-0">
                    {(['TZS', 'USD'] as const).map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setCurrency(curr)}
                        className={`min-h-[34px] px-3 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                          currency === curr
                            ? 'bg-[#2B1B17] text-white shadow-xs'
                            : 'text-[#2B1B17]/65'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Replay Splash Tour Row */}
                {hasActiveSplash && (
                  <button
                    type="button"
                    onClick={() => setShowSplash(true)}
                    className="w-full min-h-[56px] px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#FAF7F2]/60 active:bg-[#FAF7F2] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#FAF7F2] text-[#D95D39] flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold text-[#2B1B17] truncate">
                        {t.splash.replayBtn}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#2B1B17]/40 shrink-0" />
                  </button>
                )}

                {/* Install PWA Row (only when installable or iOS Safari) */}
                {!isInstalled && (isInstallable || isIOS) && (
                  <div className="px-3.5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#2B1B17] truncate">
                        {t.pwa.cardTitle}
                      </div>
                      <div className="text-[11px] text-[#2B1B17]/60 truncate">
                        {t.pwa.cardSubtitle}
                      </div>
                    </div>
                    <PWAInstallButton variant="header" />
                  </div>
                )}
              </div>
            </section>

            {/* Section 2: Recent Cloud Orders (clean hairline rows when signed in & present) */}
            {user && orders.some((o) => o.isCloudSynced) && (
              <section className="space-y-1.5">
                <div className="flex items-center justify-between px-1.5">
                  <h2 className="font-display font-bold text-xs text-[#2B1B17]/60">
                    {t.cloudAuth.myOrders}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOrdersModalOpen(true)}
                    className="text-[11px] font-semibold text-[#D95D39]"
                  >
                    {t.ordersTrack.trackThisOrder}
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-[#2B1B17]/10 divide-y divide-[#2B1B17]/8 overflow-hidden">
                  {orders
                    .filter((o) => o.isCloudSynced)
                    .slice(0, 3)
                    .map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setOrdersModalOpen(true)}
                        className="w-full min-h-[56px] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#FAF7F2]/60"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-[#2B1B17]">
                              #{order.orderCode || order.id}
                            </span>
                            <span aria-hidden="true" className="text-[#2B1B17]/30">
                              ·
                            </span>
                            <span className="font-semibold text-[#D95D39]">
                              {t.admin.orders.statuses[order.status]}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#2B1B17]/65 truncate mt-0.5">
                            {order.location}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono font-bold text-xs text-[#2B1B17] tabular-nums">
                            {formatRawAmount(order.totalInOrderCurrency, order.currency)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#2B1B17]/35" />
                        </div>
                      </button>
                    ))}
                </div>
              </section>
            )}

            {/* Section 3: Contact & Store Location (Single-line Native Tap Rows) */}
            <section className="space-y-1.5">
              <h2 className="font-display font-bold text-xs text-[#2B1B17]/60 px-1.5">
                {t.moreTab.contactUs}
              </h2>

              <div className="bg-white rounded-2xl border border-[#2B1B17]/10 divide-y divide-[#2B1B17]/8 overflow-hidden">
                <a
                  href="tel:+255651441441"
                  className="min-h-[56px] px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#FAF7F2]/60 active:bg-[#FAF7F2] transition-colors"
                >
                  <span className="inline-flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[#FAF7F2] text-[#D95D39] flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold text-[#2B1B17] whitespace-nowrap">
                      {t.moreTab.phone}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-xs font-semibold text-[#2B1B17]/80 tabular-nums whitespace-nowrap">
                      {PHONE_DISPLAY}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#2B1B17]/35" />
                  </span>
                </a>

                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[56px] px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-emerald-50/40 active:bg-emerald-50/70 transition-colors"
                >
                  <span className="inline-flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold text-[#2B1B17] whitespace-nowrap">
                      {t.moreTab.whatsapp}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                      {WHATSAPP_DISPLAY}
                    </span>
                    <ChevronRight className="w-4 h-4 text-emerald-600/50" />
                  </span>
                </a>

                <div className="min-h-[56px] px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[#FAF7F2] text-[#D95D39] flex items-center justify-center shrink-0">
                      <Instagram className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold text-[#2B1B17] whitespace-nowrap">
                      Instagram
                    </span>
                  </span>
                  <span className="text-xs font-medium text-[#2B1B17]/75 whitespace-nowrap">
                    @shakazulu_store
                  </span>
                </div>

                <div className="min-h-[56px] px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[#FAF7F2] text-[#D95D39] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#2B1B17] truncate">
                        Dar es Salaam, Tanzania
                      </div>
                      <div className="text-[11px] text-[#2B1B17]/55 inline-flex items-center gap-1 truncate">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate">{t.moreTab.hoursShort}</span>
                      </div>
                    </div>
                  </span>
                </div>
              </div>
            </section>

            {/* Section 4: Sleek Compact Store Admin Entry Row */}
            <button
              type="button"
              onClick={() => setAdminMode(true)}
              className="w-full min-h-[60px] px-3.5 py-3 rounded-2xl bg-white hover:bg-[#FAF7F2]/80 border border-[#2B1B17]/10 flex items-center justify-between gap-3 text-left active:scale-[0.99] transition-all shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-[#2B1B17] text-[#F4A261] flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="font-display font-bold text-xs text-[#2B1B17] truncate">
                    {t.moreTab.adminTitle}
                  </div>
                  <div className="text-[11px] text-[#2B1B17]/60 truncate">
                    {t.moreTab.adminSubtitle}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#2B1B17]/45 shrink-0" />
            </button>
          </div>
        )}
      </main>

      {/* Bottom Tab Bar (5 tabs, >=44px touch targets) */}
      <nav
        aria-label="Mobile Navigation"
        className={`${
          isScopedFrame ? 'absolute' : 'fixed'
        } bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#2B1B17]/10 grid grid-cols-5 items-center h-[62px] pb-safe`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
                active ? 'text-[#D95D39]' : 'text-[#2B1B17]/60'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.id === 'cart' && cartSummary.itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#D95D39] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {cartSummary.itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-tight truncate max-w-[68px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Native Product Bottom Sheet */}
      <ProductDetailModal
        product={detailTarget?.product ?? null}
        initialSize={detailTarget?.size ?? '250g'}
        isMobileLayout
        isScopedFrame={isScopedFrame}
        onClose={() => setDetailTarget(null)}
      />

      {/* Unified Guest & Cloud Order Tracker Modal */}
      <OrderTrackerModal
        open={ordersModalOpen}
        isMobileLayout
        isScopedFrame={isScopedFrame}
        onClose={() => setOrdersModalOpen(false)}
      />

      {/* 3-Screen Modern Mobile Splash Onboarding */}
      <MobileSplashOnboarding
        open={showSplash}
        isScopedFrame={isScopedFrame}
        onFinish={handleFinishSplash}
      />
    </div>
  );
};
