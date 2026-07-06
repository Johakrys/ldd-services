import { Alert, Platform } from 'react-native';

/**
 * Confirmación multiplataforma. En web usa window.confirm (Alert de
 * react-native-web no dispara los botones); en nativo usa Alert.alert.
 * Devuelve true si el usuario confirma.
 */
export function confirm(
  title: string,
  message: string,
  confirmLabel: string,
  cancelLabel: string,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.confirm) return Promise.resolve(false);
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, onPress: () => resolve(true) },
    ]);
  });
}
