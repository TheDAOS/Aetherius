import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'acid' | 'orange' | 'pink' | 'cobalt' | 'mint' | 'muted';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'acid',
  size = 'sm',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] tracking-wider uppercase',
    md: 'px-2.5 py-1 text-xs tracking-wider uppercase'
  }[size];

  const variantClasses = {
    acid: 'bg-accent-acid text-ink-primary',
    orange: 'bg-accent-orange text-white',
    pink: 'bg-accent-pink text-white',
    cobalt: 'bg-accent-cobalt text-white',
    mint: 'bg-accent-mint text-ink-primary',
    muted: 'bg-cream-muted text-ink-secondary'
  }[variant];

  return (
    <span className={`neo-box-sm inline-flex items-center gap-1 font-mono font-bold select-none ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};
