import { Waveform } from './Waveform.js';

/**
 * WaveformPresets
 * Factory for generating common waveform shapes
 */
export class WaveformPresets {
  /**
   * Generate sine wave
   * @param {number} sampleRate - Number of samples
   * @returns {Waveform} Sine wave
   */
  static sine(sampleRate = 1024) {
    const waveform = new Waveform(sampleRate);
    
    for (let i = 0; i < sampleRate; i++) {
      const phase = (i / sampleRate) * Math.PI * 2;
      waveform.setSample(i, Math.sin(phase));
    }
    
    return waveform;
  }
  
  /**
   * Generate sawtooth wave
   * @param {number} sampleRate - Number of samples
   * @returns {Waveform} Sawtooth wave
   */
  static saw(sampleRate = 1024) {
    const waveform = new Waveform(sampleRate);
    
    for (let i = 0; i < sampleRate; i++) {
      // Linear ramp from -1 to 1
      waveform.setSample(i, (i / sampleRate) * 2 - 1);
    }
    
    // Ensure continuity
    waveform.ensureContinuity();
    
    return waveform;
  }
  
  /**
   * Generate square wave
   * @param {number} sampleRate - Number of samples
   * @returns {Waveform} Square wave
   */
  static square(sampleRate = 1024) {
    const waveform = new Waveform(sampleRate);
    const halfRate = sampleRate / 2;
    
    for (let i = 0; i < sampleRate; i++) {
      waveform.setSample(i, i < halfRate ? 1 : -1);
    }
    
    return waveform;
  }
  
  /**
   * Generate triangle wave
   * @param {number} sampleRate - Number of samples
   * @returns {Waveform} Triangle wave
   */
  static triangle(sampleRate = 1024) {
    const waveform = new Waveform(sampleRate);
    const quarterRate = sampleRate / 4;
    
    for (let i = 0; i < sampleRate; i++) {
      let value;
      
      if (i < quarterRate) {
        // Rise from 0 to 1
        value = i / quarterRate;
      } else if (i < 3 * quarterRate) {
        // Fall from 1 to -1
        value = 1 - ((i - quarterRate) / quarterRate);
      } else {
        // Rise from -1 to 0
        value = -1 + ((i - 3 * quarterRate) / quarterRate);
      }
      
      waveform.setSample(i, value);
    }
    
    return waveform;
  }
  
  /**
   * Generate custom harmonic series
   * @param {number} sampleRate - Number of samples
   * @param {Array<number>} harmonics - Array of harmonic amplitudes
   * @returns {Waveform} Custom waveform
   */
  static custom(sampleRate = 1024, harmonics = [1]) {
    const waveform = new Waveform(sampleRate);
    
    for (let i = 0; i < sampleRate; i++) {
      let value = 0;
      
      // Sum harmonic contributions
      for (let h = 0; h < harmonics.length; h++) {
        if (harmonics[h] !== 0) {
          const phase = ((i / sampleRate) * Math.PI * 2) * (h + 1);
          value += harmonics[h] * Math.sin(phase);
        }
      }
      
      waveform.setSample(i, value);
    }
    
    // Normalize to prevent clipping
    waveform.normalize();
    
    return waveform;
  }
}
