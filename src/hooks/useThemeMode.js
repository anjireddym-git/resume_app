import { useCallback, useEffect, useRef, useState } from 'react';

export const THEME_MODE_KEY = 'resumeThemeMode';
export const THEME_MODES = ['light', 'dark', 'system'];

function normalizeThemeMode(value) {
  return THEME_MODES.includes(value) ? value : null;
}

function readStoredThemeMode() {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeThemeMode(window.localStorage.getItem(THEME_MODE_KEY));
  } catch {
    return null;
  }
}

function writeStoredThemeMode(mode) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    // Theme persistence is a convenience; rendering should continue without it.
  }
}

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyDocumentTheme(resolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.style.colorScheme = resolvedTheme;
}

export function useThemeMode(savedThemeMode) {
  const [themeMode, setThemeModeState] = useState(() => (
    normalizeThemeMode(savedThemeMode) || readStoredThemeMode() || 'system'
  ));
  const [resolvedTheme, setResolvedTheme] = useState(() => (
    themeMode === 'system' ? getSystemTheme() : themeMode
  ));
  const lastSavedThemeModeRef = useRef(savedThemeMode);

  useEffect(() => {
    if (savedThemeMode === lastSavedThemeModeRef.current) return;
    lastSavedThemeModeRef.current = savedThemeMode;

    const normalized = normalizeThemeMode(savedThemeMode);
    if (normalized && normalized !== themeMode) {
      setThemeModeState(normalized);
      writeStoredThemeMode(normalized);
    }
  }, [savedThemeMode, themeMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

    const updateResolvedTheme = () => {
      const nextResolvedTheme = themeMode === 'system' ? getSystemTheme() : themeMode;
      setResolvedTheme(nextResolvedTheme);
      applyDocumentTheme(nextResolvedTheme);
    };

    updateResolvedTheme();

    if (!mediaQuery || themeMode !== 'system') return undefined;

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateResolvedTheme);
      return () => mediaQuery.removeEventListener?.('change', updateResolvedTheme);
    }

    mediaQuery.addListener?.(updateResolvedTheme);
    return () => mediaQuery.removeListener?.(updateResolvedTheme);
  }, [themeMode]);

  const setThemeMode = useCallback((nextMode) => {
    const normalized = normalizeThemeMode(nextMode) || 'system';
    setThemeModeState(normalized);
    writeStoredThemeMode(normalized);
  }, []);

  return {
    themeMode,
    resolvedTheme,
    setThemeMode,
  };
}
