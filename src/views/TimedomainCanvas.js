import { Waveform } from '../domain/Waveform.js';

/**
 * TimedomainCanvas
 * Visual editing of waveforms in time domain
 */
export class TimedomainCanvas {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Waveform} waveform - Initial waveform
   */
  constructor(canvas, waveform) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.waveform = waveform;
    
    // Drawing state
    this.controlPoints = [];
    this.controlPointRadius = 6;
    this.hoveredPoint = null;
    this.draggedPoint = null;
    
    // Interaction state
    this.isDragging = false;
    this.isDrawing = false;
    
    // Colors (will be updated by theme changes)
    this.updateColors();
    
    // Setup
    this.setupCanvas();
    this.initializeControlPoints();
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
      controlPointHover: root.getPropertyValue('--control-point-hover').trim()
    };
  }
  
  /**
   * Initialize control points from waveform
   */
  initializeControlPoints() {
    this.controlPoints = [];
    const pointCount = Math.min(64, this.waveform.sampleRate); // Limit for performance
    const step = this.waveform.sampleRate / pointCount;
    
    for (let i = 0; i < pointCount; i++) {
      const sampleIndex = Math.floor(i * step);
      this.controlPoints.push({
        sampleIndex,
        value: this.waveform.getSample(sampleIndex)
      });
    }
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
    const point = this.findPointAtPosition(pos.x, pos.y);
    
    if (point) {
      this.isDragging = true;
      this.draggedPoint = point;
      this.canvas.classList.add('dragging');
    } else {
      // Start free drawing
      this.isDrawing = true;
      this.updateWaveformAtPosition(pos.x, pos.y);
    }
  }
  
  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    const pos = this.getMousePos(e);
    
    if (this.isDragging && this.draggedPoint) {
      // Update dragged point
      this.draggedPoint.value = this.screenToValue(pos.y);
      this.updateWaveformFromPoints();
      this.render();
      this.emitChange();
    } else if (this.isDrawing) {
      // Continue drawing
      this.updateWaveformAtPosition(pos.x, pos.y);
    } else {
      // Update hover state
      const point = this.findPointAtPosition(pos.x, pos.y);
      if (point !== this.hoveredPoint) {
        this.hoveredPoint = point;
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
      this.draggedPoint = null;
      this.canvas.classList.remove('dragging');
      this.waveform.ensureContinuity();
      this.render();
      this.emitChange();
    }
    
    if (this.isDrawing) {
      this.isDrawing = false;
      this.waveform.ensureContinuity();
      this.initializeControlPoints();
      this.render();
      this.emitChange();
    }
  }
  
  /**
   * Handle mouse leave
   */
  handleMouseLeave(e) {
    this.hoveredPoint = null;
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
   * Find control point at position
   */
  findPointAtPosition(x, y) {
    const hitRadius = this.controlPointRadius + 4;
    
    for (const point of this.controlPoints) {
      const screenX = this.sampleToScreen(point.sampleIndex);
      const screenY = this.valueToScreen(point.value);
      
      const dx = x - screenX;
      const dy = y - screenY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= hitRadius) {
        return point;
      }
    }
    
    return null;
  }
  
  /**
   * Update waveform at screen position (for drawing)
   */
  updateWaveformAtPosition(x, y) {
    const sampleIndex = Math.floor(this.screenToSample(x));
    const value = this.screenToValue(y);
    
    if (sampleIndex >= 0 && sampleIndex < this.waveform.sampleRate) {
      this.waveform.setSample(sampleIndex, value);
      
      // Also set neighboring samples for smoother drawing
      const neighbors = 2;
      for (let i = -neighbors; i <= neighbors; i++) {
        const neighborIndex = sampleIndex + i;
        if (neighborIndex >= 0 && neighborIndex < this.waveform.sampleRate) {
          const weight = 1 - Math.abs(i) / (neighbors + 1);
          const currentValue = this.waveform.getSample(neighborIndex);
          this.waveform.setSample(neighborIndex, currentValue * (1 - weight) + value * weight);
        }
      }
      
      this.render();
    }
  }
  
  /**
   * Update waveform from control points using interpolation
   */
  updateWaveformFromPoints() {
    for (let i = 0; i < this.waveform.sampleRate; i++) {
      const value = this.interpolatePointsAt(i);
      this.waveform.setSample(i, value);
    }
  }
  
  /**
   * Interpolate control points at sample index
   */
  interpolatePointsAt(sampleIndex) {
    // Find surrounding control points
    let before = this.controlPoints[0];
    let after = this.controlPoints[this.controlPoints.length - 1];
    
    for (let i = 0; i < this.controlPoints.length - 1; i++) {
      if (this.controlPoints[i].sampleIndex <= sampleIndex && 
          this.controlPoints[i + 1].sampleIndex >= sampleIndex) {
        before = this.controlPoints[i];
        after = this.controlPoints[i + 1];
        break;
      }
    }
    
    // Linear interpolation
    const range = after.sampleIndex - before.sampleIndex;
    if (range === 0) return before.value;
    
    const t = (sampleIndex - before.sampleIndex) / range;
    return before.value * (1 - t) + after.value * t;
  }
  
  /**
   * Convert sample index to screen X coordinate
   */
  sampleToScreen(sampleIndex) {
    return (sampleIndex / this.waveform.sampleRate) * this.displayWidth;
  }
  
  /**
   * Convert screen X coordinate to sample index
   */
  screenToSample(x) {
    return (x / this.displayWidth) * this.waveform.sampleRate;
  }
  
  /**
   * Convert waveform value to screen Y coordinate
   */
  valueToScreen(value) {
    return this.displayHeight / 2 - (value * this.displayHeight * 0.4);
  }
  
  /**
   * Convert screen Y coordinate to waveform value
   */
  screenToValue(y) {
    return -(y - this.displayHeight / 2) / (this.displayHeight * 0.4);
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
    
    // Draw waveform
    this.drawWaveform();
    
    // Draw control points
    this.drawControlPoints();
  }
  
  /**
   * Draw background grid
   */
  drawGrid() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;
    
    ctx.strokeStyle = this.colors.gridLine;
    ctx.lineWidth = 1;
    
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    
    // Vertical lines (every 1/8th)
    for (let i = 1; i < 8; i++) {
      const x = (i / 8) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    
    // Horizontal lines (±0.5, ±1.0)
    [0.25, 0.75].forEach(ratio => {
      const y = h * ratio;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    });
  }
  
  /**
   * Draw waveform line
   */
  drawWaveform() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    
    // Draw fill
    ctx.fillStyle = this.colors.waveformFill;
    ctx.beginPath();
    ctx.moveTo(0, this.valueToScreen(0));
    
    for (let x = 0; x <= w; x += 1) {
      const sampleIndex = this.screenToSample(x);
      const value = this.waveform.interpolate(sampleIndex);
      const y = this.valueToScreen(value);
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(w, this.valueToScreen(0));
    ctx.closePath();
    ctx.fill();
    
    // Draw line
    ctx.strokeStyle = this.colors.waveformLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let x = 0; x <= w; x += 1) {
      const sampleIndex = this.screenToSample(x);
      const value = this.waveform.interpolate(sampleIndex);
      const y = this.valueToScreen(value);
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }
  
  /**
   * Draw control points
   */
  drawControlPoints() {
    const ctx = this.ctx;
    
    for (const point of this.controlPoints) {
      const x = this.sampleToScreen(point.sampleIndex);
      const y = this.valueToScreen(point.value);
      const isHovered = point === this.hoveredPoint;
      
      // Point circle
      ctx.fillStyle = isHovered ? this.colors.controlPointHover : this.colors.controlPoint;
      ctx.beginPath();
      ctx.arc(x, y, this.controlPointRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Point outline
      ctx.strokeStyle = this.colors.canvasBg;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  
  /**
   * Update waveform and re-render
   */
  updateFromWaveform(waveform) {
    this.waveform = waveform;
    this.initializeControlPoints();
    this.render();
  }
  
  /**
   * Emit change event
   */
  emitChange() {
    const event = new CustomEvent('waveformchange', {
      detail: { waveform: this.waveform }
    });
    this.canvas.dispatchEvent(event);
  }
}
