import React, { useState } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CategoryId } from '../../types';

interface AddProductModalProps {
  open: boolean;
  isMobileLayout: boolean;
  isScopedFrame?: boolean;
  onClose: () => void;
}

const EMOJI_CHOICES = [
  '🍒',
  '🤍',
  '🥜',
  '🥭',
  '🫚',
  '🌶️',
  '🫒',
  '🥥',
  '🌾',
  '🌿',
  '🌴',
  '🍍',
  '🌻',
  '☕',
  '🍯',
  '🍋',
];

const GRADIENT_PRESETS = [
  { from: '#D95D39', to: '#8C1D18' },
  { from: '#F4A261', to: '#C97B4B' },
  { from: '#9C4221', to: '#3D1E14' },
  { from: '#D4A338', to: '#6F4E12' },
  { from: '#583123', to: '#2B1B17' },
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  open,
  isMobileLayout,
  isScopedFrame = false,
  onClose,
}) => {
  const { addProduct, t } = useStore();

  const [nameEn, setNameEn] = useState('');
  const [nameSw, setNameSw] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descSw, setDescSw] = useState('');
  const [category, setCategory] = useState<Exclude<CategoryId, 'all'>>('ubuyu_achari');
  const [basePriceStr, setBasePriceStr] = useState('5000');
  const [discountStr, setDiscountStr] = useState('15');
  const [emoji, setEmoji] = useState('🍒');
  const [gradientIdx, setGradientIdx] = useState(0);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = Number(basePriceStr);
    const parsedDiscount = Number(discountStr);

    if (!nameEn.trim()) {
      setError('Product Name (English) is required.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Base price (250g) must be greater than 0 TZS.');
      return;
    }
    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 40) {
      setError('Wholesale discount must be between 0% and 40%.');
      return;
    }

    const grad = GRADIENT_PRESETS[gradientIdx] || GRADIENT_PRESETS[0];

    addProduct({
      nameEn: nameEn.trim(),
      nameSw: nameSw.trim() || nameEn.trim(),
      descriptionEn:
        descEn.trim() || 'Freshly packed coastal Tanzanian specialty from Shakazulu Store.',
      descriptionSw:
        descSw.trim() || 'Bidhaa halisi iliyofungwa kwa usafi kutoka Shakazulu Store.',
      category,
      basePrice250g: Math.round(parsedPrice),
      wholesaleDiscount: Math.round(parsedDiscount),
      inStock: true,
      emoji,
      gradientFrom: grad.from,
      gradientTo: grad.to,
      originEn: 'Dar es Salaam & Zanzibar',
      originSw: 'Dar es Salaam na Zanzibar',
      image: imageDataUrl,
    });

    setNameEn('');
    setNameSw('');
    setDescEn('');
    setDescSw('');
    setBasePriceStr('5000');
    setDiscountStr('15');
    setImageDataUrl(undefined);
    setError(null);
    onClose();
  };

  const positionClass = isScopedFrame ? 'absolute' : 'fixed';

  return (
    <div
      className={`${positionClass} inset-0 z-50 flex ${
        isMobileLayout ? 'items-end' : 'items-center justify-center p-4'
      } bg-black/55 backdrop-blur-xs`}
      role="dialog"
      aria-modal="true"
      aria-label={t.admin.addModal.title}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className={`relative z-10 bg-white w-full flex flex-col overflow-hidden shadow-2xl ${
          isMobileLayout
            ? 'rounded-t-3xl max-h-[90%] animate-sheet-up'
            : 'rounded-2xl max-w-lg max-h-[90vh] animate-modal-in border border-[#2B1B17]/10'
        }`}
      >
        <div className="px-5 py-4 border-b border-[#2B1B17]/10 flex items-center justify-between shrink-0">
          <h3 className="font-display font-bold text-base text-[#2B1B17]">
            {t.admin.addModal.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full hover:bg-[#FAF7F2] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#2B1B17] mb-1">
              {t.admin.addModal.nameEn}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Zanzibar Honey Ginger Ubuyu"
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#2B1B17] mb-1">
              {t.admin.addModal.nameSw}
            </label>
            <input
              type="text"
              value={nameSw}
              onChange={(e) => setNameSw(e.target.value)}
              placeholder="mf. Ubuyu wa Asali na Tangawizi"
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-sm focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block font-semibold text-[#2B1B17] mb-1">
                {t.admin.addModal.category}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Exclude<CategoryId, 'all'>)}
                className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs font-semibold"
              >
                <option value="ubuyu_achari">{t.categories.ubuyu_achari}</option>
                <option value="nuts_seeds">{t.categories.nuts_seeds}</option>
                <option value="spices_masalas">{t.categories.spices_masalas}</option>
                <option value="dried_fruits_oils">{t.categories.dried_fruits_oils}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#2B1B17] mb-1">
                {t.admin.addModal.basePrice}
              </label>
              <input
                type="number"
                min={100}
                step={100}
                value={basePriceStr}
                onChange={(e) => setBasePriceStr(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B1B17] mb-1">
                {t.admin.addModal.discount}
              </label>
              <input
                type="number"
                min={0}
                max={40}
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#2B1B17] mb-1">
                {t.admin.addModal.descEn}
              </label>
              <textarea
                rows={2}
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#2B1B17] mb-1">
                {t.admin.addModal.descSw}
              </label>
              <textarea
                rows={2}
                value={descSw}
                onChange={(e) => setDescSw(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs"
              />
            </div>
          </div>

          {/* Emoji Picker & Photo Upload */}
          <div className="space-y-2 pt-1">
            <span className="block font-semibold text-[#2B1B17]">{t.admin.addModal.visual}</span>

            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                    emoji === em
                      ? 'border-[#D95D39] bg-[#D95D39]/12 scale-105'
                      : 'border-[#2B1B17]/10 bg-[#FAF7F2]'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              {GRADIENT_PRESETS.map((g, idx) => (
                <button
                  key={g.from}
                  type="button"
                  onClick={() => setGradientIdx(idx)}
                  aria-label={`Color theme ${idx + 1}`}
                  className={`w-7 h-7 rounded-full border-2 ${
                    gradientIdx === idx ? 'border-[#2B1B17] scale-110' : 'border-transparent'
                  }`}
                  style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                />
              ))}

              <label className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 font-semibold cursor-pointer hover:bg-[#F3ECE2]">
                <ImagePlus className="w-4 h-4 text-[#D95D39]" />
                <span>{t.admin.addModal.uploadPhoto}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {imageDataUrl && (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/10">
                <img
                  src={imageDataUrl}
                  alt="Preview"
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageDataUrl(undefined)}
                  className="inline-flex items-center gap-1 text-red-600 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.admin.addModal.removePhoto}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[#2B1B17]/10 bg-white flex items-center justify-end gap-2 shrink-0 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-[#2B1B17]/15 text-xs font-semibold text-[#2B1B17]"
          >
            {t.admin.addModal.cancelBtn}
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-xl bg-[#D95D39] hover:bg-[#C14C2B] text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            {t.admin.addModal.saveBtn}
          </button>
        </div>
      </form>
    </div>
  );
};
