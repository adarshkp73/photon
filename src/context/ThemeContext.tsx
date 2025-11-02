import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. We default to 'light' but will check localStorage/system
  const [theme, setTheme] = useState<Theme>('light');

  // 2. This effect runs once on load
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set theme from storage, or system preference, or default to 'light'
    setTheme(storedTheme || (systemPrefersDark ? 'dark' : 'light'));
  }, []);

  // 3. This effect runs every time the 'theme' state changes
  useEffect(() => {
    const root = window.document.documentElement;

    // Apply/remove the 'dark' class from the <html> tag
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Save the preference to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to easily use the theme context in any component
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};