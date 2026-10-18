import type { ResponseType } from "@myself/shared";

/** Spanish label used when a response type has no dedicated copy. */
const DEFAULT_RESPONSE_TYPE_LABEL = "Texto libre";

const RESPONSE_TYPE_LABELS: Record<string, string> = {
  text: DEFAULT_RESPONSE_TYPE_LABEL,
  scale_1_10: "Escala 1-10",
  item_list: "Lista de momentos",
};

/**
 * Single source of the Spanish response-type labels shown on a program step, so
 * the preview sheet and the prompt card can never drift apart.
 */
export function getResponseTypeLabel(type: ResponseType): string {
  return RESPONSE_TYPE_LABELS[type] ?? DEFAULT_RESPONSE_TYPE_LABEL;
}
