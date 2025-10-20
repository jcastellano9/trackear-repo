/**
 * Contexto global para gestión de tema (claro/oscuro).
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lee el tema desde localStorage o preferencias del sistema
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // If no saved preference, check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Marca si el componente fue montado (para evitar flickering)
  const [hasMounted, setHasMounted] = useState(false);

  // Actualiza el estado si el sistema cambia entre claro/oscuro
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    setHasMounted(true);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Aplica el tema al DOM y lo guarda en localStorage
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Alterna entre modo claro y oscuro
  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  if (!hasMounted) return null;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
