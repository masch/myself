import { describe, expect, it } from "bun:test";
import {
  PRODUCER_IDS,
  SEED_PACKAGES,
  SEED_PRODUCERS,
} from "../../barter-store";
import {
  POC_DEFAULT_PHONE,
  buildTradeCoordinationMessage,
  buildWhatsAppTradeUrl,
} from "../../whatsapp-utils";

// Selected by id: the seed list is the printed catalog, so its order is the
// catalog's order and not this file's assumption.
const counterpart = SEED_PRODUCERS.find(
  (producer) => producer.id === PRODUCER_IDS.QUESO,
);

if (!counterpart) {
  throw new Error("The seeded counterpart this suite greets was not found");
}

describe("WhatsApp deep link: buildWhatsAppTradeUrl", () => {
  it("strips the plus sign and any non-digit characters from the phone", () => {
    const url = buildWhatsAppTradeUrl("+54 9 261 555-1234", "hola");
    expect(url).toContain("wa.me/5492615551234");
  });

  it("URL-encodes the prefilled message", () => {
    const url = buildWhatsAppTradeUrl("+5492615551234", "Hola ¿coordinamos?");
    expect(url).toContain(`text=${encodeURIComponent("Hola ¿coordinamos?")}`);
    expect(url).not.toContain("¿");
  });

  it("exposes a default number the POC can fall back to", () => {
    const url = buildWhatsAppTradeUrl(POC_DEFAULT_PHONE, "coordinemos");

    // wa.me needs country code plus digits only, or the deep link is a dead end.
    expect(url).toMatch(/^https:\/\/wa\.me\/\d{10,15}\?text=/);
  });

  it("builds a complete wa.me URL", () => {
    const url = buildWhatsAppTradeUrl("+5492615551234", "coordinemos");
    expect(url).toBe(
      `https://wa.me/5492615551234?text=${encodeURIComponent("coordinemos")}`,
    );
  });
});

describe("WhatsApp deep link: buildTradeCoordinationMessage", () => {
  it("greets the counterpart producer by name", () => {
    const message = buildTradeCoordinationMessage({
      counterpartName: counterpart.name,
      offeredTitle: SEED_PACKAGES[0].title,
      targetTitle: SEED_PACKAGES[2].title,
    });
    expect(message).toContain(counterpart.name);
  });

  it("names both packages of the trade", () => {
    const message = buildTradeCoordinationMessage({
      counterpartName: counterpart.name,
      offeredTitle: SEED_PACKAGES[0].title,
      targetTitle: SEED_PACKAGES[2].title,
    });
    expect(message).toContain(SEED_PACKAGES[0].title);
    expect(message).toContain(SEED_PACKAGES[2].title);
  });
});
