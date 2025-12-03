import { Waveform } from './Waveform.js';

/**
 * WaveformExporter
 * Export waveforms to various formats
 */
export class WaveformExporter {
  /**
   * Export waveform as SuperCollider wavetable array code
   * @param {Waveform} waveform - Waveform to export
   * @returns {string} SuperCollider code
   */
  static toSuperColliderArray(waveform) {
    const values = Array.from(waveform.samples).map(v => v.toFixed(6)).join(', ');
    
    return `// Wavetable - ${waveform.sampleRate} samples
~wavetable = FloatArray[${values}];

// Load into a buffer
~buffer = Buffer.loadCollection(s, ~wavetable);

// Use with Osc
(
{
    var sig = Osc.ar(~buffer, 440, 0, 0.5);
    sig ! 2;
}.play;
)`;
  }
  
  /**
   * Export waveform as WAV file (creates download)
   * @param {Waveform} waveform - Waveform to export
   * @param {number} frequency - Frequency for one-shot playback (Hz)
   */
  static toWAV(waveform, frequency = 440) {
    // WAV file parameters
    const sampleRate = 44100; // Standard sample rate
    const duration = 1; // 1 second
    const numSamples = sampleRate * duration;
    
    // Create audio buffer by repeating waveform
    const audioData = new Float32Array(numSamples);
    const cyclesPerSecond = frequency;
    const samplesPerCycle = sampleRate / cyclesPerSecond;
    
    for (let i = 0; i < numSamples; i++) {
      const position = (i % samplesPerCycle) / samplesPerCycle * waveform.sampleRate;
      audioData[i] = waveform.interpolate(position);
    }
    
    // Create WAV file
    const wavBuffer = this.createWAVBuffer(audioData, sampleRate);
    
    // Trigger download
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wavetable_${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  /**
   * Export waveform as JSON
   * @param {Waveform} waveform - Waveform to export
   * @returns {string} JSON string
   */
  static toJSON(waveform) {
    return JSON.stringify({
      sampleRate: waveform.sampleRate,
      samples: Array.from(waveform.samples)
    }, null, 2);
  }
  
  /**
   * Create WAV file buffer from audio data
   * @private
   */
  static createWAVBuffer(audioData, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioData.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk size
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return buffer;
  }
  
  /**
   * Write string to DataView
   * @private
   */
  static writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
