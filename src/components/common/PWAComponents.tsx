import React, { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useOnlineStatus, usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { t } = useStore();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'card'
            ? 'w-full min-h-[46px] px-4 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 active:scale-95 transition-all'
            : 'h-7 px-2.5 rounded-md bg-[#F4A261] hover:bg-[#e5924f] text-[#2B1B17] text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors'
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{t.pwa.installBtn}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'card'
              ? 'w-full min-h-[46px] px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#2B1B17]/15 text-[#2B1B17] text-xs font-semibold inline-flex items-center justify-center gap-2 active:scale-95 transition-all'
              : 'h-7 px-2.5 rounded-md bg-white/12 hover:bg-white/20 text-[#F4A261] text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors'
          }
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>{t.pwa.installIOSBtn}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#2B1B17]/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-[#2B1B17]">
                  {t.pwa.iosTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full hover:bg-[#FAF7F2] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2.5 text-xs text-[#2B1B17]/80 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#D95D39] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="inline-flex items-center gap-1 flex-wrap">
                    {t.pwa.iosStep1} <Share className="w-3.5 h-3.5 text-[#D95D39] inline" />
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#D95D39] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>{t.pwa.iosStep2}</span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[42px] rounded-xl bg-[#2B1B17] text-white text-xs font-semibold"
              >
                {t.pwa.closeBtn}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useStore();

  if (isOnline) return null;

  return (
    <div className="no-print fixed bottom-20 md:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#2B1B17] border border-[#F4A261]/40 px-3 py-2 text-xs font-semibold text-[#FAF7F2] shadow-xl">
      <WifiOff className="w-3.5 h-3.5 text-[#F4A261]" />
      <span>{t.pwa.offlineBanner}</span>
    </div>
  );
};
