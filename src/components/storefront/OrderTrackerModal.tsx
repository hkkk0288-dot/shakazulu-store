import React, { useState } from 'react';
import { CheckCircle2, Clock, PackageCheck, Search, Truck, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus, TrackedOrderResult } from '../../types';
import { formatRawAmount } from '../../utils/pricing';

interface OrderTrackerModalProps {
  open: boolean;
  isMobileLayout?: boolean;
  isScopedFrame?: boolean;
  initialTab?: 'recent' | 'lookup';
  initialOrderCode?: string;
  onClose: () => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  open,
  isMobileLayout = false,
  isScopedFrame = false,
  initialTab = 'recent',
  initialOrderCode = '',
  onClose,
}) => {
  const { orders, user, trackOrderByCode, t } = useStore();
  const [tab, setTab] = useState<'recent' | 'lookup'>(initialTab);
  const [codeInput, setCodeInput] = useState(initialOrderCode);
  const [phoneInput, setPhoneInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<TrackedOrderResult | null>(null);
  const [lookupError, setLookupError] = useState(false);

  React.useEffect(() => {
    if (open) {
      setTab(initialTab);
      if (initialOrderCode) {
        setCodeInput(initialOrderCode);
      }
      setLookupError(false);
    }
  }, [open, initialTab, initialOrderCode]);

  if (!open) return null;

  const myRecentOrders = user
    ? orders.filter((o) => o.isCloudSynced || o.userId === user.uid)
    : orders.filter((o) => !o.id.startsWith('SHK-104') || o.createdAt > '2026-01-01');

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim() || !phoneInput.trim()) return;
    setSearching(true);
    setLookupError(false);
    setLookupResult(null);
    try {
      const res = await trackOrderByCode(codeInput, phoneInput);
      if (res) {
        setLookupResult(res);
      } else {
        setLookupError(true);
      }
    } finally {
      setSearching(false);
    }
  };

  const steps: { id: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'pending', label: t.admin.orders.statuses.pending, icon: Clock },
    { id: 'packed', label: t.admin.orders.statuses.packed, icon: PackageCheck },
    { id: 'dispatched', label: t.admin.orders.statuses.dispatched, icon: Truck },
  ];

  const getStepIndex = (st: OrderStatus) => steps.findIndex((s) => s.id === st);
  const positionClass = isScopedFrame ? 'absolute' : 'fixed';

  return (
    <div
      className={`${positionClass} inset-0 z-50 flex ${
        isMobileLayout ? 'items-end' : 'items-center justify-center p-4'
      } bg-black/55 backdrop-blur-xs`}
      role="dialog"
      aria-modal="true"
      aria-label={t.cloudAuth.myOrders}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={`relative z-10 bg-[#FAF7F2] w-full flex flex-col overflow-hidden shadow-2xl ${
          isMobileLayout
            ? 'rounded-t-3xl max-h-[88%] animate-sheet-up'
            : 'rounded-3xl max-w-xl max-h-[85vh] animate-modal-in'
        }`}
      >
        <div className="px-5 py-4 bg-white border-b border-[#2B1B17]/10 flex items-center justify-between shrink-0">
          <h2 className="font-display font-bold text-base md:text-lg text-[#2B1B17]">
            {t.cloudAuth.myOrders}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full hover:bg-[#FAF7F2] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="px-5 pt-3 bg-white border-b border-[#2B1B17]/8 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('recent')}
            className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors ${
              tab === 'recent'
                ? 'border-[#D95D39] text-[#D95D39]'
                : 'border-transparent text-[#2B1B17]/60'
            }`}
          >
            {t.ordersTrack.tabMyOrders} ({myRecentOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('lookup')}
            className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors ${
              tab === 'lookup'
                ? 'border-[#D95D39] text-[#D95D39]'
                : 'border-transparent text-[#2B1B17]/60'
            }`}
          >
            {t.ordersTrack.tabTrackCode}
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-3 pb-safe">
          {tab === 'recent' ? (
            myRecentOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#2B1B17]/10 text-xs text-[#2B1B17]/70">
                {user ? t.cloudAuth.myOrdersEmpty : t.ordersTrack.localOrdersEmpty}
              </div>
            ) : (
              myRecentOrders.map((order) => {
                const displayCode = order.orderCode || order.id;
                const activeIdx = getStepIndex(order.status);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#2B1B17]">#{displayCode}</span>
                        <span className="px-2 py-0.5 rounded bg-[#FAF7F2] text-[10px] font-semibold text-[#2B1B17]/65">
                          {order.isCloudSynced ? t.cloudAuth.cloudSynced : t.cloudAuth.localDemo}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md bg-[#FAF7F2] border border-[#2B1B17]/15 font-bold text-[#D95D39]">
                        {t.admin.orders.statuses[order.status]}
                      </span>
                    </div>

                    {/* Mini progress stepper */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {steps.map((s, idx) => {
                        const done = idx <= activeIdx;
                        return (
                          <div key={s.id} className="space-y-1">
                            <div
                              className={`h-1.5 rounded-full ${
                                done ? 'bg-[#D95D39]' : 'bg-[#2B1B17]/12'
                              }`}
                            />
                            <div
                              className={`text-[10px] font-semibold truncate ${
                                done ? 'text-[#2B1B17]' : 'text-[#2B1B17]/40'
                              }`}
                            >
                              {s.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-[#2B1B17]/75">{order.itemsSummary}</div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#2B1B17]/8">
                      <span className="text-[#2B1B17]/60">{order.location}</span>
                      <span className="font-display font-bold text-[#D95D39] tabular-nums">
                        {formatRawAmount(order.totalInOrderCurrency, order.currency)}
                      </span>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[#2B1B17]/75 leading-relaxed">
                {t.ordersTrack.trackHint}
              </p>

              <form onSubmit={(e) => void handleTrackSubmit(e)} className="bg-white rounded-2xl p-4 border border-[#2B1B17]/10 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#2B1B17] mb-1">
                    {t.ordersTrack.orderCodeLabel}
                  </label>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder={t.ordersTrack.orderCodePlaceholder}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2B1B17] mb-1">
                    {t.ordersTrack.phoneLabel}
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder={t.checkout.phonePlaceholder}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="w-full min-h-[44px] rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] disabled:opacity-60 text-white font-semibold inline-flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Search className="w-4 h-4" />
                  <span>{searching ? t.ordersTrack.checking : t.ordersTrack.trackBtn}</span>
                </button>
              </form>

              {lookupError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 text-center">
                  {t.ordersTrack.notFound}
                </div>
              )}

              {lookupResult && (
                <div className="bg-white rounded-2xl p-4 border border-emerald-200 space-y-3 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-[#2B1B17] inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />#{lookupResult.orderCode}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold">
                      {t.admin.orders.statuses[lookupResult.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {steps.map((s, idx) => {
                      const Icon = s.icon;
                      const activeIdx = getStepIndex(lookupResult.status);
                      const done = idx <= activeIdx;
                      return (
                        <div
                          key={s.id}
                          className={`p-2.5 rounded-xl border text-center space-y-1 ${
                            done
                              ? 'bg-[#D95D39]/10 border-[#D95D39]/40 text-[#2B1B17]'
                              : 'bg-[#FAF7F2] border-[#2B1B17]/10 text-[#2B1B17]/40'
                          }`}
                        >
                          <Icon className="w-4 h-4 mx-auto" />
                          <div className="font-bold text-[11px]">{s.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  {lookupResult.itemsSummary && (
                    <div className="text-[#2B1B17]/75">{lookupResult.itemsSummary}</div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#2B1B17]/8">
                    <span className="text-[#2B1B17]/65">
                      {t.checkout.deliveryOptions[lookupResult.deliveryMethod]}
                    </span>
                    <span className="font-display font-bold text-[#D95D39] tabular-nums">
                      {formatRawAmount(lookupResult.totalInOrderCurrency, lookupResult.currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
