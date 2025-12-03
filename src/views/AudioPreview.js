import * as Tone from 'tone';
import { Waveform } from '../domain/Waveform.js';

/**
 * AudioPreview
 * Audio playback abstraction layer using Tone.js
 * Designed to be easily swappable with other audio libraries (e.g., scsynth.js)
 */
export class AudioPreview {
  constructor() {
    this.isPlaying = false;
    this.currentOscillator = null;
    this.currentWaveform = null;
    this.frequency = 440; // A4
    this.volume = 0.05; // Default 50%
    this.gainNode = null;
    this.periodicWave = null;
    
    // Audio context will be started on first user interaction
    this.audioContextStarted = false;
  }
  
  /**
   * Ensure audio context is started (required by browsers)
   */
  async ensureAudioContext() {
    if (!this.audioContextStarted) {
      await Tone.start();
      this.audioContextStarted = true;
      console.log('Audio context started');
    }
  }
  
  /**
   * Play waveform preview
   * @param {Waveform} waveform - Waveform to play
   * @param {number} frequency - Frequency in Hz (optional)
   * @param {number} duration - Duration in seconds (optional, 0 = infinite)
   */
  async play(waveform, frequency = null, duration = 0) {
    // Ensure audio context is running
    await this.ensureAudioContext();
    
    // Stop any current playback
    this.stop();
    
    // Update frequency if provided
    if (frequency !== null) {
      this.frequency = frequency;
    }
    
    // Store current waveform
    this.currentWaveform = waveform;
    
    // Create periodic wave from waveform
    this.createPeriodicWave(waveform);

    // Create gain node for volume control
    this.gainNode = new Tone.Gain(this.volume).toDestination();

    // Create and start oscillator using Tone.js
    this.currentOscillator = new Tone.Oscillator({
      frequency: this.frequency,
      type: 'custom',
      partials: this.getPartials(waveform)
    }).connect(this.gainNode);
    
    this.currentOscillator.start();
    this.isPlaying = true;
    
    // If duration specified, stop after that time
    if (duration > 0) {
      setTimeout(() => {
        this.stop();
      }, duration * 1000);
    }
    
    console.log(`Playing at ${this.frequency} Hz, volume ${Math.round(this.volume * 100)}%`);
  }
  
  /**
   * Stop playback
   */
  stop() {
    if (this.currentOscillator) {
      this.currentOscillator.stop();
      this.currentOscillator.dispose();
      this.currentOscillator = null;
    }
    if (this.gainNode) {
      this.gainNode.dispose();
      this.gainNode = null;
    }
    this.isPlaying = false;
    console.log('Stopped playback');
  }
  
  /**
   * Update the waveform while playing
   * @param {Waveform} waveform - New waveform
   */
  updateWaveform(waveform) {
    if (this.isPlaying && this.currentOscillator) {
      // For Tone.js, we need to restart the oscillator with new partials
      const wasPlaying = this.isPlaying;
      const currentFreq = this.frequency;
      
      this.stop();
      
      if (wasPlaying) {
        this.play(waveform, currentFreq);
      }
    }
    
    this.currentWaveform = waveform;
  }
  
  /**
   * Set playback frequency
   * @param {number} frequency - Frequency in Hz
   */
  setFrequency(frequency) {
    this.frequency = frequency;
    
    if (this.isPlaying && this.currentOscillator) {
      this.currentOscillator.frequency.value = frequency;
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(0.1, volume));

    if (this.isPlaying && this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Create Web Audio API PeriodicWave from waveform
   * @private
   */
  createPeriodicWave(waveform) {
    // Get Fourier coefficients using FFT
    const real = new Float32Array(waveform.sampleRate / 2);
    const imag = new Float32Array(waveform.sampleRate / 2);
    
    // Perform FFT to get frequency domain representation
    this.fft(waveform.samples, real, imag);
    
    // Store for Web Audio API (if needed for direct access)
    this.periodicWave = { real, imag };
  }
  
  /**
   * Get harmonic partials for Tone.js oscillator
   * @private
   */
  getPartials(waveform) {
    // Extract first 32 harmonics as partials
    const partials = [];
    const N = waveform.sampleRate;
    
    for (let k = 1; k <= 32; k++) {
      let real = 0;
      let imag = 0;
      
      // DFT for this harmonic
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        real += waveform.samples[n] * Math.cos(angle);
        imag += waveform.samples[n] * Math.sin(angle);
      }
      
      real /= N;
      imag /= N;
      
      // Calculate amplitude (normalized)
      const amplitude = 2 * Math.sqrt(real * real + imag * imag);
      partials.push(amplitude);
    }
    
    return partials;
  }
  
  /**
   * Simple FFT implementation
   * @private
   */
  fft(samples, real, imag) {
    const N = samples.length;
    
    for (let k = 0; k < real.length; k++) {
      real[k] = 0;
      imag[k] = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        real[k] += samples[n] * Math.cos(angle);
        imag[k] += samples[n] * Math.sin(angle);
      }
    }
  }
  
  /**
   * Check if audio is currently playing
   */
  getIsPlaying() {
    return this.isPlaying;
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    this.stop();
  }
}
