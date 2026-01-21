import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'blue' | 'green' | 'purple' | 'orange' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  currentTheme = signal<Theme>('blue');

  constructor() {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    if (savedTheme && this.isValidTheme(savedTheme)) {
      this.currentTheme.set(savedTheme);
    }

    // Apply theme whenever it changes
    effect(() => {
      this.applyTheme(this.currentTheme());
    });

    // Apply initial theme
    this.applyTheme(this.currentTheme());
  }

  private isValidTheme(theme: string): theme is Theme {
    return ['blue', 'green', 'purple', 'orange', 'dark'].includes(theme);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.THEME_KEY, theme);
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-orange', 'theme-dark');
    
    // Add current theme class
    root.classList.add(`theme-${theme}`);
  }

  getAvailableThemes(): { name: Theme; label: string; colors: { primary: string; secondary: string } }[] {
    return [
      { name: 'blue', label: 'Ocean Blue', colors: { primary: '#06b6d4', secondary: '#3b82f6' } },
      { name: 'green', label: 'Emerald', colors: { primary: '#10b981', secondary: '#34d399' } },
      { name: 'purple', label: 'Purple Pink', colors: { primary: '#a855f7', secondary: '#ec4899' } },
      { name: 'orange', label: 'Sunset', colors: { primary: '#f59e0b', secondary: '#f97316' } },
      { name: 'dark', label: 'Midnight', colors: { primary: '#8b5cf6', secondary: '#06b6d4' } }
    ];
  }
}

