/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('wifi_share_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('wifi_share_theme', theme);
  }, [theme]);

  const toggle = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggle}
      className="p-1.5 md:p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-all flex items-center justify-center border border-neutral-200/40 dark:border-neutral-700/50 cursor-pointer shadow-xs active:scale-95"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon id="moon-icon" className="w-4 h-4 md:w-5 h-5 transition-transform hover:rotate-12" />
      ) : (
        <Sun id="sun-icon" className="w-4 h-4 md:w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
      )}
    </button>
  );
};
