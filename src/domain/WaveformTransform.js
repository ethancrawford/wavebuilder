import { Waveform } from './Waveform.js';
import { FrequencySpectrum } from './FrequencySpectrum.js';

/**
 * WaveformTransform
 * Bidirectional conversion between time and frequency domains
 * Uses additive synthesis (inverse FFT) and basic FFT analysis
 */
export class WaveformTransform {
  /**
   * Convert frequency spectrum to time domain waveform using additive synthesis
   * @param {FrequencySpectrum} spectrum - Frequency spectrum
   * @param {number} sampleRate - Desired sample rate for output waveform
   * @returns {Waveform} Generated waveform
   */
  static toTimeDomain(spectrum, sampleRate = 1024) {
    const waveform = new Waveform(sampleRate);
    
    // Additive synthesis: sum of sine waves
    for (let sample = 0; sample < sampleRate; sample++) {
      let value = 0;
      
      // Add contribution from each harmonic
      for (let harmonic = 0; harmonic < spectrum.harmonicCount; harmonic++) {
        const { amplitude, phase } = spectrum.harmonics[harmonic];
        
        if (amplitude > 0) {
          // Harmonic number (1-based for frequency calculation)
          const harmonicNum = harmonic + 1;
          
          // Calculate sine wave contribution
          const angle = (2 * Math.PI * harmonicNum * sample) / sampleRate + phase;
          value += amplitude * Math.sin(angle);
        }
      }
      
      waveform.setSample(sample, value);
    }
    
    // Normalize to prevent clipping
    waveform.normalize();
    
    return waveform;
  }
  
  /**
   * Convert time domain waveform to frequency spectrum using DFT
   * @param {Waveform} waveform - Input waveform
   * @param {number} harmonicCount - Number of harmonics to extract
   * @returns {FrequencySpectrum} Generated spectrum
   */
  static toFrequencyDomain(waveform, harmonicCount = 64) {
    const spectrum = new FrequencySpectrum(harmonicCount);
    const N = waveform.sampleRate;
    
    // Perform DFT for each harmonic
    for (let k = 0; k < harmonicCount; k++) {
      let real = 0;
      let imag = 0;
      
      // Sum over all samples
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * (k + 1) * n) / N;
        real += waveform.samples[n] * Math.cos(angle);
        imag += waveform.samples[n] * Math.sin(angle);
      }
      
      // Normalize by sample count
      real /= N;
      imag /= N;
      
      // Calculate amplitude and phase
      const amplitude = 2 * Math.sqrt(real * real + imag * imag);
      const phase = Math.atan2(imag, real);
      
      spectrum.setHarmonic(k, amplitude, phase);
    }
    
    return spectrum;
  }
  
  /**
   * Apply smoothing to waveform to reduce high-frequency content
   * @param {Waveform} waveform - Waveform to smooth
   * @param {number} amount - Smoothing amount (0 to 1)
   * @returns {Waveform} New smoothed waveform
   */
  static applySmoothing(waveform, amount = 0.1) {
    const smoothed = waveform.clone();
    smoothed.smooth(amount);
    return smoothed;
  }
  
  /**
   * Apply band-limiting by removing high-frequency harmonics
   * @param {FrequencySpectrum} spectrum - Spectrum to band-limit
   * @param {number} cutoffHarmonic - Highest harmonic to keep
   * @returns {FrequencySpectrum} New band-limited spectrum
   */
  static bandLimit(spectrum, cutoffHarmonic) {
    const limited = spectrum.clone();
    
    for (let i = cutoffHarmonic; i < spectrum.harmonicCount; i++) {
      limited.setHarmonic(i, 0, 0);
    }
    
    return limited;
  }
}
