/**
 * Waveform
 * Represents a single cycle of audio data in the time domain
 */
export class Waveform {
  /**
   * @param {number} sampleRate - Number of samples in the waveform (must be power of 2)
   */
  constructor(sampleRate = 1024) {
    if (!this.isPowerOfTwo(sampleRate)) {
      throw new Error('Sample rate must be a power of 2');
    }
    
    this.sampleRate = sampleRate;
    this.samples = new Float32Array(sampleRate);
    
    // Initialize with silence
    this.samples.fill(0);
  }
  
  /**
   * Get sample value at specific index
   * @param {number} index - Sample index
   * @returns {number} Sample value (-1 to 1)
   */
  getSample(index) {
    if (index < 0 || index >= this.sampleRate) {
      throw new Error(`Index ${index} out of bounds`);
    }
    return this.samples[index];
  }
  
  /**
   * Set sample value at specific index
   * @param {number} index - Sample index
   * @param {number} value - Sample value (-1 to 1)
   */
  setSample(index, value) {
    if (index < 0 || index >= this.sampleRate) {
      throw new Error(`Index ${index} out of bounds`);
    }
    // Clamp value between -1 and 1
    this.samples[index] = Math.max(-1, Math.min(1, value));
  }
  
  /**
   * Get interpolated value between samples
   * @param {number} position - Position in waveform (0 to sampleRate)
   * @returns {number} Interpolated value
   */
  interpolate(position) {
    // Wrap position to valid range
    position = ((position % this.sampleRate) + this.sampleRate) % this.sampleRate;
    
    const index = Math.floor(position);
    const fraction = position - index;
    const nextIndex = (index + 1) % this.sampleRate;
    
    // Linear interpolation
    return this.samples[index] * (1 - fraction) + this.samples[nextIndex] * fraction;
  }
  
  /**
   * Ensure waveform loops smoothly by matching end to start
   */
  ensureContinuity() {
    // Make the last sample equal to the first sample
    this.samples[this.sampleRate - 1] = this.samples[0];
  }
  
  /**
   * Apply smoothing to reduce sharp discontinuities
   * @param {number} amount - Smoothing amount (0 to 1)
   */
  smooth(amount = 0.1) {
    if (amount <= 0 || amount > 1) return;
    
    const smoothed = new Float32Array(this.sampleRate);
    
    for (let i = 0; i < this.sampleRate; i++) {
      const prev = this.samples[(i - 1 + this.sampleRate) % this.sampleRate];
      const curr = this.samples[i];
      const next = this.samples[(i + 1) % this.sampleRate];
      
      // Simple averaging with amount control
      smoothed[i] = curr * (1 - amount) + (prev + next) * 0.5 * amount;
    }
    
    this.samples.set(smoothed);
  }
  
  /**
   * Normalize waveform to maximum amplitude of 1
   */
  normalize() {
    let max = 0;
    
    for (let i = 0; i < this.sampleRate; i++) {
      max = Math.max(max, Math.abs(this.samples[i]));
    }
    
    if (max > 0 && max !== 1) {
      for (let i = 0; i < this.sampleRate; i++) {
        this.samples[i] /= max;
      }
    }
  }
  
  /**
   * Create a deep copy of this waveform
   * @returns {Waveform} Cloned waveform
   */
  clone() {
    const cloned = new Waveform(this.sampleRate);
    cloned.samples.set(this.samples);
    return cloned;
  }
  
  /**
   * Check if a number is a power of 2
   * @private
   */
  isPowerOfTwo(n) {
    return n > 0 && (n & (n - 1)) === 0;
  }
}
