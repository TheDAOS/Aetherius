import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-xs font-mono font-bold tracking-wider uppercase text-ink-secondary">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {icon && (
          <span className="absolute left-3 text-ink-muted pointer-events-none">
            {icon}
          </span>
        )}
        <input
          className={`neo-box w-full px-3 py-2 bg-paper-canvas text-ink-primary font-sans text-sm outline-none placeholder:text-ink-faint focus:border-ink-primary focus:ring-2 focus:ring-accent-acid transition-all ${
            icon ? 'pl-9' : ''
          } ${error ? 'border-accent-pink bg-pink-50' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-[11px] font-mono text-accent-pink font-semibold">{error}</span>}
    </div>
  );
};
