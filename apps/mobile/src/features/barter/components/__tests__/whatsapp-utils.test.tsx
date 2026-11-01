import { describe, expect, it } from "bun:test";
import { SEED_PACKAGES, SEED_PRODUCERS } from "../../barter-store";
import {
  buildTradeCoordinationMessage,
  buildWhatsAppTradeUrl,
} from "../../whatsapp-utils";

const [vermut, queso] = SEED_PRODUCERS;

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
      counterpartName: queso.name,
      offeredTitle: SEED_PACKAGES[0].title,
      targetTitle: SEED_PACKAGES[2].title,
    });
    expect(message).toContain(queso.name);
  });

  it("names both packages of the trade", () => {
    const message = buildTradeCoordinationMessage({
      counterpartName: queso.name,
      offeredTitle: SEED_PACKAGES[0].title,
      targetTitle: SEED_PACKAGES[2].title,
    });
    expect(message).toContain(SEED_PACKAGES[0].title);
    expect(message).toContain(SEED_PACKAGES[2].title);
  });
});
