import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'acid' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs font-semibold',
    md: 'px-4 py-2 text-sm font-bold',
    lg: 'px-5 py-2.5 text-base font-bold'
  }[size];

  const variantClasses = {
    primary: 'bg-accent-orange text-white hover:bg-orange-600 active:bg-orange-700',
    secondary: 'bg-cream-card text-ink-primary hover:bg-white active:bg-cream-muted',
    acid: 'bg-accent-acid text-ink-primary hover:bg-[#d4f000] active:bg-[#c2dc00]',
    danger: 'bg-accent-pink text-white hover:bg-pink-600 active:bg-pink-700',
    ghost: 'bg-transparent border-transparent shadow-none hover:bg-cream-muted hover:border-ink-primary hover:shadow-neo-sm active:translate-y-0.5'
  }[variant];

  return (
    <button
      className={`neo-btn flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none font-display tracking-wide uppercase ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
