import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', containerClassName = '', type = 'text', ...props }, ref) => {
    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label className="block text-[10px] font-bold text-auth-label dark:text-auth-labelDark uppercase mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full h-10 px-3 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue focus:bg-reddit-card dark:focus:bg-reddit-cardDark transition-colors text-reddit-text dark:text-reddit-textDark placeholder-auth-placeholder dark:placeholder-auth-placeholderDark ${className}`}
          {...props}
        />
        {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
      </div>
    );
  }
);

Input.displayName = 'Input';
