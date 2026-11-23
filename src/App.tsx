import React, { useEffect, useState } from 'react';
import { AdminView } from './components/admin/AdminView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { OfflineIndicator } from './components/common/PWAComponents';
import { DesktopStorefront } from './components/desktop/DesktopStorefront';
import { MobileStorefront } from './components/mobile/MobileStorefront';
import { StoreProvider, useStore } from './context/StoreContext';

const AppShell: React.FC = () => {
  const { adminMode, toastMessage } = useStore();
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      {/* Main Layout Switch */}
      {isMobileViewport ? (
        adminMode ? (
          <AdminView isMobileLayout />
        ) : (
          <MobileStorefront />
        )
      ) : adminMode ? (
        <AdminView isMobileLayout={false} />
      ) : (
        <DesktopStorefront />
      )}

      <OfflineIndicator />

      {/* Global Toast */}
      {toastMessage && (
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
