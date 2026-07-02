'use client';

import { forwardRef } from 'react';

type InputProps = {
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <div className='w-full'>
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-md
            bg-white border
            ${error ? 'border-red-400' : 'border-slate-300'}
            focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300
            text-base transition
            ${className}
          `}
          {...props}
        />

        {error && <p className='text-red-500 text-xs mt-1'>{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
