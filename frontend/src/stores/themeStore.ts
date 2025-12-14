import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Function to apply theme to DOM
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.remove('light', 'dark');
    root.classList.add(systemTheme);
  } else {
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }
};

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = useThemeStore.getState().theme;
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'autosentry-theme',
      onRehydrateStorage: () => (state) => {
        // Apply theme on initial load
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

// Initialize theme on load
if (typeof window !== 'undefined') {
  const storedTheme = localStorage.getItem('autosentry-theme');
  if (storedTheme) {
    try {
      const parsed = JSON.parse(storedTheme);
      applyTheme(parsed.state?.theme || 'dark');
    } catch {
      applyTheme('dark');
    }
  } else {
    applyTheme('dark');
  }
}
