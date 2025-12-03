/**
 * ExportNotification
 * Shows temporary notifications for file exports
 */
export class ExportNotification {
  constructor() {
    this.notification = null;
    this.createNotification();
  }

  /**
   * Create notification DOM element
   */
  createNotification() {
    this.notification = document.createElement('div');
    this.notification.className = 'export-notification';
    document.body.appendChild(this.notification);
  }

  /**
   * Show notification
   */
  show(message, duration = 3000) {
    this.notification.textContent = message;
    this.notification.classList.add('visible');

    setTimeout(() => {
      this.hide();
    }, duration);
  }

  /**
   * Hide notification
   */
  hide() {
    this.notification.classList.remove('visible');
  }
}
