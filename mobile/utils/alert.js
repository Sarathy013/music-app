import { Alert, Platform } from 'react-native';

/**
 * Universal alert/confirm dialog that executes button callbacks on both
 * Web and Native (iOS/Android) environments.
 */
export function showAlert(title, message, buttons = []) {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length <= 1) {
      const text = `${title ? title + '\n\n' : ''}${message || ''}`;
      window.alert(text);
      if (buttons && buttons[0] && typeof buttons[0].onPress === 'function') {
        buttons[0].onPress();
      }
      return;
    }

    // Confirmation dialog (2+ buttons)
    const destructiveOrOkBtn = buttons.find((b) => b.style === 'destructive' || b.text?.toLowerCase() === 'delete' || b.text?.toLowerCase() === 'logout' || b.text?.toLowerCase() === 'remove' || b.text?.toLowerCase() === 'ok');
    const cancelBtn = buttons.find((b) => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel');

    const text = `${title ? title + ' — ' : ''}${message || ''}`;
    const confirmed = window.confirm(text);

    if (confirmed) {
      if (destructiveOrOkBtn && typeof destructiveOrOkBtn.onPress === 'function') {
        destructiveOrOkBtn.onPress();
      } else if (buttons[1] && typeof buttons[1].onPress === 'function') {
        buttons[1].onPress();
      }
    } else {
      if (cancelBtn && typeof cancelBtn.onPress === 'function') {
        cancelBtn.onPress();
      }
    }
    return;
  }

  // Native
  Alert.alert(title, message, buttons);
}
