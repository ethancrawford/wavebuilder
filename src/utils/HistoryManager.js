// src/utils/HistoryManager.js
/**
 * HistoryManager
 * Manages undo/redo history for waveform editing
 */
export class HistoryManager {
  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Push a new state to history
   * @param {Object} state - State to save (waveform and spectrum data)
   */
  push(state) {
    // Remove any history after current index (when pushing after undo)
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new state
    this.history.push(this.cloneState(state));

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }

    this.dispatchHistoryChange();
  }

  /**
   * Check if undo is available
   */
  canUndo() {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Undo to previous state
   * @returns {Object|null} Previous state or null if not available
   */
  undo() {
    if (this.canUndo()) {
      this.currentIndex--;
      this.dispatchHistoryChange();
      return this.cloneState(this.history[this.currentIndex]);
    }
    return null;
  }

  /**
   * Redo to next state
   * @returns {Object|null} Next state or null if not available
   */
  redo() {
    if (this.canRedo()) {
      this.currentIndex++;
      this.dispatchHistoryChange();
      return this.cloneState(this.history[this.currentIndex]);
    }
    return null;
  }

  /**
   * Get current state
   */
  getCurrentState() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.cloneState(this.history[this.currentIndex]);
    }
    return null;
  }

  /**
   * Clear all history
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
    this.dispatchHistoryChange();
  }

  /**
   * Get history info for debugging
   */
  getInfo() {
    return {
      size: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  /**
   * Deep clone state object
   * @private
   */
  cloneState(state) {
    return {
      waveform: {
        sampleRate: state.waveform.sampleRate,
        samples: new Float32Array(state.waveform.samples)
      },
      spectrum: {
        harmonicCount: state.spectrum.harmonicCount,
        harmonics: state.spectrum.harmonics.map(h => ({ ...h }))
      },
      timestamp: Date.now()
    };
  }

  /**
   * Dispatch custom event when history state changes
   * @private
   */
  dispatchHistoryChange() {
    window.dispatchEvent(new CustomEvent('historychange', {
      detail: {
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        historySize: this.history.length,
        currentIndex: this.currentIndex
      }
    }));
  }
}
