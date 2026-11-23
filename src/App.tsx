import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { AdminView } from './components/admin/AdminView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DesktopStorefront } from './components/desktop/DesktopStorefront';
import { MobileStorefront } from './components/mobile/MobileStorefront';
import { StoreProvider, useStore } from './context/StoreContext';

const AppShell: React.FC = () => {
  const { adminMode, previewMode, setPreviewMode, toastMessage, t } = useStore();
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const showPhoneFrame = !isMobileViewport && previewMode === 'app';

  return (
    <>
      {/* Main Layout Switch */}
      {isMobileViewport ? (
        adminMode ? (
          <AdminView isMobileLayout />
        ) : (
          <MobileStorefront />
        )
      ) : showPhoneFrame ? (
        <div className="min-h-screen bg-[#2B1B17] flex flex-col items-center justify-center py-8 px-4">
          <div className="mb-3 text-center">
            <span className="text-xs font-semibold text-[#F4A261]">
              {t.preview.phoneFrameHint}
            </span>
          </div>

          {/* 390 x 844 Phone Frame */}
          <div
            className="relative bg-[#FAF7F2] rounded-[42px] border-[10px] border-[#1A100E] shadow-2xl overflow-hidden flex flex-col"
            style={{ width: 390, height: 844, maxHeight: '88vh' }}
          >
            {/* Dynamic Island / Speaker Notch */}
            <div className="bg-white h-6 flex items-center justify-center shrink-0 border-b border-[#2B1B17]/5">
              <div className="w-20 h-3.5 rounded-full bg-[#1A100E]" />
            </div>

            <div className="relative flex-1 overflow-hidden">
              {adminMode ? (
                <AdminView isMobileLayout isScopedFrame />
              ) : (
                <MobileStorefront isScopedFrame />
              )}

              {/* Toast inside Phone Frame */}
              {toastMessage && (
                <div className="absolute bottom-20 left-4 right-4 z-50 flex justify-center pointer-events-none">
                  <div className="px-4 py-2.5 rounded-xl bg-[#2B1B17] text-white text-xs font-semibold shadow-lg">
                    {toastMessage}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : adminMode ? (
        <AdminView isMobileLayout={false} />
      ) : (
        <DesktopStorefront />
      )}

      {/* Floating "App View / Web View" Preview Switch (Desktop Only >= 768px) */}
      {!isMobileViewport && (
        <div className="fixed bottom-5 left-5 z-40">
          <div
            className="inline-flex items-center p-1 rounded-2xl bg-[#2B1B17]/95 backdrop-blur-md border border-white/15 shadow-xl"
            role="group"
            aria-label="Viewport Preview Switch"
          >
            <button
              type="button"
              onClick={() => setPreviewMode('web')}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap ${
                previewMode === 'web'
                  ? 'bg-[#F4A261] text-[#2B1B17]'
                  : 'text-[#FAF7F2]/80 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{t.preview.webView}</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('app')}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap ${
                previewMode === 'app'
                  ? 'bg-[#F4A261] text-[#2B1B17]'
                  : 'text-[#FAF7F2]/80 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{t.preview.appView}</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Toast (Web View or Native Mobile Viewport) */}
      {!showPhoneFrame && toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-4 py-2.5 rounded-xl bg-[#2B1B17] text-white text-xs font-semibold shadow-xl border border-white/10 whitespace-nowrap">
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
