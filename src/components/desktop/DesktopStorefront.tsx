import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Gift,
  Heart,
  Instagram,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { COMBO_BUNDLES, CUSTOMER_REVIEWS } from '../../data/seedData';
import { CategoryId, Product, SizeOption } from '../../types';
import {
  calculateLinePricing,
  formatPrice,
  FREE_DAR_DELIVERY_THRESHOLD_TZS,
  getDisplayProductName,
  PHONE_DISPLAY,
  SIZE_OPTIONS,
  VACUUM_PACK_FEE_TZS,
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

type PriceRangeFilter = 'all' | 'budget' | 'mid' | 'bulk';
type SortOption = 'featured' | 'price_low' | 'price_high' | 'rating';

export const DesktopStorefront: React.FC = () => {
  const {
    products,
    categories: storeCategories,
    cart,
    cartSummary,
    wishlist,
    appliedCoupon,
    language,
    currency,
    vacuumPacked,
    user,
    signInWithGoogle,
    signOutUser,
    getCategoryLabel,
    isInWishlist,
    setLanguage,
    setCurrency,
    setVacuumPacked,
    setAdminMode,
    addToCart,
    addBundleToCart,
    updateCartItemQuantity,
    removeFromCart,
    brandingConfig,
    t,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [priceRange, setPriceRange] = useState<PriceRangeFilter>('all');
  const [defaultWeight, setDefaultWeight] = useState<SizeOption>('250g');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const [detailTarget, setDetailTarget] = useState<{
    product: Product;
    size: SizeOption;
  } | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const deepLinkHandledRef = useRef(false);

  const activeBanners = useMemo(
    () => (brandingConfig.bannersEnabled ? brandingConfig.banners : []),
    [brandingConfig.bannersEnabled, brandingConfig.banners]
  );

  useEffect(() => {
    if (bannerIndex >= activeBanners.length && activeBanners.length > 0) {
      setBannerIndex(0);
    }
  }, [bannerIndex, activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeBanners.length]);

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

  const crossSellProducts = useMemo(
    () =>
      products
        .filter((p) => p.inStock && !cart.some((c) => c.productId === p.id))
        .slice(0, 2),
    [products, cart]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (inStockOnly && !p.inStock) return false;
      if (savedOnly && !isInWishlist(p.id)) return false;

      if (q) {
        const catLabel = getCategoryLabel(p.category).toLowerCase();
        const matches =
          p.nameEn.toLowerCase().includes(q) ||
          p.nameSw.toLowerCase().includes(q) ||
          p.descriptionEn.toLowerCase().includes(q) ||
          p.descriptionSw.toLowerCase().includes(q) ||
          catLabel.includes(q);
        if (!matches) return false;
      }

      const activePricing = calculateLinePricing(
        p.basePrice250g,
        defaultWeight,
        1,
        p.wholesaleDiscount
      );
      if (priceRange === 'budget' && activePricing.unitFinalTzs >= 10000) return false;
      if (
        priceRange === 'mid' &&
        (activePricing.unitFinalTzs < 10000 || activePricing.unitFinalTzs > 35000)
      ) {
        return false;
      }
      if (priceRange === 'bulk' && activePricing.unitFinalTzs < 35000) return false;

      return true;
    });

    const sorted = [...list];
    if (sortBy === 'price_low') {
      sorted.sort((a, b) => a.basePrice250g - b.basePrice250g);
    } else if (sortBy === 'price_high') {
      sorted.sort((a, b) => b.basePrice250g - a.basePrice250g);
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    }
    return sorted;
  }, [
    products,
    searchQuery,
    selectedCategory,
    inStockOnly,
    savedOnly,
    isInWishlist,
    priceRange,
    defaultWeight,
    sortBy,
    getCategoryLabel,
  ]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleWholesaleFocus = () => {
    setDefaultWeight('5kg');
    setSelectedCategory('all');
    setPriceRange('all');
    scrollToSection('catalog-section');
  };

  const handleBannerAction = (target: string) => {
    if (target === 'wholesale') {
      handleWholesaleFocus();
    } else if (target === 'cart') {
      setCartDrawerOpen(true);
    } else {
      setSavedOnly(false);
      setSelectedCategory(target || 'all');
      scrollToSection('catalog-section');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setPriceRange('all');
    setDefaultWeight('250g');
    setInStockOnly(false);
    setSavedOnly(false);
    setSortBy('featured');
  };

  const categoryIds: CategoryId[] = useMemo(
    () => ['all', ...storeCategories.map((c) => c.id)],
    [storeCategories]
  );

  const collageCards = [
    {
      title: t.hero.collageUbuyu,
      subtitle: t.hero.collageUbuyuSub,
      emoji: '🍒',
      image: '/src/assets/images/product_red_ubuyu_1795463732331.jpg',
      gradient: 'linear-gradient(135deg, #D95D39 0%, #8C1D18 100%)',
      onClick: () => {
        setSelectedCategory('ubuyu_achari');
        scrollToSection('catalog-section');
      },
    },
    {
      title: t.hero.collageCashews,
      subtitle: t.hero.collageCashewsSub,
      emoji: '🥜',
      image: '/src/assets/images/product_roasted_cashews_1795463732839.jpg',
      gradient: 'linear-gradient(135deg, #E9B872 0%, #9E622B 100%)',
      onClick: () => {
        setSelectedCategory('nuts_seeds');
        scrollToSection('catalog-section');
      },
    },
    {
      title: t.hero.collageMasala,
      subtitle: t.hero.collageMasalaSub,
      emoji: '🫚',
      image: '/src/assets/images/product_pilau_masala_1795463732824.jpg',
      gradient: 'linear-gradient(135deg, #9C4221 0%, #3D1E14 100%)',
      onClick: () => {
        setSelectedCategory('spices_masalas');
        scrollToSection('catalog-section');
      },
    },
    {
      title: t.hero.collageExport,
      subtitle: t.hero.collageExportSub,
      emoji: '📦',
      image: '/src/assets/images/product_mango_achari_1795463734086.jpg',
      gradient: 'linear-gradient(135deg, #2B1B17 0%, #5B3529 100%)',
      onClick: handleWholesaleFocus,
    },
  ];

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

  const darProgressRatio = Math.min(
    1,
    cartSummary.subtotalAfterPromoTzs / FREE_DAR_DELIVERY_THRESHOLD_TZS
  );
  const darRemainingTzs = Math.max(
    0,
    FREE_DAR_DELIVERY_THRESHOLD_TZS - cartSummary.subtotalAfterPromoTzs
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2B1B17]">
      {/* Slim Utility Strip (EN/SW, TZS/USD, Store Admin Mode) */}
      <div className="bg-[#2B1B17] text-[#FAF7F2] text-xs">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[#FAF7F2]/80 whitespace-nowrap">
            <span>{t.locationTag}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{PHONE_DISPLAY}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">WhatsApp {WHATSAPP_DISPLAY}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Language Switch */}
            <div
              className="inline-flex items-center bg-white/10 rounded-lg p-0.5"
              role="group"
              aria-label="Language"
            >
              {(['en', 'sw'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase transition-colors ${
                    language === lang
                      ? 'bg-[#F4A261] text-[#2B1B17]'
                      : 'text-[#FAF7F2]/80 hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Currency Switch */}
            <div
              className="inline-flex items-center bg-white/10 rounded-lg p-0.5"
              role="group"
              aria-label="Currency"
            >
              {(['TZS', 'USD'] as const).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrency(curr)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                    currency === curr
                      ? 'bg-[#F4A261] text-[#2B1B17]'
                      : 'text-[#FAF7F2]/80 hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <PWAInstallButton variant="header" />

            <button
              type="button"
              onClick={() => setMyOrdersOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-white/12 hover:bg-white/20 text-[#FAF7F2] text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ClipboardList className="w-3 h-3 text-[#F4A261]" />
              <span>{t.cloudAuth.myOrders}</span>
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => void signOutUser()}
                title={user.email || ''}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#FAF7F2]/85 text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3 h-3" />
                <span>{t.cloudAuth.signOut}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="px-2.5 py-1 rounded-lg bg-white/12 hover:bg-white/20 text-[#FAF7F2] text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3 h-3 text-[#F4A261]" />
                <span>{t.cloudAuth.signInGoogle}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setAdminMode(true)}
              className="px-2.5 py-1 rounded-lg bg-white/12 hover:bg-white/20 text-[#FAF7F2] text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.adminMode}
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#2B1B17]/10">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between gap-6">
          {/* Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-xl font-extrabold tracking-tight text-[#2B1B17] whitespace-nowrap shrink-0 flex items-center gap-2.5"
          >
            <BrandMark size="sm" />
            <span>{brandingConfig.siteName}</span>
          </a>

          {/* Wide Search Bar */}
          <div className="flex-1 max-w-md relative">
            <Search
              className="w-4 h-4 text-[#2B1B17]/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/12 text-sm text-[#2B1B17] placeholder:text-[#2B1B17]/45 focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            />
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#2B1B17]/80">
            <button
              type="button"
              onClick={() => {
                setDefaultWeight('250g');
                scrollToSection('catalog-section');
              }}
              className="hover:text-[#D95D39] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.shopRetail}
            </button>
            <button
              type="button"
              onClick={handleWholesaleFocus}
              className="hover:text-[#D95D39] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.wholesale}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about-section')}
              className="hover:text-[#D95D39] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.about}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('footer-section')}
              className="hover:text-[#D95D39] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.contact}
            </button>
          </nav>

          {/* Primary Action: Cart Drawer Trigger */}
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            className="h-11 px-4 rounded-xl bg-[#2B1B17] hover:bg-[#3F2923] text-white text-sm font-semibold inline-flex items-center gap-2.5 transition-all active:scale-95 whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4 text-[#F4A261]" />
            <span>{t.mobileTabs.cart}</span>
            <span className="px-2 py-0.5 rounded-md bg-[#D95D39] text-white text-xs font-bold tabular-nums">
              {cartSummary.itemCount}
            </span>
          </button>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Split Hero */}
        <section className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Copy & CTAs */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
              <p className="text-xs font-semibold text-[#D95D39] tracking-wide">
                {t.hero.kicker}
              </p>
              <h1
                className="font-display font-extrabold text-[#2B1B17] tracking-tight leading-[1.12] max-w-xl"
                style={{ fontSize: 'clamp(2.2rem, 3.6vw, 3.3rem)', textWrap: 'balance' }}
              >
                {t.hero.title}
              </h1>
              <p className="text-base text-[#2B1B17]/75 leading-relaxed max-w-lg">
                {t.hero.subtitle}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDefaultWeight('250g');
                    scrollToSection('catalog-section');
                  }}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white font-semibold text-sm inline-flex items-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                >
                  <span>{t.hero.ctaRetail}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleWholesaleFocus}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-white hover:bg-[#F3ECE2] text-[#2B1B17] border border-[#2B1B17]/15 font-semibold text-sm inline-flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                >
                  <span>{t.hero.ctaWholesale}</span>
                </button>
              </div>
            </div>

            {/* Right 2x2 Studio Specialty Collage */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              {collageCards.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={card.onClick}
                  className="group relative rounded-2xl p-5 text-left text-white overflow-hidden min-h-[176px] flex flex-col justify-end shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: card.gradient }}
                >
                  <img
                    src={card.image}
                    alt={card.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/15"
                  />
                  <div className="relative z-10 mt-4">
                    <h2 className="font-display font-bold text-base leading-snug">
                      {card.title}
                    </h2>
                    <p className="text-xs text-white/85 mt-0.5">{card.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Admin-Managed Promotional Slide Banner Carousel */}
        {activeBanners.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 pb-8">
            <div className="relative rounded-3xl overflow-hidden shadow-sm border border-[#2B1B17]/10">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
              >
                {activeBanners.map((banner) => {
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
                      className="w-full shrink-0 relative min-h-[196px] md:min-h-[216px] px-8 md:px-12 py-8 flex items-center justify-between gap-6 text-white"
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
                        className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20"
                      />
                      <div className="relative z-10 max-w-xl space-y-2">
                        <h2 className="font-display font-extrabold text-2xl md:text-3xl leading-tight">
                          {bannerTitle}
                        </h2>
                        {bannerSubtitle && (
                          <p className="text-sm text-white/85 leading-relaxed max-w-lg">
                            {bannerSubtitle}
                          </p>
                        )}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleBannerAction(banner.target)}
                            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#2B1B17] text-xs font-bold inline-flex items-center gap-2 shadow-sm active:scale-95 transition-transform whitespace-nowrap"
                          >
                            <span>{bannerCta}</span>
                            <ArrowRight className="w-4 h-4 text-[#D95D39]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeBanners.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous banner"
                    onClick={() =>
                      setBannerIndex((prev) =>
                        prev === 0 ? activeBanners.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next banner"
                    onClick={() =>
                      setBannerIndex((prev) => (prev + 1) % activeBanners.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3.5 right-6 z-20 flex items-center gap-1.5">
                    {activeBanners.map((b, idx) => (
                      <button
                        key={b.id}
                        type="button"
                        aria-label={`Banner ${idx + 1}`}
                        onClick={() => setBannerIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          bannerIndex === idx ? 'w-6 bg-[#F4A261]' : 'w-2 bg-white/45 hover:bg-white/75'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Curated Value Combo Boxes */}
        <section className="max-w-7xl mx-auto px-6 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#2B1B17] inline-flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#D95D39]" />
                <span>{t.conversion.bundlesTitle}</span>
              </h2>
              <p className="text-xs text-[#2B1B17]/65 mt-0.5">{t.conversion.bundlesSubtitle}</p>
            </div>
            <span className="text-xs font-semibold text-[#D95D39]">
              {t.conversion.trustFresh}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COMBO_BUNDLES.map((bundle) => {
              const bundleTotal = getBundleTotalTzs(bundle.items);
              return (
                <div
                  key={bundle.id}
                  className="bg-white rounded-2xl border border-[#2B1B17]/10 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
                >
                  <div
                    className="relative h-36 overflow-hidden"
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
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#2B1B17]/90 text-[#F4A261] text-[10px] font-bold">
                      {language === 'sw' ? bundle.badgeSw : bundle.badgeEn}
                    </span>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="font-display font-bold text-base leading-tight">
                        {language === 'sw' ? bundle.nameSw : bundle.nameEn}
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <p className="text-xs text-[#2B1B17]/75 leading-relaxed">
                      {language === 'sw' ? bundle.subtitleSw : bundle.subtitleEn}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2B1B17]/8">
                      <span className="font-display font-bold text-base text-[#D95D39] tabular-nums">
                        {formatPrice(bundleTotal, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          addBundleToCart(bundle);
                          setCartDrawerOpen(true);
                        }}
                        className="min-h-[40px] px-3.5 rounded-xl bg-[#2B1B17] hover:bg-[#3F2923] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95 transition-transform"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-[#F4A261]" />
                        <span>{t.conversion.addBundleBtn}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Catalog Section: Left Sidebar Filters + 3-Column Grid */}
        <section id="catalog-section" className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#2B1B17]/10">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#2B1B17]">
                {t.catalog.title}
              </h2>
              <p className="text-xs text-[#2B1B17]/60 mt-0.5 tabular-nums">
                {filteredProducts.length} {t.catalog.showingCount}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="desktop-sort" className="text-xs font-semibold text-[#2B1B17]/70">
                {t.catalog.sortBy}:
              </label>
              <select
                id="desktop-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-10 px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs font-semibold text-[#2B1B17] focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
              >
                <option value="featured">{t.catalog.sortFeatured}</option>
                <option value="price_low">{t.catalog.sortPriceLow}</option>
                <option value="price_high">{t.catalog.sortPriceHigh}</option>
                <option value="rating">{t.catalog.sortRating}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-6 items-start">
            {/* Left Filter Sidebar */}
            <aside className="md:col-span-3 bg-white rounded-2xl border border-[#2B1B17]/10 p-5 space-y-6 md:sticky md:top-24">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-[#2B1B17] inline-flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#D95D39]" />
                  {t.catalog.filters}
                </h3>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-[#D95D39] hover:underline"
                >
                  {t.catalog.clearFilters}
                </button>
              </div>

              {/* Category Filter */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-[#2B1B17]/70 mb-2">
                  {t.catalog.category}
                </span>
                {categoryIds.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                        active
                          ? 'bg-[#2B1B17] text-white'
                          : 'text-[#2B1B17]/80 hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <span>{getCategoryLabel(cat)}</span>
                      {active && <Check className="w-3.5 h-3.5 text-[#F4A261]" />}
                    </button>
                  );
                })}
              </div>

              {/* Weight Filter */}
              <div className="space-y-2 pt-2 border-t border-[#2B1B17]/8">
                <span className="block text-xs font-semibold text-[#2B1B17]/70">
                  {t.catalog.weightFilter}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {SIZE_OPTIONS.map((opt) => {
                    const active = defaultWeight === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDefaultWeight(opt.id)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          active
                            ? 'border-[#D95D39] bg-[#D95D39]/10 text-[#D95D39]'
                            : 'border-[#2B1B17]/12 bg-[#FAF7F2] text-[#2B1B17]/75 hover:border-[#2B1B17]/25'
                        }`}
                      >
                        {opt.id === '5kg' ? '5kg Bulk' : opt.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="space-y-1.5 pt-2 border-t border-[#2B1B17]/8">
                <span className="block text-xs font-semibold text-[#2B1B17]/70 mb-2">
                  {t.catalog.priceRange}
                </span>
                {(
                  [
                    { id: 'all', label: t.catalog.priceAll },
                    { id: 'budget', label: t.catalog.priceBudget },
                    { id: 'mid', label: t.catalog.priceMid },
                    { id: 'bulk', label: t.catalog.priceBulk },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPriceRange(item.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      priceRange === item.id
                        ? 'bg-[#D95D39]/12 text-[#D95D39] font-semibold'
                        : 'text-[#2B1B17]/75 hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* In Stock & Saved Favorites Toggles */}
              <div className="space-y-3 pt-3 border-t border-[#2B1B17]/8">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-[#2B1B17]">
                    {t.catalog.inStockOnly}
                  </span>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 accent-[#D95D39]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-[#2B1B17] inline-flex items-center gap-1.5">
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        wishlist.length > 0 ? 'fill-[#D95D39] text-[#D95D39]' : 'text-[#2B1B17]/50'
                      }`}
                    />
                    <span>{t.catalog.savedOnly}</span>
                    {wishlist.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-md bg-[#FAF7F2] border border-[#2B1B17]/12 text-[10px] font-bold tabular-nums">
                        {wishlist.length}
                      </span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={savedOnly}
                    onChange={(e) => setSavedOnly(e.target.checked)}
                    className="w-4 h-4 accent-[#D95D39]"
                  />
                </label>
              </div>
            </aside>

            {/* Product Grid */}
            <div className="md:col-span-9">
              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#2B1B17]/10 p-12 text-center">
                  <Filter className="w-8 h-8 text-[#D95D39] mx-auto mb-3" />
                  <h3 className="font-display text-lg font-bold text-[#2B1B17]">
                    {t.catalog.noResultsTitle}
                  </h3>
                  <p className="text-sm text-[#2B1B17]/65 mt-1">{t.catalog.noResultsBody}</p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-[#D95D39] text-white text-xs font-semibold hover:bg-[#C14C2B]"
                  >
                    {t.catalog.clearFilters}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      defaultSize={defaultWeight}
                      onOpenDetail={(prod, sz) => setDetailTarget({ product: prod, size: sz })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Wholesale & Story Section */}
        <section id="about-section" className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-[#2B1B17] text-[#FAF7F2] rounded-3xl p-8 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-3">
              <h2 className="font-display text-2xl md:text-3xl font-bold leading-tight">
                {t.wholesaleSection.title}
              </h2>
              <p className="text-sm text-[#FAF7F2]/80 leading-relaxed">
                {t.wholesaleSection.subtitle}
              </p>
              <p className="text-xs text-[#F4A261] leading-relaxed pt-2">
                {t.aboutSection.body}
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/8 rounded-2xl p-5 border border-white/10 space-y-2">
                <Package className="w-6 h-6 text-[#F4A261]" />
                <h3 className="font-display font-bold text-sm">{t.wholesaleSection.card1Title}</h3>
                <p className="text-xs text-[#FAF7F2]/75 leading-relaxed">
                  {t.wholesaleSection.card1Body}
                </p>
              </div>
              <div className="bg-white/8 rounded-2xl p-5 border border-white/10 space-y-2">
                <Truck className="w-6 h-6 text-[#F4A261]" />
                <h3 className="font-display font-bold text-sm">{t.wholesaleSection.card2Title}</h3>
                <p className="text-xs text-[#FAF7F2]/75 leading-relaxed">
                  {t.wholesaleSection.card2Body}
                </p>
              </div>
              <div className="bg-white/8 rounded-2xl p-5 border border-white/10 space-y-2">
                <ShieldCheck className="w-6 h-6 text-[#F4A261]" />
                <h3 className="font-display font-bold text-sm">{t.wholesaleSection.card3Title}</h3>
                <p className="text-xs text-[#FAF7F2]/75 leading-relaxed">
                  {t.wholesaleSection.card3Body}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Reviews Strip */}
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold text-[#2B1B17] mb-4">
              {t.conversion.reviewsTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CUSTOMER_REVIEWS.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl p-5 border border-[#2B1B17]/10 space-y-3"
                >
                  <div className="flex items-center gap-0.5 text-[#F4A261]">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-[#F4A261]" />
                    ))}
                  </div>
                  <p className="text-xs text-[#2B1B17]/80 leading-relaxed">
                    “{language === 'sw' ? rev.quoteSw : rev.quoteEn}”
                  </p>
                  <div className="pt-2 border-t border-[#2B1B17]/8">
                    <div className="font-display font-bold text-xs text-[#2B1B17]">{rev.name}</div>
                    <div className="text-[11px] text-[#2B1B17]/60">
                      {language === 'sw' ? rev.roleLocationSw : rev.roleLocationEn}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Multi-column Footer */}
      <footer id="footer-section" className="bg-white border-t border-[#2B1B17]/10 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="font-display text-lg font-extrabold text-[#2B1B17] flex items-center gap-2">
              <BrandMark size="xs" />
              <span>{brandingConfig.siteName}</span>
            </div>
            <p className="text-sm text-[#2B1B17]/70 max-w-md">{t.footer.tagline}</p>
            <p className="text-xs text-[#2B1B17]/55">{t.footer.hours}</p>
          </div>

          <div className="space-y-2.5">
            <h3 className="font-display font-bold text-sm text-[#2B1B17]">
              {t.footer.quickLinks}
            </h3>
            <ul className="space-y-1.5 text-xs text-[#2B1B17]/75">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('catalog-section')}
                  className="hover:text-[#D95D39]"
                >
                  {t.nav.shopRetail}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleWholesaleFocus}
                  className="hover:text-[#D95D39]"
                >
                  {t.nav.wholesale}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setAdminMode(true)}
                  className="font-semibold text-[#D95D39] hover:underline"
                >
                  {t.nav.adminMode}
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h3 className="font-display font-bold text-sm text-[#2B1B17]">
              {t.footer.contactTitle}
            </h3>
            <ul className="space-y-2 text-xs text-[#2B1B17]/75">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#D95D39]" />
                <a href="tel:+255651441441" className="hover:text-[#D95D39] tabular-nums">
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#D95D39] tabular-nums"
                >
                  {WHATSAPP_DISPLAY}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="w-3.5 h-3.5 text-[#D95D39]" />
                <span>@shakazulu_store (IG / TikTok / FB)</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#D95D39]" />
                <span>Dar es Salaam, Tanzania</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#2B1B17]/8 py-4 px-6 text-center text-xs text-[#2B1B17]/55">
          © 2026 {brandingConfig.siteName} · Dar es Salaam, Tanzania
        </div>
      </footer>

      {/* Floating WhatsApp Chat Button */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp Chat"
        className="fixed bottom-5 right-5 z-30 h-12 px-4 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white shadow-lg flex items-center gap-2 text-xs font-semibold transition-transform hover:scale-105 active:scale-95"
      >
        <MessageCircle className="w-4 h-4" />
        <span>WhatsApp</span>
      </a>

      {/* Quick View Product Modal */}
      <ProductDetailModal
        product={detailTarget?.product ?? null}
        initialSize={detailTarget?.size ?? '250g'}
        isMobileLayout={false}
        onClose={() => setDetailTarget(null)}
      />

      {/* Right-Side Slide-Over Cart Drawer */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="flex-1" onClick={() => setCartDrawerOpen(false)} />
          <aside
            className="w-full max-w-md bg-[#FAF7F2] h-full shadow-2xl flex flex-col animate-drawer-left"
            aria-label={t.cart.title}
          >
            <div className="px-5 py-4 bg-white border-b border-[#2B1B17]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#D95D39]" />
                <h2 className="font-display font-bold text-base text-[#2B1B17]">
                  {t.cart.title} ({cartSummary.itemCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCartDrawerOpen(false)}
                aria-label="Close cart"
                className="w-9 h-9 rounded-full hover:bg-[#FAF7F2] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-[#2B1B17]/10 mt-6">
                  <ShoppingBag className="w-10 h-10 text-[#D95D39] mx-auto mb-3" />
                  <h3 className="font-display font-bold text-base text-[#2B1B17]">
                    {t.cart.emptyTitle}
                  </h3>
                  <p className="text-xs text-[#2B1B17]/65 mt-1">{t.cart.emptyBody}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCartDrawerOpen(false);
                      scrollToSection('catalog-section');
                    }}
                    className="mt-4 px-4 py-2.5 rounded-xl bg-[#D95D39] text-white text-xs font-semibold"
                  >
                    {t.cart.browseCatalog}
                  </button>
                </div>
              ) : (
                <>
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
                        className={`bg-white rounded-2xl p-3 border ${
                          !product.inStock ? 'border-red-300 bg-red-50/40' : 'border-[#2B1B17]/10'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                            <ProductArtwork
                              product={product}
                              language={language}
                              compact
                              className="w-full h-full"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-display font-bold text-xs text-[#2B1B17] truncate">
                                  {name}
                                </h4>
                                <span className="text-[11px] text-[#2B1B17]/60">
                                  {item.size === '5kg' ? '5kg Bulk Bucket' : item.size}
                                  {pricing.isWholesaleApplied &&
                                    ` · ${t.product.wholesaleBadge} (-${pricing.discountPercent}%)`}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.productId, item.size)}
                                aria-label="Remove item"
                                className="text-[#2B1B17]/40 hover:text-red-600 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {!product.inStock && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-700">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{t.cart.outOfStockWarning}</span>
                              </div>
                            )}

                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1 bg-[#FAF7F2] rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCartItemQuantity(
                                      item.productId,
                                      item.size,
                                      item.quantity - 1
                                    )
                                  }
                                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-xs font-bold tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCartItemQuantity(
                                      item.productId,
                                      item.size,
                                      item.quantity + 1
                                    )
                                  }
                                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="font-display font-bold text-sm text-[#D95D39] tabular-nums">
                                {formatPrice(pricing.lineFinalTzs, currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-[#2B1B17]/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vacuumPacked}
                      onChange={(e) => setVacuumPacked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#D95D39]"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-[#2B1B17]">{t.cart.vacuumLabel}</div>
                      <div className="text-[#2B1B17]/60 mt-0.5">{t.cart.vacuumHint}</div>
                    </div>
                  </label>

                  {crossSellProducts.length > 0 && (
                    <div className="bg-white rounded-2xl p-3 border border-[#2B1B17]/10 space-y-2">
                      <div className="text-xs font-bold text-[#2B1B17]">
                        {t.cart.crossSellTitle}
                      </div>
                      <div className="space-y-2">
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
                                <div className="text-xs font-bold text-[#2B1B17] truncate">
                                  {prodName}
                                </div>
                                <div className="text-[11px] font-semibold text-[#D95D39] tabular-nums">
                                  {formatPrice(pricing.unitFinalTzs, currency)}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => addToCart(prod.id, '250g', 1)}
                                className="min-h-[32px] px-2.5 rounded-lg bg-[#2B1B17] hover:bg-[#3F2923] text-white text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 active:scale-95"
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
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 bg-white border-t border-[#2B1B17]/10 space-y-3">
                {/* Free Dar Delivery Progress Bar */}
                <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/10 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                    <span className="inline-flex items-center gap-1.5 text-[#2B1B17]">
                      <Truck className="w-3.5 h-3.5 text-[#D95D39]" />
                      {darRemainingTzs === 0
                        ? t.conversion.freeDeliveryUnlocked
                        : `${formatPrice(darRemainingTzs, currency)} ${t.conversion.freeDeliveryProgress}`}
                    </span>
                    <span className="tabular-nums text-[#2B1B17]/65">
                      {Math.round(darProgressRatio * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#2B1B17]/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        darRemainingTzs === 0 ? 'bg-emerald-600' : 'bg-[#D95D39]'
                      }`}
                      style={{ width: `${Math.round(darProgressRatio * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#2B1B17]/75">
                    <span>{t.cart.subtotal}</span>
                    <span className="font-semibold tabular-nums">
                      {formatPrice(cartSummary.subtotalTzs, currency)}
                    </span>
                  </div>
                  {cartSummary.savingsTzs > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>{t.cart.wholesaleSavings}</span>
                      <span className="tabular-nums">
                        -{formatPrice(cartSummary.savingsTzs, currency)}
                      </span>
                    </div>
                  )}
                  {appliedCoupon && cartSummary.promoDiscountTzs > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {t.conversion.promoDiscount} ({appliedCoupon.code})
                      </span>
                      <span className="tabular-nums">
                        -{formatPrice(cartSummary.promoDiscountTzs, currency)}
                      </span>
                    </div>
                  )}
                  {vacuumPacked && (
                    <div className="flex justify-between text-[#2B1B17]/75">
                      <span>{t.cart.vacuumFee}</span>
                      <span className="font-semibold tabular-nums">
                        +{formatPrice(VACUUM_PACK_FEE_TZS, currency)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={cartSummary.hasOutOfStockItem}
                  onClick={() => {
                    setCartDrawerOpen(false);
                    setCheckoutModalOpen(true);
                  }}
                  className="w-full min-h-[48px] px-4 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] disabled:opacity-45 text-white font-semibold text-sm flex items-center justify-between transition-all active:scale-95"
                >
                  <span>{t.cart.checkoutBtn}</span>
                  <span className="font-display font-bold tabular-nums">
                    {formatPrice(
                      cartSummary.subtotalAfterPromoTzs + (vacuumPacked ? VACUUM_PACK_FEE_TZS : 0),
                      currency
                    )}
                  </span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Desktop Checkout Modal */}
      {checkoutModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={t.checkout.title}
        >
          <div className="absolute inset-0" onClick={() => setCheckoutModalOpen(false)} />
          <div className="relative z-10 bg-[#FAF7F2] rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-modal-in">
            <div className="px-6 py-4 bg-white border-b border-[#2B1B17]/10 flex items-center justify-between shrink-0">
              <h2 className="font-display font-bold text-lg text-[#2B1B17]">
                {t.checkout.title}
              </h2>
              <button
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                aria-label="Close checkout"
                className="w-9 h-9 rounded-full hover:bg-[#FAF7F2] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <CheckoutFlow
                mode="desktop-modal"
                onBrowseProducts={() => scrollToSection('catalog-section')}
                onCloseDesktop={() => setCheckoutModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Unified Guest & Cloud Order Tracker Modal */}
      <OrderTrackerModal open={myOrdersOpen} onClose={() => setMyOrdersOpen(false)} />
    </div>
  );
};
