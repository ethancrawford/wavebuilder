import { ThemeManager } from './utils/ThemeManager.js';
import { WavetableEditor } from './WavetableEditor.js';

/**
 * Application entry point
 */
class Application {
  constructor() {
    this.themeManager = null;
    this.editor = null;
  }

  /**
   * Initialize application
   */
  initialize() {
    console.log('Initializing Wavetable Editor...');

    // Initialize theme system
    this.themeManager = new ThemeManager();
    console.log('✓ Theme system initialized');

    // Initialize editor
    this.editor = new WavetableEditor();
    console.log('✓ Editor initialized');

    // Application ready
    console.log('✓ Wavetable Editor ready');

    // Expose to window for debugging (optional)
    if (import.meta.env.DEV) {
      window.wavetableEditor = this.editor;
      console.log('Debug: Editor available as window.wavetableEditor');
    }
  }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new Application();
    app.initialize();
  });
} else {
  const app = new Application();
  app.initialize();
}
