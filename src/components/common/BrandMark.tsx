import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';

interface BrandMarkProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  siteNameOverride?: string;
  logoUrlOverride?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandMarkProps['size']>, string> = {
  xs: 'w-7 h-7 rounded-lg text-xs',
  sm: 'w-8 h-8 rounded-xl text-sm',
  md: 'w-10 h-10 rounded-xl text-base',
  lg: 'w-11 h-11 rounded-2xl text-base',
};

export const BrandMark: React.FC<BrandMarkProps> = ({
  size = 'sm',
  siteNameOverride,
  logoUrlOverride,
  className = '',
}) => {
  const { brandingConfig } = useStore();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const name = (siteNameOverride ?? brandingConfig.siteName).trim() || 'Shakazulu Store';
  const logoSrc = (logoUrlOverride !== undefined ? logoUrlOverride : brandingConfig.logoUrl)?.trim() || '';
  const showLogo = Boolean(logoSrc) && failedSrc !== logoSrc;
  const monogram = name.charAt(0).toUpperCase() || 'S';

  if (showLogo) {
    return (
      <span
        className={`${SIZE_CLASSES[size]} overflow-hidden bg-white border border-[#2B1B17]/10 inline-flex items-center justify-center shrink-0 shadow-xs ${className}`}
      >
        <img
          src={logoSrc}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(logoSrc)}
          className="w-full h-full object-contain p-0.5"
        />
      </span>
    );
  }

  return (
    <span
      className={`${SIZE_CLASSES[size]} bg-[#D95D39] text-white font-display font-extrabold inline-flex items-center justify-center shrink-0 shadow-xs ${className}`}
      aria-hidden="true"
    >
      {monogram}
    </span>
  );
};
