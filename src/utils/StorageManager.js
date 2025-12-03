// src/utils/StorageManager.js
/**
 * StorageManager
 * Handles persistence of application state to localStorage
 */
export class StorageManager {
  constructor() {
    this.storageKey = 'wavetable-editor-state';
  }
  
  /**
   * Save complete application state
   */
  saveState(state) {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.warn('Could not save state to localStorage:', error);
    }
  }
  
  /**
   * Load application state
   */
  loadState() {
    try {
      const serialized = localStorage.getItem(this.storageKey);
      if (serialized) {
        return JSON.parse(serialized);
      }
    } catch (error) {
      console.warn('Could not load state from localStorage:', error);
    }
    return null;
  }
  
  /**
   * Clear saved state
   */
  clearState() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Could not clear state:', error);
    }
  }
  
  /**
   * Save waveform data
   */
  saveWaveform(waveform) {
    const state = this.loadState() || {};
    state.waveform = {
      sampleRate: waveform.sampleRate,
      samples: Array.from(waveform.samples)
    };
    this.saveState(state);
  }
  
  /**
   * Load waveform data
   */
  loadWaveform() {
    const state = this.loadState();
    return state?.waveform || null;
  }
  
  /**
   * Save frequency spectrum data
   */
  saveSpectrum(spectrum) {
    const state = this.loadState() || {};
    state.spectrum = {
      harmonicCount: spectrum.harmonicCount,
      harmonics: spectrum.harmonics.map(h => ({ ...h }))
    };
    this.saveState(state);
  }
  
  /**
   * Load frequency spectrum data
   */
  loadSpectrum() {
    const state = this.loadState();
    return state?.spectrum || null;
  }
  
  /**
   * Save preview frequency
   */
  saveFrequency(frequency) {
    const state = this.loadState() || {};
    state.frequency = frequency;
    this.saveState(state);
  }
  
  /**
   * Load preview frequency
   */
  loadFrequency() {
    const state = this.loadState();
    return state?.frequency || 440; // Default to A4
  }
  
  /**
   * Save preview volume
   */
  saveVolume(volume) {
    const state = this.loadState() || {};
    state.volume = volume;
    this.saveState(state);
  }
  
  /**
   * Load preview volume
   */
  loadVolume() {
    const state = this.loadState();
    return state?.volume !== undefined ? state.volume : 0.05; // Default to 5%
  }
  
  /**
   * Save active view
   */
  saveActiveView(view) {
    const state = this.loadState() || {};
    state.activeView = view;
    this.saveState(state);
  }
  
  /**
   * Load active view
   */
  loadActiveView() {
    const state = this.loadState();
    return state?.activeView || 'time';
  }
}
