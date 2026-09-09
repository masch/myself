/**
 * Web confirmation dialog using the browser's built-in window.confirm.
 * @param message - The confirmation message to display.
 * @param onConfirm - Callback invoked when the user confirms.
 */
export function confirmDelete(message: string, onConfirm: () => void): void {
  if (window.confirm(message)) {
    onConfirm();
  }
}
