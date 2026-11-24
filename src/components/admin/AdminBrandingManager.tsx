import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { DEFAULT_BRANDING_CONFIG, SPLASH_PRESET_IMAGES } from '../../data/seedData';
import { BannerSlide, BrandingConfig } from '../../types';
import { compressImageFile } from '../../utils/imageUpload';
import { BrandMark } from '../common/BrandMark';

const MAX_BANNERS = 6;

const BANNER_GRADIENTS = [
  { from: '#D95D39', to: '#8C1D18' },
  { from: '#2B1B17', to: '#5B3529' },
  { from: '#C97B4B', to: '#7F4F24' },
  { from: '#9C4221', to: '#3D1E14' },
  { from: '#583123', to: '#2B1B17' },
];

export const AdminBrandingManager: React.FC = () => {
  const {
    language,
    categories: storeCategories,
    getCategoryLabel,
    brandingConfig,
    updateBrandingConfig,
    resetBrandingConfig,
    t,
  } = useStore();

  const [draft, setDraft] = useState<BrandingConfig>(brandingConfig);
  const [expandedBannerId, setExpandedBannerId] = useState<string | null>(
    brandingConfig.banners[0]?.id ?? null
  );
  const [isDirty, setIsDirty] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) {
      setDraft(brandingConfig);
    }
  }, [brandingConfig, isDirty]);

  const commitConfig = (next: BrandingConfig) => {
    setDraft(next);
    setIsDirty(false);
    updateBrandingConfig(next);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTarget('logo');
    try {
      const compressed = await compressImageFile(file, 360, 95000, true);
      commitConfig({ ...draft, logoUrl: compressed });
    } catch {
      // Ignore invalid image safely
    } finally {
      setUploadingTarget(null);
      e.target.value = '';
    }
  };

  const handleToggleBannersEnabled = () => {
    commitConfig({ ...draft, bannersEnabled: !draft.bannersEnabled });
  };

  const handleAddBanner = () => {
    if (draft.banners.length >= MAX_BANNERS) return;
    const newId = `banner-${Date.now()}`;
    const presetImg =
      SPLASH_PRESET_IMAGES[draft.banners.length % SPLASH_PRESET_IMAGES.length]?.url;
    const grad = BANNER_GRADIENTS[draft.banners.length % BANNER_GRADIENTS.length];

    const newBanner: BannerSlide = {
      id: newId,
      titleEn: t.admin.branding.defaultTitleEn,
      titleSw: t.admin.branding.defaultTitleSw,
      subtitleEn: t.admin.branding.defaultSubtitleEn,
      subtitleSw: t.admin.branding.defaultSubtitleSw,
      ctaEn: t.admin.branding.defaultCtaEn,
      ctaSw: t.admin.branding.defaultCtaSw,
      target: 'all',
      image: presetImg,
      gradientFrom: grad.from,
      gradientTo: grad.to,
    };

    const next: BrandingConfig = {
      ...draft,
      banners: [...draft.banners, newBanner],
    };
    setExpandedBannerId(newId);
    commitConfig(next);
  };

  const handleRemoveBanner = (bannerId: string) => {
    const remaining = draft.banners.filter((b) => b.id !== bannerId);
    if (expandedBannerId === bannerId) {
      setExpandedBannerId(remaining[0]?.id ?? null);
    }
    commitConfig({ ...draft, banners: remaining });
  };

  const handleMoveBanner = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= draft.banners.length) return;
    const nextBanners = [...draft.banners];
    const [moved] = nextBanners.splice(index, 1);
    nextBanners.splice(targetIdx, 0, moved);
    commitConfig({ ...draft, banners: nextBanners });
  };

  const handleBannerChange = (
    bannerId: string,
    updates: Partial<BannerSlide>,
    autoCommit = false
  ) => {
    const nextBanners = draft.banners.map((b) =>
      b.id === bannerId ? { ...b, ...updates } : b
    );
    const nextConfig: BrandingConfig = { ...draft, banners: nextBanners };
    if (autoCommit) {
      commitConfig(nextConfig);
    } else {
      setDraft(nextConfig);
      setIsDirty(true);
    }
  };

  const handleUploadBannerImage = async (
    bannerId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTarget(bannerId);
    try {
      const compressed = await compressImageFile(file, 960, 120000);
      handleBannerChange(bannerId, { image: compressed }, true);
    } catch {
      // Ignore invalid image safely
    } finally {
      setUploadingTarget(null);
      e.target.value = '';
    }
  };

  const handleResetDefaults = () => {
    setDraft(DEFAULT_BRANDING_CONFIG);
    setExpandedBannerId(DEFAULT_BRANDING_CONFIG.banners[0]?.id ?? null);
    setIsDirty(false);
    resetBrandingConfig();
  };

  const getTargetLabel = (target: string) => {
    if (target === 'all') return t.admin.branding.targets.all;
    if (target === 'wholesale') return t.admin.branding.targets.wholesale;
    if (target === 'cart') return t.admin.branding.targets.cart;
    return getCategoryLabel(target);
  };

  return (
    <div className="space-y-5">
      {/* Header & Global Save / Reset Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg text-[#2B1B17]">
            {t.admin.branding.title}
          </h2>
          <p className="text-xs text-[#2B1B17]/65 mt-0.5">{t.admin.branding.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="min-h-[40px] px-3.5 rounded-xl bg-white hover:bg-[#F3ECE2] border border-[#2B1B17]/15 text-[#2B1B17] text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#2B1B17]/70" />
            <span>{t.admin.branding.resetDefaults}</span>
          </button>

          <button
            type="button"
            onClick={() => commitConfig(draft)}
            className="min-h-[40px] px-4 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{t.admin.branding.saveBtn}</span>
          </button>
        </div>
      </div>

      {isDirty && (
        <div className="bg-[#F4A261]/20 border border-[#D95D39]/40 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#2B1B17]">{t.admin.branding.unsavedHint}</span>
          <button
            type="button"
            onClick={() => commitConfig(draft)}
            className="min-h-[38px] px-4 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white text-xs font-bold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t.admin.branding.saveBtn}</span>
          </button>
        </div>
      )}

      {/* Section 1: Website Name & Store Logo */}
      <div className="bg-white rounded-2xl border border-[#2B1B17]/10 p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold text-base text-[#2B1B17] inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D95D39]" />
            <span>{t.admin.branding.identityTitle}</span>
          </h3>
        </div>

        {/* Live Header Preview */}
        <div className="bg-[#FAF7F2] rounded-2xl border border-[#2B1B17]/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark
              size="md"
              siteNameOverride={draft.siteName}
              logoUrlOverride={draft.logoUrl}
            />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#2B1B17]/50">
                {t.admin.branding.livePreviewLabel}
              </div>
              <div className="font-display font-extrabold text-base text-[#2B1B17] truncate">
                {draft.siteName.trim() || DEFAULT_BRANDING_CONFIG.siteName}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#D95D39] bg-white px-3 py-1 rounded-xl border border-[#2B1B17]/10 whitespace-nowrap">
            {draft.siteShortName.trim() || DEFAULT_BRANDING_CONFIG.siteShortName}
          </span>
        </div>

        {/* Website Name & Short Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#2B1B17]/80 mb-1">
              {t.admin.branding.siteNameLabel}
            </label>
            <input
              type="text"
              maxLength={60}
              value={draft.siteName}
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, siteName: e.target.value }));
                setIsDirty(true);
              }}
              placeholder={t.admin.branding.siteNamePlaceholder}
              className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B1B17]/80 mb-1">
              {t.admin.branding.siteShortNameLabel}
            </label>
            <input
              type="text"
              maxLength={32}
              value={draft.siteShortName}
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, siteShortName: e.target.value }));
                setIsDirty(true);
              }}
              placeholder={t.admin.branding.siteShortPlaceholder}
              className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            />
          </div>
        </div>

        {/* Store Logo Controls */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold text-[#2B1B17]/80">
            {t.admin.branding.logoLabel}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="min-h-[40px] px-3.5 rounded-xl bg-[#2B1B17] hover:bg-[#3F2923] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
              <ImagePlus className="w-4 h-4 text-[#F4A261]" />
              <span>
                {uploadingTarget === 'logo'
                  ? t.admin.addModal.compressing
                  : t.admin.branding.uploadLogo}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleUploadLogo(e)}
                className="sr-only"
              />
            </label>

            {draft.logoUrl && (
              <button
                type="button"
                onClick={() => commitConfig({ ...draft, logoUrl: undefined })}
                className="min-h-[40px] px-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.admin.branding.removeLogo}</span>
              </button>
            )}

            <input
              type="url"
              value={draft.logoUrl?.startsWith('data:') ? '' : draft.logoUrl || ''}
              onChange={(e) => {
                setDraft((prev) => ({
                  ...prev,
                  logoUrl: e.target.value.trim() || undefined,
                }));
                setIsDirty(true);
              }}
              placeholder={t.admin.branding.logoUrlPlaceholder}
              className="flex-1 min-w-[200px] min-h-[40px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Slide Banners ("Slaidi Bania") */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-[#2B1B17] inline-flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D95D39]" />
              <span>{t.admin.branding.bannersTitle}</span>
            </h3>
            <p className="text-xs text-[#2B1B17]/65 mt-0.5">{t.admin.branding.bannersSubtitle}</p>
          </div>

          <button
            type="button"
            disabled={draft.banners.length >= MAX_BANNERS}
            onClick={handleAddBanner}
            className="min-h-[40px] px-4 rounded-xl bg-[#2B1B17] hover:bg-[#3F2923] disabled:opacity-45 text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#F4A261]" />
            <span>{t.admin.branding.addBanner}</span>
          </button>
        </div>

        {/* Banners Master Toggle Card */}
        <div
          className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 transition-colors ${
            draft.bannersEnabled
              ? 'bg-white border-[#2B1B17]/12'
              : 'bg-[#2B1B17] text-[#FAF7F2] border-[#2B1B17]'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                draft.bannersEnabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white/10 text-[#F4A261]'
              }`}
            >
              {draft.bannersEnabled ? (
                <ImageIcon className="w-5 h-5" />
              ) : (
                <EyeOff className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <span
                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  draft.bannersEnabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-500/20 text-red-200 border border-red-400/30'
                }`}
              >
                {draft.bannersEnabled
                  ? t.admin.branding.bannersEnabledLabel
                  : t.admin.branding.bannersDisabledLabel}
              </span>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  draft.bannersEnabled ? 'text-[#2B1B17]/75' : 'text-white/80'
                }`}
              >
                {draft.bannersEnabled
                  ? t.admin.branding.bannersEnabledHint
                  : t.admin.branding.bannersDisabledHint}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleBannersEnabled}
            aria-pressed={draft.bannersEnabled}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 shrink-0 active:scale-95 transition-all ${
              draft.bannersEnabled
                ? 'bg-[#2B1B17] hover:bg-[#3F2923] text-white'
                : 'bg-[#D95D39] hover:bg-[#C14C2B] text-white'
            }`}
          >
            {draft.bannersEnabled ? (
              <>
                <EyeOff className="w-4 h-4 text-[#F4A261]" />
                <span>{t.admin.branding.turnOffBanners}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{t.admin.branding.turnOnBanners}</span>
              </>
            )}
          </button>
        </div>

        {/* Slide Banners List */}
        {draft.banners.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#2B1B17]/10 p-8 text-center space-y-3">
            <Layers className="w-9 h-9 text-[#D95D39] mx-auto" />
            <h4 className="font-display font-bold text-base text-[#2B1B17]">
              {t.admin.branding.emptyBannersTitle}
            </h4>
            <p className="text-xs text-[#2B1B17]/65 max-w-md mx-auto">
              {t.admin.branding.emptyBannersBody}
            </p>
            <button
              type="button"
              onClick={handleAddBanner}
              className="min-h-[42px] px-4 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t.admin.branding.addBanner}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {draft.banners.map((banner, idx) => {
              const isExpanded = expandedBannerId === banner.id;
              const displayTitle =
                language === 'sw'
                  ? banner.titleSw || banner.titleEn
                  : banner.titleEn || banner.titleSw;

              return (
                <div
                  key={banner.id}
                  className="bg-white rounded-2xl border border-[#2B1B17]/10 overflow-hidden shadow-xs"
                >
                  {/* Accordion Header */}
                  <div className="p-3.5 flex items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedBannerId(isExpanded ? null : banner.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div
                        className="w-16 h-11 rounded-xl overflow-hidden shrink-0 border border-[#2B1B17]/10 relative"
                        style={{
                          background: `linear-gradient(135deg, ${banner.gradientFrom}, ${banner.gradientTo})`,
                        }}
                      >
                        {banner.image && (
                          <img
                            src={banner.image}
                            alt={displayTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-[#D95D39]">
                          <span className="font-mono tabular-nums">
                            {t.admin.branding.bannerLabel} 0{idx + 1}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate text-[#2B1B17]/60 font-medium">
                            {getTargetLabel(banner.target)}
                          </span>
                        </div>
                        <h4 className="font-display font-bold text-sm text-[#2B1B17] truncate mt-0.5">
                          {displayTitle}
                        </h4>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveBanner(idx, -1)}
                        aria-label={t.admin.branding.moveUp}
                        className="w-9 h-9 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] disabled:opacity-35 flex items-center justify-center text-[#2B1B17]"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === draft.banners.length - 1}
                        onClick={() => handleMoveBanner(idx, 1)}
                        aria-label={t.admin.branding.moveDown}
                        className="w-9 h-9 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] disabled:opacity-35 flex items-center justify-center text-[#2B1B17]"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBanner(banner.id)}
                        aria-label={t.admin.branding.removeBanner}
                        className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedBannerId(isExpanded ? null : banner.id)}
                        aria-label="Toggle banner editor"
                        className="w-9 h-9 rounded-lg hover:bg-[#FAF7F2] flex items-center justify-center text-[#2B1B17]/70"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Banner Editor */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t border-[#2B1B17]/10 space-y-4 bg-[#FAF7F2]/45">
                      {/* Visual Preview Strip */}
                      <div
                        className="relative rounded-2xl p-4 text-white overflow-hidden min-h-[120px] flex flex-col justify-end"
                        style={{
                          background: `linear-gradient(135deg, ${banner.gradientFrom}, ${banner.gradientTo})`,
                        }}
                      >
                        {banner.image && (
                          <img
                            src={banner.image}
                            alt={displayTitle}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20"
                        />
                        <div className="relative z-10 max-w-md space-y-1">
                          <div className="font-display font-bold text-base leading-snug">
                            {language === 'sw' ? banner.titleSw : banner.titleEn}
                          </div>
                          <p className="text-xs text-white/85 line-clamp-2">
                            {language === 'sw' ? banner.subtitleSw : banner.subtitleEn}
                          </p>
                          <span className="inline-flex mt-2 px-3 py-1 rounded-lg bg-white text-[#2B1B17] text-[11px] font-bold">
                            {language === 'sw' ? banner.ctaSw : banner.ctaEn}
                          </span>
                        </div>
                      </div>

                      {/* Image & Gradient Picker */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-[#2B1B17]">
                          {t.admin.branding.photoLabel}
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="min-h-[38px] px-3 rounded-xl bg-white hover:bg-[#F3ECE2] border border-[#2B1B17]/15 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                            <ImagePlus className="w-3.5 h-3.5 text-[#D95D39]" />
                            <span>
                              {uploadingTarget === banner.id
                                ? t.admin.addModal.compressing
                                : t.admin.branding.uploadPhoto}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => void handleUploadBannerImage(banner.id, e)}
                              className="sr-only"
                            />
                          </label>

                          {banner.image && (
                            <button
                              type="button"
                              onClick={() =>
                                handleBannerChange(banner.id, { image: undefined }, true)
                              }
                              className="min-h-[38px] px-3 rounded-xl bg-white hover:bg-red-50 border border-[#2B1B17]/15 text-xs font-semibold text-red-700 inline-flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>{t.admin.branding.removePhoto}</span>
                            </button>
                          )}

                          <input
                            type="url"
                            value={banner.image?.startsWith('data:') ? '' : banner.image || ''}
                            onChange={(e) =>
                              handleBannerChange(banner.id, {
                                image: e.target.value.trim() || undefined,
                              })
                            }
                            placeholder={t.admin.branding.imageUrlPlaceholder}
                            className="flex-1 min-w-[180px] min-h-[38px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] font-semibold text-[#2B1B17]/60">
                            {t.admin.branding.presetPhotos}:
                          </span>
                          {SPLASH_PRESET_IMAGES.map((preset) => {
                            const selected = banner.image === preset.url;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() =>
                                  handleBannerChange(banner.id, { image: preset.url }, true)
                                }
                                title={language === 'sw' ? preset.labelSw : preset.labelEn}
                                className={`w-9 h-9 rounded-lg overflow-hidden border-2 transition-transform active:scale-95 ${
                                  selected
                                    ? 'border-[#D95D39] ring-2 ring-[#D95D39]/25'
                                    : 'border-white'
                                }`}
                              >
                                <img
                                  src={preset.url}
                                  alt={preset.labelEn}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            );
                          })}

                          <span className="h-5 w-px bg-[#2B1B17]/15 mx-1" aria-hidden="true" />

                          {BANNER_GRADIENTS.map((g, gIdx) => {
                            const activeGrad =
                              banner.gradientFrom.toLowerCase() === g.from.toLowerCase();
                            return (
                              <button
                                key={gIdx}
                                type="button"
                                onClick={() =>
                                  handleBannerChange(
                                    banner.id,
                                    { gradientFrom: g.from, gradientTo: g.to },
                                    true
                                  )
                                }
                                aria-label={`Gradient ${gIdx + 1}`}
                                className={`w-7 h-7 rounded-full border-2 ${
                                  activeGrad ? 'border-[#2B1B17] scale-110' : 'border-white'
                                }`}
                                style={{
                                  background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Copy & Target Action */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                            {t.admin.branding.titleSw}
                          </label>
                          <input
                            type="text"
                            maxLength={140}
                            value={banner.titleSw}
                            onChange={(e) =>
                              handleBannerChange(banner.id, { titleSw: e.target.value })
                            }
                            className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                            {t.admin.branding.titleEn}
                          </label>
                          <input
                            type="text"
                            maxLength={140}
                            value={banner.titleEn}
                            onChange={(e) =>
                              handleBannerChange(banner.id, { titleEn: e.target.value })
                            }
                            className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                            {t.admin.branding.subtitleSw}
                          </label>
                          <textarea
                            rows={2}
                            maxLength={300}
                            value={banner.subtitleSw}
                            onChange={(e) =>
                              handleBannerChange(banner.id, { subtitleSw: e.target.value })
                            }
                            className="w-full p-2.5 rounded-xl bg-white border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                            {t.admin.branding.subtitleEn}
                          </label>
                          <textarea
                            rows={2}
                            maxLength={300}
                            value={banner.subtitleEn}
                            onChange={(e) =>
                              handleBannerChange(banner.id, { subtitleEn: e.target.value })
                            }
                            className="w-full p-2.5 rounded-xl bg-white border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                            {t.admin.branding.ctaSw}
                          </label>
                          <input
                            type="text"
                            maxLength={60}
                            value={banner.ctaSw}
                            onChange={(e) =>
                              handleBannerChange(banner.id, { ctaSw: e.target.value })
                            }
                            className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                            {t.admin.branding.ctaEn}
                          </label>
                          <input
                            type="text"
                            maxLength={60}
                            value={banner.ctaEn}
                            onChange={(e) =>
                              handleBannerChange(banner.id, { ctaEn: e.target.value })
                            }
                            className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                            {t.admin.branding.targetLabel}
                          </label>
                          <select
                            value={banner.target}
                            onChange={(e) =>
                              handleBannerChange(banner.id, { target: e.target.value }, true)
                            }
                            className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                          >
                            <option value="all">{t.admin.branding.targets.all}</option>
                            <option value="wholesale">{t.admin.branding.targets.wholesale}</option>
                            <option value="cart">{t.admin.branding.targets.cart}</option>
                            {storeCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {getCategoryLabel(cat.id)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => commitConfig(draft)}
                          className="min-h-[40px] px-4 rounded-xl bg-[#2B1B17] hover:bg-[#3F2923] text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
                        >
                          <Save className="w-3.5 h-3.5 text-[#F4A261]" />
                          <span>{t.admin.branding.saveBtn}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {draft.banners.length >= MAX_BANNERS && (
          <p className="text-[11px] font-semibold text-[#2B1B17]/60 text-center">
            {t.admin.branding.maxBannersNote}
          </p>
        )}
      </div>
    </div>
  );
};
