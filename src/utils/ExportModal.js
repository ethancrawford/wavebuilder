/**
 * ExportModal
 * Handles display of export code in a modal
 */
export class ExportModal {
  constructor() {
    this.modal = null;
    this.codeElement = null;
    this.copyButton = null;
    this.currentCode = '';
    
    this.createModal();
    this.bindEvents();
  }
  
  /**
   * Create modal DOM structure
   */
  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'export-modal';
    this.modal.innerHTML = `
      <div class="export-modal-content">
        <div class="export-modal-header">
          <h3 class="export-modal-title">Export Code</h3>
          <button class="export-modal-close" aria-label="Close">×</button>
        </div>
        <div class="export-modal-body">
          <div class="export-code-container">
            <pre class="export-code"></pre>
          </div>
        </div>
        <div class="export-modal-footer">
          <button class="action-button copy-button">Copy to Clipboard</button>
          <button class="action-button">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    this.codeElement = this.modal.querySelector('.export-code');
    this.copyButton = this.modal.querySelector('.copy-button');
  }
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Close button
    this.modal.querySelector('.export-modal-close').addEventListener('click', () => {
      this.hide();
    });
    
    // Close button in footer
    this.modal.querySelectorAll('.action-button')[1].addEventListener('click', () => {
      this.hide();
    });
    
    // Copy button
    this.copyButton.addEventListener('click', () => {
      this.copyToClipboard();
    });
    
    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('visible')) {
        this.hide();
      }
    });
  }
  
  /**
   * Show modal with code
   */
  show(code, title = 'Export Code') {
    this.currentCode = code;
    this.codeElement.textContent = code;
    this.modal.querySelector('.export-modal-title').textContent = title;
    this.modal.classList.add('visible');
    this.copyButton.textContent = 'Copy to Clipboard';
    this.copyButton.classList.remove('copied');
  }
  
  /**
   * Hide modal
   */
  hide() {
    this.modal.classList.remove('visible');
  }
  
  /**
   * Copy code to clipboard
   */
  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.currentCode);
      this.copyButton.textContent = 'Copied!';
      this.copyButton.classList.add('copied');
      
      setTimeout(() => {
        this.copyButton.textContent = 'Copy to Clipboard';
        this.copyButton.classList.remove('copied');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      this.fallbackCopy();
    }
  }
  
  /**
   * Fallback copy method for older browsers
   */
  fallbackCopy() {
    const textArea = document.createElement('textarea');
    textArea.value = this.currentCode;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.copyButton.textContent = 'Copied!';
      this.copyButton.classList.add('copied');
      
      setTimeout(() => {
        this.copyButton.textContent = 'Copy to Clipboard';
        this.copyButton.classList.remove('copied');
      }, 2000);
    } catch (error) {
      console.error('Fallback copy failed:', error);
    }
    
    document.body.removeChild(textArea);
  }
}
