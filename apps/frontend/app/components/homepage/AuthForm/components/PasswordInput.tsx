'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from '../../../ui/Input';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export function PasswordInput({ error, ...props }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className='relative'>
      <Input type={show ? 'text' : 'password'} error={error} {...props} />

      <button
        type='button'
        onClick={() => setShow(prev => !prev)}
        className='absolute right-4 top-4 text-gray-500 hover:text-gray-700'
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
