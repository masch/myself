import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type IoniconsName = ComponentProps<typeof Ionicons>["name"];

/**
 * Maps Apple SF Symbols to canonical cross-platform vector icons from @expo/vector-icons (Ionicons).
 * Ensures native vector rendering across iOS, Android, and Web with exact color tokens.
 */
export const SF_VECTOR_MAP: Record<string, IoniconsName> = {
  // Actions & Editing
  "sf:trash": "trash-outline",
  "sf:trash.fill": "trash",
  "sf:pencil": "pencil",
  "sf:plus": "add",
  "sf:plus.circle": "add-circle-outline",
  "sf:plus.circle.fill": "add-circle",
  "sf:checkmark": "checkmark",
  "sf:checkmark.circle": "checkmark-circle-outline",
  "sf:checkmark.circle.fill": "checkmark-circle",
  "sf:checkmark.seal.fill": "checkmark-done-circle",
  "sf:arrow.uturn.backward": "arrow-undo",
  "sf:xmark": "close",

  // Stars & Favorites
  "sf:star": "star-outline",
  "sf:star.fill": "star",

  // Alerts & Notifications
  "sf:exclamationmark.triangle.fill": "warning",
  "sf:bell.fill": "notifications",
  "sf:bell.badge.fill": "notifications",
  "sf:info.circle": "information-circle-outline",
  "sf:info.circle.fill": "information-circle",

  // People & Profile
  "sf:person.circle.fill": "person-circle",
  "sf:person.fill": "person",
  "sf:person.2.fill": "people",
  "sf:person.badge.plus": "person-add",
  "sf:person.crop.circle.fill": "person-circle",

  // Content & Reading
  "sf:sparkles": "sparkles",
  "sf:book.closed": "book-outline",
  "sf:book.closed.fill": "book",
  "sf:text.quote": "chatbox-ellipses-outline",
  "sf:text.badge.plus": "document-text",
  "sf:note.text": "document-text-outline",

  // Media & Controls
  "sf:moon.fill": "moon",
  "sf:clock.fill": "time",
  "sf:paintbrush.fill": "color-palette",
  "sf:faceid": "scan-outline",
  "sf:globe": "globe-outline",
  "sf:hand.raised.fill": "hand-left",
  "sf:speaker.wave.2.fill": "volume-high",
  "sf:eye.fill": "eye",
  "sf:circle": "ellipse-outline",
  "sf:app.badge.checkmark.fill": "checkmark-circle",
  "sf:magnifyingglass": "search",
  "sf:tag.fill": "pricetag",
  "sf:tray": "file-tray",
  "sf:chevron.left.forwardslash.chevron.right": "code-slash",
};
