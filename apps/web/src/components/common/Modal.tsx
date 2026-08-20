import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badgeText?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  badgeText,
  children,
  maxWidth = 'max-w-xl'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      <div 
        className={`neo-box-lg relative z-10 w-full ${maxWidth} bg-cream-shell overflow-hidden flex flex-col max-h-[90vh]`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-cream-muted border-b-2 border-ink-primary">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-accent-orange border border-ink-primary inline-block" />
            <h3 className="font-display font-bold text-base text-ink-primary tracking-wide uppercase">
              {title}
            </h3>
            {badgeText && (
              <span className="neo-box-sm px-1.5 py-0.5 text-[10px] font-mono font-bold bg-accent-acid text-ink-primary ml-1">
                {badgeText}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="neo-btn p-1 bg-white hover:bg-accent-pink hover:text-white"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-cream-card">
          {children}
        </div>
      </div>
    </div>
  );
};
