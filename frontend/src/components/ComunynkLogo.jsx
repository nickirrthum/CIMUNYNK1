import React from 'react';

/**
 * Comunynk brand assets — reusable logo + ink-square mark.
 * Sizes: 'sm' (sidebar collapsed / mobile), 'md' (default sidebar / topbar), 'lg' (login).
 */

export function InkSquare({ size = 28, className = '' }) {
  return (
    <span
      className={`ink-square ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span /><span /><span /><span />
    </span>
  );
}

const SIZE_MAP = {
  sm: { text: 'text-[15px]', sub: 'text-[8px]',  square: 22 },
  md: { text: 'text-[18px]', sub: 'text-[9px]',  square: 28 },
  lg: { text: 'text-[34px]', sub: 'text-[11px]', square: 50 },
  xl: { text: 'text-[44px]', sub: 'text-[13px]', square: 64 },
};

export default function ComunynkLogo({
  size = 'md',
  withTagline = true,
  variant = 'full', // 'full' | 'wordmark' | 'mark'
  tagline = 'IMPRESSÃO & COMUNICAÇÃO VISUAL',
  className = '',
}) {
  const s = SIZE_MAP[size] ?? SIZE_MAP.md;

  if (variant === 'mark') {
    return <InkSquare size={s.square} className={className} />;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {variant === 'full' && <InkSquare size={s.square} />}
      <div className="flex flex-col leading-none">
        <span className={`wordmark-comunynk font-display ${s.text}`}>
          <span className="wordmark-co">CO</span>
          <span className="wordmark-mu">MU</span>
          <span className="wordmark-ny">NY</span>
          <span className="wordmark-nk">NK</span>
        </span>
        {withTagline && (
          <span className={`${s.sub} font-semibold tracking-[0.18em] text-ink-500 mt-1.5`}>
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}
