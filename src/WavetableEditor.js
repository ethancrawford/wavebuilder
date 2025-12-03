import { Waveform } from './domain/Waveform.js';
import { FrequencySpectrum } from './domain/FrequencySpectrum.js';
import { WaveformTransform } from './domain/WaveformTransform.js';
import { WaveformPresets } from './domain/WaveformPresets.js';
import { WaveformExporter } from './domain/WaveformExporter.js';
import { TimedomainCanvas } from './views/TimedomainCanvas.js';
import { FrequencyCanvas } from './views/FrequencyCanvas.js';
import { AudioPreview } from './views/AudioPreview.js';
import { ExportModal } from './utils/ExportModal.js';
import { ExportNotification } from './utils/ExportNotification.js';
import { StorageManager } from './utils/StorageManager.js';
import { HistoryManager } from './utils/HistoryManager.js';

/**
 * WavetableEditor
 * Main controller coordinating views and domain entities
 */
export class WavetableEditor {
  constructor() {
    // Domain state
    this.sampleRate = 1024;
    this.currentWaveform = WaveformPresets.sine(this.sampleRate);
    this.currentSpectrum = null;
    this.activeView = 'time';

    // View references
    this.timeCanvas = null;
    this.frequencyCanvas = null;
    this.audioPreview = null;
    this.exportModal = null;
    this.exportNotification = null;
    this.storageManager = null;
    this.historyManager = null;
    this.isRestoringHistory = false; // Flag to prevent history recording during undo/redo

    // UI element references
    this.elements = {
      timeCanvas: document.getElementById('time-canvas'),
      frequencyCanvas: document.getElementById('frequency-canvas'),
      viewSelect: document.getElementById('view-mode'),
      sampleCount: document.getElementById('sample-count'),
      frequencyDisplay: document.getElementById('frequency-display'),
      presetButtons: document.querySelectorAll('.preset-button'),
      playButton: document.getElementById('play-button'),
      stopButton: document.getElementById('stop-button'),
      exportSC: document.getElementById('export-sc'),
      exportWAV: document.getElementById('export-wav'),
      exportJSON: document.getElementById('export-json'),
      frequencySlider: document.getElementById('frequency-slider'),
      frequencyValue: document.getElementById('frequency-value'),
      volumeSlider: document.getElementById('volume-slider'),
      volumeValue: document.getElementById('volume-value'),
      undoButton: document.getElementById('undo-button'),
      redoButton: document.getElementById('redo-button')
    };

    this.initialize();
  }

  initialize() {
    this.storageManager = new StorageManager();
    this.historyManager = new HistoryManager(50);
    const savedWaveformData = this.storageManager.loadWaveform();
    const savedFrequency = this.storageManager.loadFrequency();
    const savedVolume = this.storageManager.loadVolume();
    const savedView = this.storageManager.loadActiveView();
    if (savedWaveformData) {
      this.currentWaveform = new Waveform(savedWaveformData.sampleRate);
      this.currentWaveform.samples.set(savedWaveformData.samples);
      console.log('Restored saved waveform');
    } else {
      this.currentWaveform = WaveformPresets.sine(this.sampleRate);
  }
    // Initialize frequency spectrum from current waveform
    this.currentSpectrum = WaveformTransform.toFrequencyDomain(
      this.currentWaveform,
      64
    );

    // Initialize time domain view
    this.timeCanvas = new TimedomainCanvas(
      this.elements.timeCanvas,
      this.currentWaveform
    );

    // Initialize frequency domain view
    this.frequencyCanvas = new FrequencyCanvas(
      this.elements.frequencyCanvas,
      this.currentSpectrum
    );

    // Initialize audio preview
    this.audioPreview = new AudioPreview();
    this.audioPreview.setVolume(savedVolume);

    // Initialize export utilities
    this.exportModal = new ExportModal();
    this.exportNotification = new ExportNotification();

    // Restore UI state
    this.elements.frequencySlider.value = savedFrequency;
    this.elements.frequencyValue.textContent = `${savedFrequency} Hz`;
    this.elements.volumeSlider.value = Math.round(savedVolume * 1000);
    this.elements.volumeValue.textContent = `${Math.round(savedVolume * 1000)}%`;
    this.elements.viewSelect.value = savedView;

    this.pushToHistory();
    // Bind events
    this.bindEvents();

    this.switchView(savedView);
    // Update UI
    this.updateInfoDisplay();

    console.log('WavetableEditor initialized');
  }

  bindEvents() {
    // View switching
    this.elements.viewSelect.addEventListener('change', (e) => {
      this.switchView(e.target.value);
    });

    // Time domain canvas changes
    this.elements.timeCanvas.addEventListener('waveformchange', (e) => {
      this.onTimeDomainChange(e.detail.waveform);
    });

    // Frequency domain canvas changes
    this.elements.frequencyCanvas.addEventListener('spectrumchange', (e) => {
      this.onFrequencyDomainChange(e.detail.spectrum);
    });

    // Preset buttons
    this.elements.presetButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const preset = e.target.dataset.preset;
        this.loadPreset(preset);
      });
    });

    // Frequency control
    this.elements.frequencySlider.addEventListener('input', (e) => {
      const freq = parseInt(e.target.value);
      this.elements.frequencyValue.textContent = `${freq} Hz`;
      if (this.audioPreview.getIsPlaying()) {
        this.audioPreview.setFrequency(freq);
      }
    });

    this.elements.frequencySlider.addEventListener('change', (e) => {
      const freq = parseInt(e.target.value);
      this.storageManager.saveFrequency(freq);
    });

    // Volume control
    this.elements.volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value) / 1000;
      this.elements.volumeValue.textContent = `${e.target.value}%`;
      this.audioPreview.setVolume(volume);
      this.storageManager.saveVolume(volume);
    });

    // Audio controls
    this.elements.playButton.addEventListener('click', () => {
      this.playPreview();
    });

    this.elements.stopButton.addEventListener('click', () => {
      this.stopPreview();
    });

    // Export buttons
    this.elements.exportSC.addEventListener('click', () => {
      this.exportWaveform('supercollider');
    });

    this.elements.exportWAV.addEventListener('click', () => {
      this.exportWaveform('wav');
    });

    this.elements.exportJSON.addEventListener('click', () => {
      this.exportWaveform('json');
    });

    // History buttons
    this.elements.undoButton.addEventListener('click', () => {
      this.undo();
    });

    this.elements.redoButton.addEventListener('click', () => {
      this.redo();
    });

    // Keyboard shortcuts for undo/redo
    document.addEventListener('keydown', (e) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        this.redo();
      }
    });

    // Listen for history changes to update button states
    window.addEventListener('historychange', (e) => {
      this.updateHistoryButtons(e.detail);
    });
  }

  pushToHistory() {
    if (this.isRestoringHistory) {
      return; // Don't record history when restoring from undo/redo
    }

    const state = {
      waveform: {
        sampleRate: this.currentWaveform.sampleRate,
        samples: this.currentWaveform.samples
      },
      spectrum: {
        harmonicCount: this.currentSpectrum.harmonicCount,
        harmonics: this.currentSpectrum.harmonics
      }
    };

    this.historyManager.push(state);
  }

  // Add undo method
  undo() {
    const previousState = this.historyManager.undo();

    if (previousState) {
      this.restoreState(previousState);
      console.log('Undo');
    }
  }

  // Add redo method
  redo() {
    const nextState = this.historyManager.redo();

    if (nextState) {
      this.restoreState(nextState);
      console.log('Redo');
    }
  }

  // Add restore state method
  restoreState(state) {
    this.isRestoringHistory = true;

    // Restore waveform
    this.currentWaveform = new Waveform(state.waveform.sampleRate);
    this.currentWaveform.samples.set(state.waveform.samples);

    // Restore spectrum
    this.currentSpectrum = new FrequencySpectrum(state.spectrum.harmonicCount);
    this.currentSpectrum.harmonics = state.spectrum.harmonics.map(h => ({ ...h }));

    // Update active view
    if (this.activeView === 'time') {
      this.timeCanvas.updateFromWaveform(this.currentWaveform);
    } else {
      this.frequencyCanvas.updateFromSpectrum(this.currentSpectrum);
    }

    // Update audio if playing
    if (this.audioPreview && this.audioPreview.getIsPlaying()) {
      this.audioPreview.updateWaveform(this.currentWaveform);
    }

    // Save to localStorage
    this.storageManager.saveWaveform(this.currentWaveform);
    this.storageManager.saveSpectrum(this.currentSpectrum);

    // Update info display
    this.updateInfoDisplay();

    this.isRestoringHistory = false;
  }

  // Add method to update history button states
  updateHistoryButtons(historyState) {
    this.elements.undoButton.disabled = !historyState.canUndo;
    this.elements.redoButton.disabled = !historyState.canRedo;

    // Update tooltips with history info
    this.elements.undoButton.title = historyState.canUndo
      ? `Undo (Ctrl+Z) - ${historyState.currentIndex}/${historyState.historySize}`
      : 'Undo (Ctrl+Z)';
    this.elements.redoButton.title = historyState.canRedo
      ? `Redo (Ctrl+Y) - ${historyState.currentIndex + 2}/${historyState.historySize}`
      : 'Redo (Ctrl+Y)';
  }

  switchView(viewType) {
    this.activeView = viewType;
    this.storageManager.saveActiveView(viewType);

    if (viewType === 'time') {
      this.elements.timeCanvas.classList.remove('hidden');
      this.elements.frequencyCanvas.classList.add('hidden');

      // Force canvas setup and render
      this.timeCanvas.setupCanvas();
      this.timeCanvas.updateFromWaveform(this.currentWaveform);
    } else if (viewType === 'frequency') {
      this.elements.timeCanvas.classList.add('hidden');
      this.elements.frequencyCanvas.classList.remove('hidden');

      // Force canvas setup and render
      this.frequencyCanvas.setupCanvas();
      this.frequencyCanvas.updateFromSpectrum(this.currentSpectrum);
    }
  }

  onTimeDomainChange(waveform) {
    // Update current waveform
    this.currentWaveform = waveform.clone();

    // Transform to frequency domain
    this.currentSpectrum = WaveformTransform.toFrequencyDomain(
      this.currentWaveform,
      64
    );

    // Update frequency view if active
    if (this.activeView === 'frequency') {
      this.frequencyCanvas.updateFromSpectrum(this.currentSpectrum);
    }

    // Update audio if playing
    if (this.audioPreview && this.audioPreview.getIsPlaying()) {
      this.audioPreview.updateWaveform(this.currentWaveform);
    }
    this.pushToHistory();

    this.storageManager.saveWaveform(this.currentWaveform);
    this.storageManager.saveSpectrum(this.currentSpectrum);

    // Update info display
    this.updateInfoDisplay();
  }

  onFrequencyDomainChange(spectrum) {
    // Update current spectrum
    this.currentSpectrum = spectrum.clone();

    // Transform to time domain
    this.currentWaveform = WaveformTransform.toTimeDomain(
      this.currentSpectrum,
      this.sampleRate
    );

    // Update time view if not active
    if (this.activeView === 'time') {
      this.timeCanvas.updateFromWaveform(this.currentWaveform);
    }

    // Update audio if playing
    if (this.audioPreview && this.audioPreview.getIsPlaying()) {
      this.audioPreview.updateWaveform(this.currentWaveform);
    }
    this.pushToHistory();

    this.storageManager.saveWaveform(this.currentWaveform);
    this.storageManager.saveSpectrum(this.currentSpectrum);

    // Update info display
    this.updateInfoDisplay();
  }

  loadPreset(presetName) {
    let waveform;

    switch (presetName) {
      case 'sine':
        waveform = WaveformPresets.sine(this.sampleRate);
        break;
      case 'saw':
        waveform = WaveformPresets.saw(this.sampleRate);
        break;
      case 'square':
        waveform = WaveformPresets.square(this.sampleRate);
        break;
      case 'triangle':
        waveform = WaveformPresets.triangle(this.sampleRate);
        break;
      default:
        console.warn(`Unknown preset: ${presetName}`);
        return;
    }

    // Update current waveform
    this.currentWaveform = waveform;

    // Update spectrum
    this.currentSpectrum = WaveformTransform.toFrequencyDomain(
      this.currentWaveform,
      64
    );

    // Update active view
    if (this.activeView === 'time') {
      this.timeCanvas.updateFromWaveform(this.currentWaveform);
    } else {
      this.frequencyCanvas.updateFromSpectrum(this.currentSpectrum);
    }
    this.pushToHistory();

    this.storageManager.saveWaveform(this.currentWaveform);
    this.storageManager.saveSpectrum(this.currentSpectrum);

    // Update info display
    this.updateInfoDisplay();

    console.log(`Loaded preset: ${presetName}`);
  }

  async playPreview() {
    try {
      const frequency = parseInt(this.elements.frequencySlider.value);
      await this.audioPreview.play(this.currentWaveform, frequency);

      this.elements.playButton.disabled = true;
      this.elements.stopButton.disabled = false;

      console.log('Playing preview');
    } catch (error) {
      console.error('Error playing audio:', error);
      this.stopPreview();
    }
  }

  stopPreview() {
    this.audioPreview.stop();

    this.elements.playButton.disabled = false;
    this.elements.stopButton.disabled = true;

    console.log('Stopped preview');
  }

  exportWaveform(format) {
    switch (format) {
      case 'supercollider':
        this.exportSuperCollider();
        break;
      case 'wav':
        this.exportWAV();
        break;
      case 'json':
        this.exportJSON();
        break;
      default:
        console.warn(`Unknown export format: ${format}`);
    }
  }

  exportSuperCollider() {
    const code = WaveformExporter.toSuperColliderArray(this.currentWaveform);
    this.exportModal.show(code, 'SuperCollider Export');
    console.log('Exported SuperCollider code');
  }

  exportWAV() {
    try {
      const frequency = parseInt(this.elements.frequencySlider.value);
      WaveformExporter.toWAV(this.currentWaveform, frequency);
      this.exportNotification.show('WAV file downloaded!');
      console.log('Exported WAV file');
    } catch (error) {
      console.error('Error exporting WAV:', error);
      this.exportNotification.show('Error exporting WAV file');
    }
  }

  exportJSON() {
    const json = WaveformExporter.toJSON(this.currentWaveform);
    this.exportModal.show(json, 'JSON Export');
    console.log('Exported JSON');
  }

  updateInfoDisplay() {
    this.elements.sampleCount.textContent = this.sampleRate;

    const playbackRate = 44100;
    const frequency = Math.round(playbackRate / this.sampleRate);
    this.elements.frequencyDisplay.textContent = `${frequency} Hz`;
  }

  getWaveform() {
    return this.currentWaveform.clone();
  }

  getSpectrum() {
    return this.currentSpectrum.clone();
  }
}
