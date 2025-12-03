import { FrequencySpectrum } from '../domain/FrequencySpectrum.js';

/**
 * FrequencyCanvas
 * Visual editing of waveforms in frequency domain (additive synthesis)
 */
export class FrequencyCanvas {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {FrequencySpectrum} spectrum - Initial spectrum
   */
  constructor(canvas, spectrum) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.spectrum = spectrum;
    
    // Display settings
    this.visibleHarmonics = 32; // Show first 32 harmonics
    this.barPadding = 0.2; // Padding between bars (ratio)
    
    // Interaction state
    this.hoveredHarmonic = null;
    this.draggedHarmonic = null;
    this.isDragging = false;
    
    // Colors (will be updated by theme changes)
    this.updateColors();
    
    // Setup
    this.setupCanvas();
    this.bindEvents();
    this.render();
    
    // Listen for theme changes
    window.addEventListener('themechange', () => {
      this.updateColors();
      this.render();
    });
  }
  
  /**
   * Setup canvas with proper DPI scaling
   */
  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    // Store display dimensions
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
  }
  
  /**
   * Update colors from CSS variables
   */
  updateColors() {
    const root = getComputedStyle(document.documentElement);
    this.colors = {
      canvasBg: root.getPropertyValue('--canvas-bg').trim(),
      waveformLine: root.getPropertyValue('--waveform-line').trim(),
      waveformFill: root.getPropertyValue('--waveform-fill').trim(),
      gridLine: root.getPropertyValue('--grid-line').trim(),
      controlPoint: root.getPropertyValue('--control-point').trim(),
      controlPointHover: root.getPropertyValue('--control-point-hover').trim(),
      textSecondary: root.getPropertyValue('--text-secondary').trim()
    };
  }
  
  /**
   * Bind mouse and touch events
   */
  bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * Handle mouse down
   */
  handleMouseDown(e) {
    const pos = this.getMousePos(e);
    const harmonic = this.findHarmonicAtPosition(pos.x, pos.y);
    
    if (harmonic !== null) {
      this.isDragging = true;
      this.draggedHarmonic = harmonic;
      this.canvas.classList.add('dragging');
      this.updateHarmonicAtPosition(harmonic, pos.y);
    }
  }
  
  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    const pos = this.getMousePos(e);
    
    if (this.isDragging && this.draggedHarmonic !== null) {
      this.updateHarmonicAtPosition(this.draggedHarmonic, pos.y);
    } else {
      // Update hover state
      const harmonic = this.findHarmonicAtPosition(pos.x, pos.y);
      if (harmonic !== this.hoveredHarmonic) {
        this.hoveredHarmonic = harmonic;
        this.render();
      }
    }
  }
  
  /**
   * Handle mouse up
   */
  handleMouseUp(e) {
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedHarmonic = null;
      this.canvas.classList.remove('dragging');
      this.emitChange();
    }
  }
  
  /**
   * Handle mouse leave
   */
  handleMouseLeave(e) {
    this.hoveredHarmonic = null;
    this.render();
  }
  
  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.handleMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    }
  }
  
  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.handleMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    }
  }
  
  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    this.handleMouseUp(e);
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    this.setupCanvas();
    this.render();
  }
  
  /**
   * Get mouse position relative to canvas
   */
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  
  /**
   * Find harmonic at screen position
   */
  findHarmonicAtPosition(x, y) {
    const barWidth = this.displayWidth / this.visibleHarmonics;
    const harmonic = Math.floor(x / barWidth);
    
    if (harmonic >= 0 && harmonic < this.visibleHarmonics) {
      // Check if Y is within the bar area (below the center line)
      const centerY = this.displayHeight * 0.85; // Bars grow upward from 85% down
      if (y <= centerY) {
        return harmonic;
      }
    }
    
    return null;
  }
  
  /**
   * Update harmonic amplitude at screen Y position
   */
  updateHarmonicAtPosition(harmonic, y) {
    const centerY = this.displayHeight * 0.85;
    const maxBarHeight = centerY - 20; // Leave margin at top
    
    // Calculate amplitude (0 to 1)
    let amplitude = Math.max(0, Math.min(1, (centerY - y) / maxBarHeight));
    
    // Set harmonic amplitude (keep existing phase)
    const current = this.spectrum.getHarmonic(harmonic);
    this.spectrum.setHarmonic(harmonic, amplitude, current.phase);
    
    this.render();
  }
  
  /**
   * Render the canvas
   */
  render() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;
    
    // Clear canvas
    ctx.fillStyle = this.colors.canvasBg;
    ctx.fillRect(0, 0, w, h);
    
    // Draw grid
    this.drawGrid();
    
    // Draw harmonic bars
    this.drawHarmonicBars();
    
    // Draw labels
    this.drawLabels();
  }
  
  /**
   * Draw background grid
   */
  drawGrid() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;
    const centerY = h * 0.85;
    
    ctx.strokeStyle = this.colors.gridLine;
    ctx.lineWidth = 1;
    
    // Horizontal baseline
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();
    
    // Horizontal grid lines (25%, 50%, 75%, 100% amplitude)
    for (let i = 1; i <= 4; i++) {
      const ratio = i / 4;
      const maxBarHeight = centerY - 20;
      const y = centerY - (maxBarHeight * ratio);
      
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.restore();
    }
    
    // Vertical lines every 4 harmonics
    const barWidth = w / this.visibleHarmonics;
    for (let i = 4; i < this.visibleHarmonics; i += 4) {
      const x = i * barWidth;
      
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, centerY);
      ctx.stroke();
      ctx.restore();
    }
  }
  
  /**
   * Draw harmonic bars
   */
  drawHarmonicBars() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;
    const centerY = h * 0.85;
    const maxBarHeight = centerY - 20;
    
    const barWidth = w / this.visibleHarmonics;
    const padding = barWidth * this.barPadding;
    const actualBarWidth = barWidth - padding;
    
    for (let i = 0; i < this.visibleHarmonics; i++) {
      const harmonic = this.spectrum.getHarmonic(i);
      const amplitude = harmonic.amplitude;
      
      const x = i * barWidth + padding / 2;
      const barHeight = amplitude * maxBarHeight;
      const y = centerY - barHeight;
      
      const isHovered = i === this.hoveredHarmonic;
      const isDragged = i === this.draggedHarmonic;
      
      // Bar fill
      if (amplitude > 0) {
        // Create gradient for bars
        const gradient = ctx.createLinearGradient(x, centerY, x, y);
        
        if (isHovered || isDragged) {
          gradient.addColorStop(0, this.colors.controlPointHover);
          gradient.addColorStop(1, this.colors.waveformLine);
        } else {
          gradient.addColorStop(0, this.colors.waveformFill);
          gradient.addColorStop(1, this.colors.waveformLine);
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, actualBarWidth, barHeight);
        
        // Bar outline
        ctx.strokeStyle = this.colors.waveformLine;
        ctx.lineWidth = isHovered || isDragged ? 2 : 1;
        ctx.strokeRect(x, y, actualBarWidth, barHeight);
      } else {
        // Empty bar placeholder
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = this.colors.gridLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, centerY - 10, actualBarWidth, 10);
        ctx.restore();
      }
    }
  }
  
  /**
   * Draw harmonic labels
   */
  drawLabels() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;
    const centerY = h * 0.85;
    
    ctx.fillStyle = this.colors.textSecondary;
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    
    const barWidth = w / this.visibleHarmonics;
    
    // Label every 4th harmonic
    for (let i = 0; i < this.visibleHarmonics; i += 4) {
      const x = i * barWidth + barWidth / 2;
      const harmonicNum = i + 1;
      
      ctx.fillText(harmonicNum.toString(), x, centerY + 15);
    }
    
    // Label last harmonic if not already labeled
    if (this.visibleHarmonics % 4 !== 0) {
      const x = (this.visibleHarmonics - 1) * barWidth + barWidth / 2;
      ctx.fillText(this.visibleHarmonics.toString(), x, centerY + 15);
    }
    
    // Amplitude labels on the left
    ctx.textAlign = 'right';
    const maxBarHeight = centerY - 20;
    
    for (let i = 1; i <= 4; i++) {
      const ratio = i / 4;
      const y = centerY - (maxBarHeight * ratio);
      const label = (ratio * 100).toFixed(0) + '%';
      
      ctx.fillText(label, w - 5, y + 4);
    }
    
    // Title
    ctx.textAlign = 'left';
    ctx.font = '12px "Space Grotesk", sans-serif';
    ctx.fillStyle = this.colors.textSecondary;
    ctx.fillText('Harmonics (Additive Synthesis)', 10, 20);
  }
  
  /**
   * Update spectrum and re-render
   */
  updateFromSpectrum(spectrum) {
    this.spectrum = spectrum;
    this.render();
  }
  
  /**
   * Emit change event
   */
  emitChange() {
    const event = new CustomEvent('spectrumchange', {
      detail: { spectrum: this.spectrum }
    });
    this.canvas.dispatchEvent(event);
  }
}
