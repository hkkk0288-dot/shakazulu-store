import React, { useRef, useState } from 'react';
import { ArrowRight, PackageCheck, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface MobileSplashOnboardingProps {
  open: boolean;
  isScopedFrame?: boolean;
  onFinish: () => void;
}

const SLIDE_VISUALS = [
  {
    image: '/src/assets/images/product_red_ubuyu_1795463732331.jpg',
    fallbackGradient: 'linear-gradient(155deg, #D95D39 0%, #5B1E17 55%, #2B1B17 100%)',
    icon: ShoppingBag,
    highlightMetricSw: '100% Asilia · Zanzibar',
    highlightMetricEn: '100% Natural · Zanzibar',
  },
  {
    image: '/src/assets/images/product_roasted_cashews_1795463732839.jpg',
    fallbackGradient: 'linear-gradient(155deg, #B5692D 0%, #4E2C1B 55%, #2B1B17 100%)',
    icon: PackageCheck,
    highlightMetricSw: 'Punguzo la 15–20% Jumla',
    highlightMetricEn: '15–20% Auto Wholesale',
  },
  {
    image: '/src/assets/images/product_pilau_masala_1795463732824.jpg',
    fallbackGradient: 'linear-gradient(155deg, #8E3B23 0%, #3F2218 55%, #2B1B17 100%)',
    icon: Truck,
    highlightMetricSw: 'M-Pesa · Mikoani · DHL Export',
    highlightMetricEn: 'M-Pesa · Upcountry · DHL Export',
  },
] as const;

export const MobileSplashOnboarding: React.FC<MobileSplashOnboardingProps> = ({
  open,
  isScopedFrame = false,
  onFinish,
}) => {
  const { language, setLanguage, t } = useStore();
  const [step, setStep] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const touchStartXRef = useRef<number | null>(null);

  if (!open) return null;

  const slides = t.splash.slides;
  const totalSlides = slides.length;
  const isLastSlide = step === totalSlides - 1;
  const positionClass = isScopedFrame ? 'absolute' : 'fixed';

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (deltaX < -42 && step < totalSlides - 1) {
      setStep((prev) => prev + 1);
    } else if (deltaX > 42 && step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (isLastSlide) {
      setStep(0);
      onFinish();
    } else {
      setStep((prev) => Math.min(totalSlides - 1, prev + 1));
    }
  };

  const handleSkip = () => {
    setStep(0);
    onFinish();
  };

  return (
    <div
      className={`${positionClass} inset-0 z-50 flex flex-col bg-[#2B1B17] text-[#FAF7F2] select-none overflow-hidden`}
      role="dialog"
      aria-modal="true"
      aria-label={t.brandName}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Safe Control Bar: Brand, Language Switch, Skip */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <span className="w-8 h-8 rounded-xl bg-[#D95D39] text-white font-display font-extrabold text-sm flex items-center justify-center shadow-sm">
            S
          </span>
          <span className="font-display font-bold text-sm tracking-tight text-white">
            {t.brandName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center rounded-xl bg-black/35 backdrop-blur-md p-0.5 border border-white/15"
            role="group"
            aria-label="Language"
          >
            {(['sw', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-bold uppercase transition-colors ${
                  language === lang
                    ? 'bg-[#F4A261] text-[#2B1B17]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="min-h-[44px] px-3 rounded-xl text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            {t.splash.skip}
          </button>
        </div>
      </div>

      {/* Sliding 3-Screen Viewport */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${step * 100}%)` }}
        >
          {slides.map((slide, idx) => {
            const visual = SLIDE_VISUALS[idx] ?? SLIDE_VISUALS[0];
            const Icon = visual.icon;
            const imgFailed = failedImages[idx];

            return (
              <div
                key={slide.title}
                className="w-full h-full shrink-0 flex flex-col justify-between px-5 pt-2 pb-4"
              >
                {/* Framed Editorial Visual Canvas */}
                <div
                  className="relative flex-1 min-h-[240px] max-h-[54vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                  style={{ background: visual.fallbackGradient }}
                >
                  {!imgFailed ? (
                    <img
                      src={visual.image}
                      alt={slide.title}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({
                          ...prev,
                          [idx]: true,
                        }))
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="w-16 h-16 text-[#F4A261]/70" />
                    </div>
                  )}

                  {/* Measured dark contrast scrim */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#2B1B17] via-[#2B1B17]/30 to-transparent"
                  />

                  {/* Quiet index & domain proof at bottom of visual frame (no pill clutter) */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 text-xs text-white/90">
                    <span className="font-mono font-bold tabular-nums text-[#F4A261]">
                      0{idx + 1} / 0{totalSlides}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold truncate">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#F4A261] shrink-0" />
                      <span className="truncate">
                        {language === 'sw' ? visual.highlightMetricSw : visual.highlightMetricEn}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Editorial Typography Block */}
                <div className="pt-5 space-y-2.5">
                  <p className="text-xs font-semibold text-[#F4A261] tracking-wide">
                    {slide.kicker}
                  </p>
                  <h1
                    className="font-display font-extrabold text-2xl leading-tight text-white"
                    style={{ textWrap: 'balance' }}
                  >
                    {slide.title}
                  </h1>
                  <p className="text-sm text-[#FAF7F2]/80 leading-relaxed">{slide.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Ergonomic Thumb Zone Controls */}
      <div className="px-5 pt-2 pb-6 pb-safe space-y-4 shrink-0 bg-gradient-to-t from-[#2B1B17] via-[#2B1B17] to-transparent">
        {/* Interactive Progress Dots */}
        <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Onboarding steps">
          {slides.map((_, idx) => {
            const active = idx === step;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setStep(idx)}
                className="min-h-[32px] px-1 flex items-center justify-center"
              >
                <span
                  className={`h-2 rounded-full transition-all duration-200 ${
                    active ? 'w-7 bg-[#D95D39]' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Primary Thumb CTA */}
        <button
          type="button"
          onClick={handleNext}
          className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-[#D95D39] hover:bg-[#C14C2B] text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
        >
          <span>{isLastSlide ? t.splash.startShopping : t.splash.next}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
