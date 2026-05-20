import React from 'react';

/**
 * Comunynk brand — APENAS o wordmark tipográfico oficial é a logo.
 * A "fachada com círculo CMYK" é referência de IDV, não é logotipo.
 *
 * Sizes  : sm | md | lg | xl
 * Variant: wordmark (logo oficial) | square (ícone CMYK auxiliar, ex: avatar)
 */

const WORDMARK = '/brand/wordmark.png';

const HEIGHTS = {
  sm: 30,
  md: 44,
  lg: 70,
  xl: 96,
};

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

export default function ComunynkLogo({
  size = 'md',
  variant = 'wordmark', // 'wordmark' | 'square'
  className = '',
  alt = 'COMUNYNK · Impressão & Comunicação Visual',
}) {
  const h = HEIGHTS[size] ?? HEIGHTS.md;

  if (variant === 'square') {
    return <InkSquare size={Math.round(h * 0.7)} className={className} />;
  }

  // wordmark = a logo oficial
  return (
    <img
      src={WORDMARK}
      alt={alt}
      className={`select-none ${className}`}
      style={{ height: h, width: 'auto', display: 'block' }}
      draggable={false}
    />
  );
}
