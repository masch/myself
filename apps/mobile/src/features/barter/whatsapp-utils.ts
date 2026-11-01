/**
 * Pure builders for the barter WhatsApp coordination deep link.
 * The POC deliberately has no in-app chat: logistics happen in WhatsApp
 * via a wa.me URL with a prefilled message.
 */

/**
 * Default number for a producer the printed catalog carries no contact for.
 *
 * This is a POC stand-in, not data: the Primavera 2026 catalog prints exactly
 * one number in its 158 entries, but the coordination link needs one, so this
 * single documented value fills the gap instead of the catalog inventing a
 * different fake number per producer. Replace it with the real contacts as
 * they arrive.
 */
export const POC_DEFAULT_PHONE = "+5491100000000";

/**
 * Build a wa.me deep link with a prefilled message. wa.me requires the
 * phone as digits only (country code included, no "+", spaces or dashes).
 */
export function buildWhatsAppTradeUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export interface TradeCoordinationMessageInput {
  counterpartName: string;
  offeredTitle: string;
  targetTitle: string;
}

/**
 * Prefilled Spanish message naming both sides of the 1:1 PAP exchange so
 * producers can coordinate the physical handoff.
 */
export function buildTradeCoordinationMessage(
  input: TradeCoordinationMessageInput,
): string {
  return (
    `¡Hola ${input.counterpartName}! Coordinemos la entrega de nuestro ` +
    `trueque: "${input.offeredTitle}" ⇄ "${input.targetTitle}". ` +
    `¿Qué día y lugar te viene bien?`
  );
}
