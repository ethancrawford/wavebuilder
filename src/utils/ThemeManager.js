/**
 * ThemeManager
 * Handles theme switching and persistence
 */
export class ThemeManager {
  constructor() {
    this.themeSelect = document.getElementById('theme-select');
    this.htmlElement = document.documentElement;
    this.storageKey = 'wavetable-editor-theme';
    
    this.initialize();
  }
  
  initialize() {
    // Load saved theme or use default
    const savedTheme = this.loadTheme();
    this.applyTheme(savedTheme);
    this.themeSelect.value = savedTheme;
    
    // Listen for theme changes
    this.themeSelect.addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });
  }
  
  applyTheme(themeName) {
    this.htmlElement.setAttribute('data-theme', themeName);
    this.saveTheme(themeName);
    
    // Dispatch custom event for components that need to respond to theme changes
    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: themeName }
    }));
  }
  
  saveTheme(themeName) {
    try {
      localStorage.setItem(this.storageKey, themeName);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  }
  
  loadTheme() {
    try {
      return localStorage.getItem(this.storageKey) || 'dark';
    } catch (e) {
      console.warn('Could not load theme preference:', e);
      return 'dark';
    }
  }
  
  getCurrentTheme() {
    return this.htmlElement.getAttribute('data-theme');
  }
}
