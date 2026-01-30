'use client';

import { Heart } from 'lucide-react';

interface SupportButtonProps {
  variant?: 'default' | 'small' | 'pill';
  className?: string;
}

export function SupportButton({ variant = 'default', className = '' }: SupportButtonProps) {
  // TODO: Replace with your Ko-fi username
  const KOFI_URL = 'https://ko-fi.com/codecomp';

  if (variant === 'small') {
    return (
      <a
        href={KOFI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-pink-400 transition ${className}`}
      >
        <Heart className="w-4 h-4" />
        Support
      </a>
    );
  }

  if (variant === 'pill') {
    return (
      <a
        href={KOFI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 rounded-full transition ${className}`}
      >
        <Heart className="w-4 h-4" />
        Support Us
      </a>
    );
  }

  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-lg font-medium transition shadow-lg shadow-pink-500/25 ${className}`}
    >
      <Heart className="w-5 h-5" />
      Support CodeComp
    </a>
  );
}
