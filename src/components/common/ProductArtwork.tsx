import React, { useState } from 'react';
import { Language, Product } from '../../types';
import { getDisplayProductName } from '../../utils/pricing';

interface ProductArtworkProps {
  product: Product;
  language: Language;
  compact?: boolean;
  className?: string;
}

export const ProductArtwork: React.FC<ProductArtworkProps> = ({
  product,
  language,
  compact = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const name = getDisplayProductName(product, language);
  const origin = language === 'sw' ? product.originSw : product.originEn;

  if (product.image && !imgError) {
    return (
      <div
        className={`relative overflow-hidden bg-[#F3ECE2] ${
          !product.inStock ? 'grayscale opacity-75' : ''
        } ${className}`}
      >
        <img
          src={product.image}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center text-white select-none ${
        !product.inStock ? 'grayscale opacity-70' : ''
      } ${className}`}
      style={{
        background: `linear-gradient(135deg, ${product.gradientFrom} 0%, ${product.gradientTo} 100%)`,
      }}
    >
      {/* Subtle geometric Zanzibari arch & spice ring motif */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="100" cy="100" r="76" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 6" />
        <circle cx="100" cy="100" r="54" fill="none" stroke="white" strokeWidth="1" />
        <path
          d="M100 18 L114 44 L142 36 L136 64 L164 76 L146 98 L164 122 L136 134 L142 162 L114 154 L100 180 L86 154 L58 162 L64 134 L36 122 L54 98 L36 76 L64 64 L58 36 L86 44 Z"
          fill="none"
          stroke="white"
          strokeWidth="0.9"
        />
      </svg>

      {/* Soft top light vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/10 pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center text-center px-3">
        <span
          role="img"
          aria-label={name}
          className={`${
            compact ? 'text-4xl mb-1.5' : 'text-5xl md:text-6xl mb-2.5'
          } drop-shadow-sm leading-none transition-transform duration-200 group-hover:scale-105`}
        >
          {product.emoji}
        </span>
        <span
          className={`font-display font-bold tracking-tight leading-tight text-white drop-shadow-sm line-clamp-2 ${
            compact ? 'text-[11px] max-w-[130px]' : 'text-xs md:text-sm max-w-[180px]'
          }`}
        >
          {name}
        </span>
        {!compact && (
          <span className="mt-1 text-[10px] font-medium text-white/80 tracking-wide">
            {origin}
          </span>
        )}
      </div>
    </div>
  );
};
