import React, { useEffect, useState } from 'react';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductBadge } from '../../types';
import { compressImageFile } from '../../utils/imageUpload';

interface AddProductModalProps {
  open: boolean;
  editingProduct?: Product | null;
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
  editingProduct = null,
  isMobileLayout,
  isScopedFrame = false,
  onClose,
}) => {
  const { categories, getCategoryLabel, addProduct, updateProduct, addCategory, t } = useStore();

  const defaultCatId = categories[0]?.id || 'ubuyu_achari';

  const [nameEn, setNameEn] = useState('');
  const [nameSw, setNameSw] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descSw, setDescSw] = useState('');
  const [originEn, setOriginEn] = useState('Dar es Salaam & Zanzibar');
  const [originSw, setOriginSw] = useState('Dar es Salaam na Zanzibar');
  const [badge, setBadge] = useState<ProductBadge>('new');
  const [category, setCategory] = useState<string>(defaultCatId);
  const [basePriceStr, setBasePriceStr] = useState('5000');
  const [discountStr, setDiscountStr] = useState('15');
  const [stockQtyStr, setStockQtyStr] = useState('25');
  const [emoji, setEmoji] = useState('🍒');
  const [gradientIdx, setGradientIdx] = useState(0);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick inline new category fields
  const [showNewCat, setShowNewCat] = useState(false);
  const [quickCatEn, setQuickCatEn] = useState('');
  const [quickCatSw, setQuickCatSw] = useState('');

  useEffect(() => {
    if (!open) return;
    setError(null);
    setShowNewCat(false);
    setQuickCatEn('');
    setQuickCatSw('');

    if (editingProduct) {
      setNameEn(editingProduct.nameEn);
      setNameSw(editingProduct.nameSw);
      setDescEn(editingProduct.descriptionEn);
      setDescSw(editingProduct.descriptionSw);
      setOriginEn(editingProduct.originEn);
      setOriginSw(editingProduct.originSw);
      setBadge(editingProduct.badge);
      setCategory(editingProduct.category);
      setBasePriceStr(String(editingProduct.basePrice250g));
      setDiscountStr(String(editingProduct.wholesaleDiscount));
      setStockQtyStr(
        editingProduct.stockCount !== undefined ? String(editingProduct.stockCount) : '25'
      );
      setEmoji(editingProduct.emoji);
      const foundGradIdx = GRADIENT_PRESETS.findIndex(
        (g) => g.from.toLowerCase() === editingProduct.gradientFrom.toLowerCase()
      );
      setGradientIdx(foundGradIdx >= 0 ? foundGradIdx : 0);
      setImageDataUrl(editingProduct.image);
    } else {
      setNameEn('');
      setNameSw('');
      setDescEn('');
      setDescSw('');
      setOriginEn('Dar es Salaam & Zanzibar');
      setOriginSw('Dar es Salaam na Zanzibar');
      setBadge('new');
      setCategory(categories[0]?.id || 'ubuyu_achari');
      setBasePriceStr('5000');
      setDiscountStr('15');
      setStockQtyStr('25');
      setEmoji('🍒');
      setGradientIdx(0);
      setImageDataUrl(undefined);
    }
  }, [open, editingProduct, categories]);

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingPhoto(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file);
      setImageDataUrl(compressed);
    } catch {
      setError('Could not process selected image file.');
    } finally {
      setCompressingPhoto(false);
    }
  };

  const handleCreateQuickCategory = () => {
    if (!quickCatEn.trim()) return;
    const created = addCategory({
      nameEn: quickCatEn.trim(),
      nameSw: quickCatSw.trim() || quickCatEn.trim(),
    });
    setCategory(created.id);
    setQuickCatEn('');
    setQuickCatSw('');
    setShowNewCat(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = Number(basePriceStr);
    const parsedDiscount = Number(discountStr);
    const parsedStock = Math.max(0, Math.min(100000, Math.round(Number(stockQtyStr) || 0)));

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

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        nameEn: nameEn.trim(),
        nameSw: nameSw.trim() || nameEn.trim(),
        descriptionEn:
          descEn.trim() || 'Freshly packed coastal Tanzanian specialty from Shakazulu Store.',
        descriptionSw:
          descSw.trim() || 'Bidhaa halisi iliyofungwa kwa usafi kutoka Shakazulu Store.',
        category,
        basePrice250g: Math.round(parsedPrice),
        wholesaleDiscount: Math.round(parsedDiscount),
        stockCount: parsedStock,
        inStock: parsedStock > 0 ? editingProduct.inStock : false,
        badge,
        emoji,
        gradientFrom: grad.from,
        gradientTo: grad.to,
        originEn: originEn.trim() || 'Dar es Salaam & Zanzibar',
        originSw: originSw.trim() || originEn.trim() || 'Dar es Salaam na Zanzibar',
        image: imageDataUrl ?? '',
      });
    } else {
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
        stockCount: parsedStock,
        inStock: parsedStock > 0,
        badge,
        emoji,
        gradientFrom: grad.from,
        gradientTo: grad.to,
        originEn: originEn.trim() || 'Dar es Salaam & Zanzibar',
        originSw: originSw.trim() || originEn.trim() || 'Dar es Salaam na Zanzibar',
        image: imageDataUrl,
      });
    }

    onClose();
  };

  const positionClass = isScopedFrame ? 'absolute' : 'fixed';
  const isEditing = Boolean(editingProduct);

  return (
    <div
      className={`${positionClass} inset-0 z-50 flex ${
        isMobileLayout ? 'items-end' : 'items-center justify-center p-4'
      } bg-black/55 backdrop-blur-xs`}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? t.admin.addModal.editTitle : t.admin.addModal.title}
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
            {isEditing ? t.admin.addModal.editTitle : t.admin.addModal.title}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-[#2B1B17]">
                  {t.admin.addModal.category}
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCat((prev) => !prev)}
                  className="text-[11px] font-bold text-[#D95D39] hover:underline inline-flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t.admin.products.addCatBtn}</span>
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs font-semibold"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {getCategoryLabel(cat.id)}
                  </option>
                ))}
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

          {showNewCat && (
            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#D95D39]/35 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={quickCatEn}
                  onChange={(e) => setQuickCatEn(e.target.value)}
                  placeholder={t.admin.products.catNameEn}
                  className="min-h-[38px] px-3 rounded-lg bg-white border border-[#2B1B17]/15 text-xs"
                />
                <input
                  type="text"
                  value={quickCatSw}
                  onChange={(e) => setQuickCatSw(e.target.value)}
                  placeholder={t.admin.products.catNameSw}
                  className="min-h-[38px] px-3 rounded-lg bg-white border border-[#2B1B17]/15 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCat(false)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#2B1B17]/70"
                >
                  {t.admin.addModal.cancelBtn}
                </button>
                <button
                  type="button"
                  onClick={handleCreateQuickCategory}
                  className="px-3 py-1.5 rounded-lg bg-[#2B1B17] text-white text-[11px] font-semibold"
                >
                  {t.admin.products.addCatBtn}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#2B1B17] mb-1">
                {t.admin.addModal.stockQtyLabel}
              </label>
              <input
                type="number"
                min={0}
                max={100000}
                value={stockQtyStr}
                onChange={(e) => setStockQtyStr(e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#2B1B17] mb-1">
                {t.admin.addModal.originEn}
              </label>
              <input
                type="text"
                value={originEn}
                onChange={(e) => setOriginEn(e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#2B1B17] mb-1">
                {t.admin.addModal.badgeLabel}
              </label>
              <select
                value={badge ?? 'none'}
                onChange={(e) => {
                  const val = e.target.value;
                  setBadge(val === 'best_seller' || val === 'new' ? val : null);
                }}
                className="w-full min-h-[40px] px-2.5 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs font-semibold"
              >
                <option value="none">{t.admin.addModal.badgeNone}</option>
                <option value="best_seller">{t.product.bestSeller}</option>
                <option value="new">{t.product.newBadge}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#2B1B17] mb-1">
              {t.admin.addModal.originSw}
            </label>
            <input
              type="text"
              value={originSw}
              onChange={(e) => setOriginSw(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs"
            />
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
                <span>
                  {compressingPhoto ? t.admin.addModal.compressing : t.admin.addModal.uploadPhoto}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleFileChange(e)}
                  className="hidden"
                />
              </label>
            </div>

            <input
              type="url"
              value={imageDataUrl && !imageDataUrl.startsWith('data:') ? imageDataUrl : ''}
              onChange={(e) => setImageDataUrl(e.target.value || undefined)}
              placeholder={t.admin.addModal.imageUrlLabel}
              className="w-full min-h-[38px] px-3 rounded-xl bg-[#FAF7F2] border border-[#2B1B17]/15 text-xs"
            />

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
            {isEditing ? t.admin.addModal.updateBtn : t.admin.addModal.saveBtn}
          </button>
        </div>
      </form>
    </div>
  );
};
