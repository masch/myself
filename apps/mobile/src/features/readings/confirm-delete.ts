import { Alert } from "react-native";

/**
 * Native confirmation dialog using React Native Alert.
 * @param message - The confirmation message to display.
 * @param onConfirm - Callback invoked when the user confirms.
 */
export function confirmDelete(message: string, onConfirm: () => void): void {
  Alert.alert("Delete Reading", message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}
