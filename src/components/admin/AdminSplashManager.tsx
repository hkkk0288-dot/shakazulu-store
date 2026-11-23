import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImagePlus,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { DEFAULT_SPLASH_CONFIG, SPLASH_PRESET_IMAGES } from '../../data/seedData';
import { SplashConfig, SplashSlide } from '../../types';
import { compressImageFile } from '../../utils/imageUpload';
import { MobileSplashOnboarding } from '../mobile/MobileSplashOnboarding';

interface AdminSplashManagerProps {
  isMobileLayout: boolean;
  isScopedFrame?: boolean;
}

const MAX_SPLASH_SLIDES = 6;

const GRADIENT_PRESETS = [
  { from: '#D95D39', to: '#2B1B17' },
  { from: '#B5692D', to: '#2B1B17' },
  { from: '#8E3B23', to: '#2B1B17' },
  { from: '#9C4221', to: '#3D1E14' },
  { from: '#583123', to: '#2B1B17' },
];

export const AdminSplashManager: React.FC<AdminSplashManagerProps> = ({
  isMobileLayout,
  isScopedFrame = false,
}) => {
  const { language, splashConfig, updateSplashConfig, resetSplashConfig, t } = useStore();

  const [draft, setDraft] = useState<SplashConfig>(splashConfig);
  const [expandedId, setExpandedId] = useState<string | null>(
    splashConfig.slides[0]?.id ?? null
  );
  const [isDirty, setIsDirty] = useState(false);
  const [compressingSlideId, setCompressingSlideId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Sync draft with external cloud updates only when admin has no unsaved text edits
  useEffect(() => {
    if (!isDirty) {
      setDraft(splashConfig);
    }
  }, [splashConfig, isDirty]);

  const commitConfig = (next: SplashConfig) => {
    setDraft(next);
    setIsDirty(false);
    updateSplashConfig(next);
  };

  const handleToggleEnabled = () => {
    const next: SplashConfig = { ...draft, enabled: !draft.enabled };
    commitConfig(next);
  };

  const handleAddSlide = () => {
    if (draft.slides.length >= MAX_SPLASH_SLIDES) return;
    const newId = `splash-${Date.now()}`;
    const presetImg =
      SPLASH_PRESET_IMAGES[draft.slides.length % SPLASH_PRESET_IMAGES.length]?.url;
    const grad = GRADIENT_PRESETS[draft.slides.length % GRADIENT_PRESETS.length];

    const newSlide: SplashSlide = {
      id: newId,
      kickerEn: 'Shakazulu Store',
      kickerSw: 'Shakazulu Store',
      titleEn: t.admin.splash.defaultSlideTitleEn,
      titleSw: t.admin.splash.defaultSlideTitleSw,
      bodyEn: t.admin.splash.defaultSlideBodyEn,
      bodySw: t.admin.splash.defaultSlideBodySw,
      badgeEn: '100% Natural · Tanzania',
      badgeSw: '100% Asilia · Tanzania',
      image: presetImg,
      gradientFrom: grad.from,
      gradientTo: grad.to,
    };

    const next: SplashConfig = {
      ...draft,
      slides: [...draft.slides, newSlide],
    };
    setExpandedId(newId);
    commitConfig(next);
  };

  const handleRemoveSlide = (slideId: string) => {
    const remaining = draft.slides.filter((s) => s.id !== slideId);
    const next: SplashConfig = {
      ...draft,
      slides: remaining,
    };
    if (expandedId === slideId) {
      setExpandedId(remaining[0]?.id ?? null);
    }
    commitConfig(next);
  };

  const handleMoveSlide = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draft.slides.length) return;
    const nextSlides = [...draft.slides];
    const [moved] = nextSlides.splice(index, 1);
    nextSlides.splice(targetIndex, 0, moved);
    commitConfig({ ...draft, slides: nextSlides });
  };

  const handleSlideFieldChange = (
    slideId: string,
    updates: Partial<SplashSlide>,
    autoCommit = false
  ) => {
    const nextSlides = draft.slides.map((s) =>
      s.id === slideId ? { ...s, ...updates } : s
    );
    const nextConfig: SplashConfig = { ...draft, slides: nextSlides };
    if (autoCommit) {
      commitConfig(nextConfig);
    } else {
      setDraft(nextConfig);
      setIsDirty(true);
    }
  };

  const handleUploadPhoto = async (slideId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingSlideId(slideId);
    try {
      const compressed = await compressImageFile(file, 640, 110000);
      handleSlideFieldChange(slideId, { image: compressed }, true);
    } catch {
      // Fallback safely without breaking editor
    } finally {
      setCompressingSlideId(null);
      e.target.value = '';
    }
  };

  const handleResetDefaults = () => {
    setDraft(DEFAULT_SPLASH_CONFIG);
    setExpandedId(DEFAULT_SPLASH_CONFIG.slides[0]?.id ?? null);
    setIsDirty(false);
    resetSplashConfig();
  };

  const handleSaveChanges = () => {
    commitConfig(draft);
  };

  return (
    <div className="space-y-5">
      {/* Header & Primary Action Toolbar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg text-[#2B1B17]">
            {t.admin.splash.title}
          </h2>
          <p className="text-xs text-[#2B1B17]/65 mt-0.5">{t.admin.splash.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={draft.slides.length === 0}
            onClick={() => setPreviewOpen(true)}
            className="min-h-[40px] px-3.5 rounded-xl bg-white hover:bg-[#F3ECE2] disabled:opacity-45 border border-[#2B1B17]/15 text-[#2B1B17] text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4 text-[#D95D39]" />
            <span>{t.admin.splash.previewBtn}</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="min-h-[40px] px-3.5 rounded-xl bg-white hover:bg-[#F3ECE2] border border-[#2B1B17]/15 text-[#2B1B17] text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#2B1B17]/70" />
            <span>{t.admin.splash.resetDefaults}</span>
          </button>

          <button
            type="button"
            disabled={draft.slides.length >= MAX_SPLASH_SLIDES}
            onClick={handleAddSlide}
            className="min-h-[40px] px-4 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] disabled:opacity-45 text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>{t.admin.splash.addSlide}</span>
          </button>
        </div>
      </div>

      {/* Master On/Off Visibility Card ("toa kabisa / washa") */}
      <div
        className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 transition-colors ${
          draft.enabled
            ? 'bg-white border-[#2B1B17]/12'
            : 'bg-[#2B1B17] text-[#FAF7F2] border-[#2B1B17]'
        }`}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              draft.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-white/10 text-[#F4A261]'
            }`}
          >
            {draft.enabled ? <Smartphone className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-semibold ${
                  draft.enabled ? 'text-[#2B1B17]/65' : 'text-white/70'
                }`}
              >
                {t.admin.splash.statusLabel}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  draft.enabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-500/20 text-red-200 border border-red-400/30'
                }`}
              >
                {draft.enabled ? t.admin.splash.enabledLabel : t.admin.splash.disabledLabel}
              </span>
            </div>
            <p
              className={`text-xs mt-1 leading-relaxed ${
                draft.enabled ? 'text-[#2B1B17]/75' : 'text-white/80'
              }`}
            >
              {draft.enabled ? t.admin.splash.enabledHint : t.admin.splash.disabledHint}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleEnabled}
          aria-pressed={draft.enabled}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 shrink-0 active:scale-95 transition-all ${
            draft.enabled
              ? 'bg-[#2B1B17] hover:bg-[#3F2923] text-white'
              : 'bg-[#D95D39] hover:bg-[#C14C2B] text-white'
          }`}
        >
          {draft.enabled ? (
            <>
              <EyeOff className="w-4 h-4 text-[#F4A261]" />
              <span>{t.admin.splash.toggleTurnOff}</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>{t.admin.splash.toggleTurnOn}</span>
            </>
          )}
        </button>
      </div>

      {/* Save Changes Banner (shown when text edits are pending) */}
      {isDirty && (
        <div className="bg-[#F4A261]/20 border border-[#D95D39]/40 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#2B1B17]">{t.admin.splash.unsavedHint}</span>
          <button
            type="button"
            onClick={handleSaveChanges}
            className="min-h-[40px] px-4 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <Save className="w-4 h-4" />
            <span>{t.admin.splash.saveBtn}</span>
          </button>
        </div>
      )}

      {/* Slide Cards List */}
      {draft.slides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#2B1B17]/10 p-8 text-center space-y-3">
          <Smartphone className="w-9 h-9 text-[#D95D39] mx-auto" />
          <h3 className="font-display font-bold text-base text-[#2B1B17]">
            {t.admin.splash.emptySlidesTitle}
          </h3>
          <p className="text-xs text-[#2B1B17]/65 max-w-md mx-auto">
            {t.admin.splash.emptySlidesBody}
          </p>
          <button
            type="button"
            onClick={handleAddSlide}
            className="min-h-[44px] px-4 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t.admin.splash.addSlide}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {draft.slides.map((slide, idx) => {
            const isExpanded = expandedId === slide.id;
            const displayTitle =
              language === 'sw' ? slide.titleSw || slide.titleEn : slide.titleEn || slide.titleSw;
            const displayKicker =
              language === 'sw'
                ? slide.kickerSw || slide.kickerEn
                : slide.kickerEn || slide.kickerSw;

            return (
              <div
                key={slide.id}
                className="bg-white rounded-2xl border border-[#2B1B17]/10 overflow-hidden shadow-xs"
              >
                {/* Slide Accordion Header */}
                <div className="p-3.5 flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : slide.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <div
                      className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#2B1B17]/10"
                      style={{
                        background: `linear-gradient(135deg, ${slide.gradientFrom}, ${slide.gradientTo})`,
                      }}
                    >
                      {slide.image ? (
                        <img
                          src={slide.image}
                          alt={displayTitle}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-[#D95D39]">
                        <span className="font-mono tabular-nums">
                          {t.admin.splash.slideLabel} 0{idx + 1}
                        </span>
                        {displayKicker && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate text-[#2B1B17]/60 font-medium">
                              {displayKicker}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-sm text-[#2B1B17] truncate mt-0.5">
                        {displayTitle}
                      </h3>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSlide(idx, -1)}
                      aria-label={t.admin.splash.moveUp}
                      title={t.admin.splash.moveUp}
                      className="w-9 h-9 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] disabled:opacity-35 flex items-center justify-center text-[#2B1B17]"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === draft.slides.length - 1}
                      onClick={() => handleMoveSlide(idx, 1)}
                      aria-label={t.admin.splash.moveDown}
                      title={t.admin.splash.moveDown}
                      className="w-9 h-9 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] disabled:opacity-35 flex items-center justify-center text-[#2B1B17]"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlide(slide.id)}
                      aria-label={t.admin.splash.removeSlide}
                      title={t.admin.splash.removeSlide}
                      className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : slide.id)}
                      aria-label="Toggle slide editor"
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

                {/* Expanded Editor Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#2B1B17]/10 space-y-4 bg-[#FAF7F2]/45">
                    {/* Photo / Gradient Section */}
                    <div className="space-y-2.5">
                      <label className="block text-xs font-semibold text-[#2B1B17]">
                        {t.admin.splash.photoLabel}
                      </label>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="min-h-[38px] px-3 rounded-xl bg-white hover:bg-[#F3ECE2] border border-[#2B1B17]/15 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                          <ImagePlus className="w-3.5 h-3.5 text-[#D95D39]" />
                          <span>
                            {compressingSlideId === slide.id
                              ? t.admin.addModal.compressing
                              : t.admin.splash.uploadPhoto}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => void handleUploadPhoto(slide.id, e)}
                            className="sr-only"
                          />
                        </label>

                        {slide.image && (
                          <button
                            type="button"
                            onClick={() =>
                              handleSlideFieldChange(slide.id, { image: undefined }, true)
                            }
                            className="min-h-[38px] px-3 rounded-xl bg-white hover:bg-red-50 border border-[#2B1B17]/15 text-xs font-semibold text-red-700 inline-flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{t.admin.splash.removePhoto}</span>
                          </button>
                        )}

                        <input
                          type="url"
                          value={slide.image?.startsWith('data:') ? '' : slide.image || ''}
                          onChange={(e) =>
                            handleSlideFieldChange(slide.id, {
                              image: e.target.value.trim() || undefined,
                            })
                          }
                          placeholder={t.admin.splash.imageUrlPlaceholder}
                          className="flex-1 min-w-[180px] min-h-[38px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                        />
                      </div>

                      {/* Quick Preset Studio Photos + Gradient Swatches */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-[#2B1B17]/60">
                          {t.admin.splash.presetPhotos}:
                        </span>
                        {SPLASH_PRESET_IMAGES.map((preset) => {
                          const selected = slide.image === preset.url;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() =>
                                handleSlideFieldChange(slide.id, { image: preset.url }, true)
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

                        {GRADIENT_PRESETS.map((g, gIdx) => {
                          const activeGrad =
                            slide.gradientFrom.toLowerCase() === g.from.toLowerCase();
                          return (
                            <button
                              key={gIdx}
                              type="button"
                              onClick={() =>
                                handleSlideFieldChange(
                                  slide.id,
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

                    {/* Bilingual Copy Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                          {t.admin.splash.kickerSw}
                        </label>
                        <input
                          type="text"
                          maxLength={120}
                          value={slide.kickerSw}
                          onChange={(e) =>
                            handleSlideFieldChange(slide.id, { kickerSw: e.target.value })
                          }
                          className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                          {t.admin.splash.kickerEn}
                        </label>
                        <input
                          type="text"
                          maxLength={120}
                          value={slide.kickerEn}
                          onChange={(e) =>
                            handleSlideFieldChange(slide.id, { kickerEn: e.target.value })
                          }
                          className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                          {t.admin.splash.titleSw}
                        </label>
                        <input
                          type="text"
                          maxLength={160}
                          value={slide.titleSw}
                          onChange={(e) =>
                            handleSlideFieldChange(slide.id, { titleSw: e.target.value })
                          }
                          className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                          {t.admin.splash.titleEn}
                        </label>
                        <input
                          type="text"
                          maxLength={160}
                          value={slide.titleEn}
                          onChange={(e) =>
                            handleSlideFieldChange(slide.id, { titleEn: e.target.value })
                          }
                          className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                          {t.admin.splash.bodySw}
                        </label>
                        <textarea
                          rows={2}
                          maxLength={400}
                          value={slide.bodySw}
                          onChange={(e) =>
                            handleSlideFieldChange(slide.id, { bodySw: e.target.value })
                          }
                          className="w-full p-2.5 rounded-xl bg-white border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                          {t.admin.splash.bodyEn}
                        </label>
                        <textarea
                          rows={2}
                          maxLength={400}
                          value={slide.bodyEn}
                          onChange={(e) =>
                            handleSlideFieldChange(slide.id, { bodyEn: e.target.value })
                          }
                          className="w-full p-2.5 rounded-xl bg-white border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                          {t.admin.splash.badgeSw}
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={slide.badgeSw}
                          onChange={(e) =>
                            handleSlideFieldChange(slide.id, { badgeSw: e.target.value })
                          }
                          className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2B1B17]/75 mb-1">
                          {t.admin.splash.badgeEn}
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={slide.badgeEn}
                          onChange={(e) =>
                            handleSlideFieldChange(slide.id, { badgeEn: e.target.value })
                          }
                          className="w-full min-h-[40px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#2B1B17]/8">
                      <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        className="min-h-[38px] px-3 rounded-xl bg-white border border-[#2B1B17]/15 text-xs font-semibold text-[#2B1B17] inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#D95D39]" />
                        <span>{t.admin.splash.previewBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveChanges}
                        className="min-h-[40px] px-4 rounded-xl bg-[#2B1B17] hover:bg-[#3F2923] text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <Save className="w-3.5 h-3.5 text-[#F4A261]" />
                        <span>{t.admin.splash.saveBtn}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {draft.slides.length >= MAX_SPLASH_SLIDES && (
        <p className="text-[11px] font-semibold text-[#2B1B17]/60 text-center">
          {t.admin.splash.maxSlidesNote}
        </p>
      )}

      {/* Interactive Splash Preview Modal */}
      {previewOpen && (
        isMobileLayout || isScopedFrame ? (
          <MobileSplashOnboarding
            open={previewOpen}
            isScopedFrame={isScopedFrame}
            overrideConfig={draft}
            onFinish={() => setPreviewOpen(false)}
          />
        ) : (
          <div
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={t.admin.splash.previewBtn}
          >
            <div className="absolute inset-0" onClick={() => setPreviewOpen(false)} />
            <div className="relative z-10 w-[390px] max-w-full h-[780px] max-h-[90vh] rounded-[36px] border-8 border-[#2B1B17] shadow-2xl overflow-hidden bg-[#2B1B17]">
              <MobileSplashOnboarding
                open={previewOpen}
                isScopedFrame
                overrideConfig={draft}
                onFinish={() => setPreviewOpen(false)}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
};
