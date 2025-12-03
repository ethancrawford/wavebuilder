/**
 * FrequencySpectrum
 * Represents frequency domain representation of a waveform
 */
export class FrequencySpectrum {
  /**
   * @param {number} harmonicCount - Number of harmonics to store
   */
  constructor(harmonicCount = 64) {
    this.harmonicCount = harmonicCount;
    this.fundamentalFrequency = 440; // Hz (for reference only)
    
    // Array of {amplitude, phase} objects
    this.harmonics = Array.from({ length: harmonicCount }, () => ({
      amplitude: 0,
      phase: 0
    }));
  }
  
  /**
   * Get harmonic data at specific index
   * @param {number} index - Harmonic index (0 = fundamental)
   * @returns {{amplitude: number, phase: number}} Harmonic data
   */
  getHarmonic(index) {
    if (index < 0 || index >= this.harmonicCount) {
      throw new Error(`Harmonic index ${index} out of bounds`);
    }
    return { ...this.harmonics[index] };
  }
  
  /**
   * Set harmonic data at specific index
   * @param {number} index - Harmonic index (0 = fundamental)
   * @param {number} amplitude - Amplitude (0 to 1)
   * @param {number} phase - Phase in radians (0 to 2π)
   */
  setHarmonic(index, amplitude, phase = 0) {
    if (index < 0 || index >= this.harmonicCount) {
      throw new Error(`Harmonic index ${index} out of bounds`);
    }
    
    this.harmonics[index] = {
      amplitude: Math.max(0, Math.min(1, amplitude)),
      phase: phase % (Math.PI * 2)
    };
  }
  
  /**
   * Clear all harmonics
   */
  clear() {
    for (let i = 0; i < this.harmonicCount; i++) {
      this.harmonics[i] = { amplitude: 0, phase: 0 };
    }
  }
  
  /**
   * Normalize all harmonic amplitudes so the sum equals 1
   */
  normalize() {
    let sum = 0;
    
    for (let i = 0; i < this.harmonicCount; i++) {
      sum += this.harmonics[i].amplitude;
    }
    
    if (sum > 0 && sum !== 1) {
      for (let i = 0; i < this.harmonicCount; i++) {
        this.harmonics[i].amplitude /= sum;
      }
    }
  }
  
  /**
   * Create a deep copy of this spectrum
   * @returns {FrequencySpectrum} Cloned spectrum
   */
  clone() {
    const cloned = new FrequencySpectrum(this.harmonicCount);
    cloned.fundamentalFrequency = this.fundamentalFrequency;
    cloned.harmonics = this.harmonics.map(h => ({ ...h }));
    return cloned;
  }
}
