import type { Producer, ProductionType } from "@myself/shared";
import { POC_DEFAULT_PHONE } from "./whatsapp-utils";

/**
 * The producer catalog printed by the Red de Familias y Productores for
 * Primavera 2026 ("Primavera 26.pdf", sha256
 * c225594b8b367938fab2a25d5074651f050e4be58acaca6d6ab3e7f9c5843223).
 *
 * Every printed producer is introduced by a table header shaped
 * `# <number> - <PRODUCER> <locality and claim> x kilo/unid.`; the extraction
 * kept the number, the producer name, the locality and the production claim,
 * and dropped the product table itself (packages are a separate concern).
 *
 * Two things the source does not carry, and how they are resolved here:
 *
 * - **Coordinates.** The catalog prints no address beyond a locality, region or
 *   province, so each entry borrows the centroid of the place it names: precise
 *   at locality level, coarse at regional or provincial level. The distance
 *   filter is honest about that granularity, never about a street address. The
 *   two producers the app already seeded keep the coordinates they already had
 *   (`naturaleza-viva`, `sabado`) instead of being degraded to a centroid.
 * - **Contact numbers.** The catalog prints exactly one (`351-6480335`, #123),
 *   so every other entry takes `POC_DEFAULT_PHONE` — one documented placeholder
 *   rather than 157 invented numbers living inside the data.
 *
 * Producer ids are a persisted contract: they are what stored packages, stored
 * matches and `?producerId=` links carry, so they are written out here instead
 * of being derived, and `sabado` / `naturaleza-viva` keep the values the app has
 * been handing out since before this catalog existed.
 */

interface CatalogPlace {
  /** Rendered as the producer address when the entry does not override it. */
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Centroid of every locality, region or province the catalog names.
 *
 * A producer points at one of these instead of repeating numbers, so a place is
 * corrected once and every producer that names it follows.
 */
const PLACES = {
  "santa-fe": { address: "Santa Fe", latitude: -31.6333, longitude: -60.7 },
  "arroyo-leyes": {
    address: "Arroyo Leyes, Santa Fe",
    latitude: -31.55,
    longitude: -60.55,
  },
  "buenos-aires": {
    address: "Buenos Aires",
    latitude: -34.61,
    longitude: -58.42,
  },
  chascomus: {
    address: "Chascomús, Buenos Aires",
    latitude: -35.576,
    longitude: -58.008,
  },
  tandil: {
    address: "Tandil, Buenos Aires",
    latitude: -37.3217,
    longitude: -59.1332,
  },
  "entre-rios": { address: "Entre Ríos", latitude: -31.74, longitude: -60.53 },
  tucuman: { address: "Tucumán", latitude: -26.83, longitude: -65.22 },
  jujuy: { address: "Jujuy", latitude: -24.19, longitude: -65.3 },
  tilcara: { address: "Tilcara, Jujuy", latitude: -23.577, longitude: -65.393 },
  catamarca: { address: "Catamarca", latitude: -28.47, longitude: -65.78 },
  ancasti: {
    address: "Ancasti, Catamarca",
    latitude: -28.83,
    longitude: -65.5,
  },
  anquincila: {
    address: "Anquincila, Catamarca",
    latitude: -28.75,
    longitude: -65.55,
  },
  "la-rioja": { address: "La Rioja", latitude: -29.41, longitude: -66.86 },
  mendoza: { address: "Mendoza", latitude: -32.89, longitude: -68.85 },
  "valle-de-uco": {
    address: "Valle de Uco, Mendoza",
    latitude: -33.75,
    longitude: -69.1,
  },
  misiones: { address: "Misiones", latitude: -27.37, longitude: -55.95 },
  "rio-negro": { address: "Río Negro", latitude: -40.0, longitude: -67.0 },
  doradillo: {
    address: "Doradillo, Río Negro",
    latitude: -40.95,
    longitude: -64.95,
  },
  chaco: { address: "Chaco", latitude: -27.45, longitude: -58.99 },
  formosa: { address: "Formosa", latitude: -26.18, longitude: -58.18 },
  "santiago-del-estero": {
    address: "Santiago del Estero",
    latitude: -27.79,
    longitude: -64.26,
  },
  patagonia: { address: "Patagonia", latitude: -44.0, longitude: -68.0 },
  "puerto-madryn": {
    address: "Puerto Madryn, Chubut",
    latitude: -42.77,
    longitude: -65.04,
  },
  cordoba: { address: "Córdoba", latitude: -31.42, longitude: -64.19 },
  "sierras-chicas": {
    address: "Sierras Chicas, Córdoba",
    latitude: -31.15,
    longitude: -64.33,
  },
  "agua-de-oro": {
    address: "Agua de Oro, Córdoba",
    latitude: -31.1,
    longitude: -64.3,
  },
  mendiolaza: {
    address: "Mendiolaza, Córdoba",
    latitude: -31.27,
    longitude: -64.36,
  },
  "rio-ceballos": {
    address: "Río Ceballos, Córdoba",
    latitude: -31.17,
    longitude: -64.32,
  },
  saldan: { address: "Saldán, Córdoba", latitude: -31.32, longitude: -64.31 },
  "rio-cuarto": {
    address: "Río Cuarto, Córdoba",
    latitude: -33.13,
    longitude: -64.35,
  },
  punilla: { address: "Punilla, Córdoba", latitude: -31.1, longitude: -64.5 },
  "capilla-del-monte": {
    address: "Capilla del Monte, Córdoba",
    latitude: -30.86,
    longitude: -64.52,
  },
  "villa-del-soto": {
    address: "Villa del Soto, Punilla, Córdoba",
    latitude: -30.83,
    longitude: -64.42,
  },
  traslasierra: {
    address: "Traslasierra, Córdoba",
    latitude: -31.85,
    longitude: -65.05,
  },
  "los-hornillos": {
    address: "Los Hornillos, Córdoba",
    latitude: -31.88,
    longitude: -64.98,
  },
  "san-marcos-sierras": {
    address: "San Marcos Sierras, Córdoba",
    latitude: -30.78,
    longitude: -64.65,
  },
  calamuchita: {
    address: "Calamuchita, Córdoba",
    latitude: -32.0,
    longitude: -64.6,
  },
  "villa-general-belgrano": {
    address: "Villa General Belgrano, Córdoba",
    latitude: -31.97,
    longitude: -64.55,
  },
  paravachasca: {
    address: "Paravachasca, Córdoba",
    latitude: -31.7,
    longitude: -64.4,
  },
  anisacate: {
    address: "Anisacate, Córdoba",
    latitude: -31.78,
    longitude: -64.4,
  },
  "noroeste-cordobes": {
    address: "Noroeste cordobés, Córdoba",
    latitude: -30.73,
    longitude: -64.8,
  },
  "santiago-temple": {
    address: "Santiago Temple, Córdoba",
    latitude: -31.38,
    longitude: -63.55,
  },
  /**
   * Producers whose printed header names no recognizable place. The catalog is
   * silent, so the coordinate is the documented placeholder for "the catalog
   * does not say" instead of a guessed province, and the address says exactly
   * that.
   */
  "sin-localidad": {
    address: "Localidad no informada, Argentina",
    latitude: -38.42,
    longitude: -63.63,
  },
} as const satisfies Record<string, CatalogPlace>;

export type CatalogPlaceKey = keyof typeof PLACES;

/** One row of the printed catalog, before the place centroid is applied. */
export interface CatalogEntry {
  /** Producer number printed in the catalog; unique and 1-based. */
  number: number;
  id: string;
  name: string;
  place: CatalogPlaceKey;
  productionType: ProductionType;
  /** Set only where the entry must not inherit the place's address. */
  address?: string;
  /** Set only for a producer whose location the app already carried. */
  latitude?: number;
  longitude?: number;
  /** Set only where the catalog prints a contact number. */
  phone?: string;
}

function toProducer(entry: CatalogEntry): Producer {
  const place = PLACES[entry.place];

  return {
    id: entry.id,
    name: entry.name,
    productionType: entry.productionType,
    address: entry.address ?? place.address,
    latitude: entry.latitude ?? place.latitude,
    longitude: entry.longitude ?? place.longitude,
    phone: entry.phone ?? POC_DEFAULT_PHONE,
  };
}

/**
 * The 158 producers printed in the Primavera 2026 catalog, in printed order.
 *
 * Production types follow the claim each header prints, so the catalog does not
 * flatten a biodynamic or vegan producer into a general one: `Agroeco` →
 * `AGROECOLOGICAL`, `Orgánico` → `ORGANIC`, `Agroeco/Orgánico` → `ORGANIC`,
 * `Biodinámico` → `BIODYNAMIC`, `Vegano` → `VEGAN`. The 103 headers that print
 * no claim at all are `AGROECOLOGICAL`: the catalog is titled "Orgánica si o
 * sí" and none of them declares conventional.
 *
 * `naturaleza-viva` (#1) and `sabado` (#102) keep their id, name, address,
 * coordinates, phone and — for #1 — the `ORGANIC` claim they already carried,
 * because stored packages are typed against them.
 */
export const PRIMAVERA_2026_CATALOG: readonly CatalogEntry[] = [
  {
    number: 1,
    id: "naturaleza-viva",
    name: "Naturaleza Viva",
    place: "santa-fe",
    productionType: "ORGANIC",
    address: "Guadalupe Norte, Santa Fe",
    latitude: -28.9876,
    longitude: -59.6543,
    phone: "+5493482555678",
  },
  {
    number: 2,
    id: "chacra-monteflore",
    name: "Chacra Monteflore",
    place: "santa-fe",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 3,
    id: "granja-nova",
    name: "Granja Nova",
    place: "buenos-aires",
    productionType: "BIODYNAMIC",
  },
  {
    number: 4,
    id: "campo-claro",
    name: "Campo Claro",
    place: "buenos-aires",
    productionType: "ORGANIC",
  },
  {
    number: 5,
    id: "genmai-levenson",
    name: "Genmai Levenson",
    place: "buenos-aires",
    productionType: "ORGANIC",
  },
  {
    number: 6,
    id: "sasaki",
    name: "Sasaki",
    place: "chascomus",
    productionType: "ORGANIC",
  },
  {
    number: 7,
    id: "dona-angeles-queca",
    name: "Doña Ángeles - Queca",
    place: "tucuman",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 8,
    id: "dona-mecha",
    name: "Doña Mecha",
    place: "anisacate",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 9,
    id: "caupolican",
    name: "Caupolicán",
    place: "entre-rios",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 10,
    id: "coop-cauqueva",
    name: "Coop. Cauqueva",
    place: "jujuy",
    productionType: "VEGAN",
  },
  {
    number: 11,
    id: "surco-diaguita",
    name: "Surco Diaguita",
    place: "catamarca",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 12,
    id: "salve-la-tierra",
    name: "Salve la Tierra",
    place: "buenos-aires",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 13,
    id: "peregrino-del-valle",
    name: "Peregrino del Valle",
    place: "mendoza",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 14,
    id: "germen-de-vida",
    name: "Germen de Vida",
    place: "mendoza",
    productionType: "ORGANIC",
  },
  {
    number: 15,
    id: "red-nuestra-si-o-si",
    name: "Red Nuestra Sí o Sí",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 16,
    id: "awa",
    name: "Awa",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 17,
    id: "que-pasa-coco",
    name: "¿Qué Pasa Coco?",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 18,
    id: "el-castillo",
    name: "El Castillo",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
    address: "Nay",
  },
  {
    number: 19,
    id: "calma-tierra",
    name: "Calma Tierra",
    place: "tandil",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 20,
    id: "vida-ubuntu",
    name: "Vida Ubuntu",
    place: "mendoza",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 21,
    id: "las-eles",
    name: "Las Eles",
    place: "santa-fe",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 22,
    id: "gordanita",
    name: "Gordanita",
    place: "santa-fe",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 23,
    id: "finka-la-carolina",
    name: "Finka La Carolina",
    place: "mendoza",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 24,
    id: "sal-de-aqui",
    name: "Sal de Aquí",
    place: "patagonia",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 25,
    id: "mares-del-sur",
    name: "Mares del Sur",
    place: "doradillo",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 26,
    id: "casita-magica",
    name: "Casita Mágica",
    place: "rio-negro",
    productionType: "BIODYNAMIC",
  },
  {
    number: 27,
    id: "la-nica",
    name: "La Ñica",
    place: "la-rioja",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 28,
    id: "los-nonos",
    name: "Los Nonos",
    place: "rio-negro",
    productionType: "AGROECOLOGICAL",
    address: "Paraje La Parra, Río Negro",
  },
  {
    number: 29,
    id: "finca-los-jorges",
    name: "Finca Los Jorges y Pulpo Rojo",
    place: "mendoza",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 30,
    id: "vita-nova",
    name: "Vita Nova",
    place: "catamarca",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 31,
    id: "aurea",
    name: "Aurea",
    place: "punilla",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 32,
    id: "ghee-arroyo-leyes",
    name: "Ghee",
    place: "arroyo-leyes",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 33,
    id: "esencias-de-la-tierra",
    name: "Esencias de la Tierra",
    place: "mendoza",
    productionType: "ORGANIC",
  },
  {
    number: 34,
    id: "familia-cecchin",
    name: "Familia Cecchin",
    place: "mendoza",
    productionType: "ORGANIC",
  },
  {
    number: 35,
    id: "dorada-del-sol",
    name: "Dorada del Sol",
    place: "rio-negro",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 36,
    id: "cholita-ana",
    name: "Cholita Ana",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
    address: "Córdoba, Catamarca y Mendoza",
  },
  {
    number: 37,
    id: "coop-cuchiyaco",
    name: "Coop. Cuchiyaco",
    place: "la-rioja",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 38,
    id: "allpa",
    name: "Allpa",
    place: "anquincila",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 39,
    id: "crecen-desde-el-pie",
    name: "Crecen Desde el Pie",
    place: "mendoza",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 40,
    id: "finca-feliza",
    name: "Finca Feliza",
    place: "valle-de-uco",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 41,
    id: "el-renuevo",
    name: "El Renuevo",
    place: "la-rioja",
    productionType: "ORGANIC",
  },
  {
    number: 42,
    id: "red-canera",
    name: "Red Cañera",
    place: "misiones",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 43,
    id: "la-abundancia",
    name: "La Abundancia / Arapegua",
    place: "misiones",
    productionType: "BIODYNAMIC",
  },
  {
    number: 44,
    id: "coop-creo-chacra-ivu",
    name: "Coop. Creo Chacra Ivu",
    place: "misiones",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 45,
    id: "atigua",
    name: "Atigua",
    place: "misiones",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 46,
    id: "yerba-del-arbol",
    name: "Yerba del Árbol",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 47,
    id: "jactancia",
    name: "Jactancia",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 48,
    id: "leales-leach",
    name: "Leales Leach",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 49,
    id: "nativa",
    name: "Nativa",
    place: "misiones",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 50,
    id: "viva-el-monte",
    name: "Viva el Monte",
    place: "traslasierra",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 51,
    id: "escuela-yapeyu",
    name: "Escuela Yapeyú",
    place: "traslasierra",
    productionType: "AGROECOLOGICAL",
    address: "Paraje San Isidro, Traslasierra, Córdoba",
  },
  {
    number: 52,
    id: "amanecer-de-monte",
    name: "Amanecer de Monte",
    place: "villa-del-soto",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 53,
    id: "sacha-pastas",
    name: "Sacha Pastas",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 54,
    id: "monte-adentro",
    name: "Monte Adentro",
    place: "noroeste-cordobes",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 55,
    id: "a-cuatro-manos",
    name: "A Cuatro Manos",
    place: "san-marcos-sierras",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 56,
    id: "enronda",
    name: "Enronda",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 57,
    id: "corali",
    name: "Corali",
    place: "agua-de-oro",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 58,
    id: "triskel",
    name: "Triskel",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 59,
    id: "quillen",
    name: "Quillén",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 60,
    id: "la-majadita",
    name: "La Majadita",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
    address: "Josefa, Sierras Chicas, Córdoba",
  },
  {
    number: 61,
    id: "chara",
    name: "Chara",
    place: "traslasierra",
    productionType: "BIODYNAMIC",
  },
  {
    number: 62,
    id: "awicha",
    name: "Awicha",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
    address: "Ambulante, Córdoba",
  },
  {
    number: 63,
    id: "maray",
    name: "Maray",
    place: "calamuchita",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 64,
    id: "aliwen-ahumados",
    name: "Aliwen Ahumados",
    place: "traslasierra",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 65,
    id: "naturaleza-pristina",
    name: "Naturaleza Pristina",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 66,
    id: "los-hornillos",
    name: "Los Hornillos",
    place: "los-hornillos",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 67,
    id: "esenia",
    name: "Esenia",
    place: "villa-general-belgrano",
    productionType: "VEGAN",
  },
  {
    number: 68,
    id: "guidujores",
    name: "Guidujores",
    place: "santiago-temple",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 69,
    id: "guidujores-buenas-migas",
    name: "Guidujores Buenas Migas",
    place: "santiago-temple",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 70,
    id: "mama-baker",
    name: "Mamá Baker",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 71,
    id: "macar",
    name: "Macar",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
    address: "María Elena, Córdoba",
  },
  {
    number: 72,
    id: "bonito",
    name: "Bonito",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
    address: "Con amor sin trigo",
  },
  {
    number: 73,
    id: "la-consuelo",
    name: "La Consuelo",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
    address: "Territorio Tero",
  },
  {
    number: 74,
    id: "bliss-cacao",
    name: "Bliss Cacao",
    place: "san-marcos-sierras",
    productionType: "ORGANIC",
  },
  {
    number: 75,
    id: "yatei",
    name: "Yatei",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 76,
    id: "manitas",
    name: "Manitas",
    place: "agua-de-oro",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 77,
    id: "florece-corazon",
    name: "Florece Corazón",
    place: "anisacate",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 78,
    id: "la-vecina-tierra",
    name: "La Vecina Tierra",
    place: "tilcara",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 79,
    id: "espora-madre",
    name: "Espora Madre",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 80,
    id: "cobijo",
    name: "Cobijo",
    place: "agua-de-oro",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 81,
    id: "quenchi-quenchi",
    name: "Quenchi Quenchi",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 82,
    id: "primitiva",
    name: "Primitiva",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
    address: "NOA y Córdoba",
  },
  {
    number: 83,
    id: "gourmex",
    name: "Gourmex",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 84,
    id: "saliyuyo",
    name: "Saliyuyo",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 85,
    id: "el-arbol",
    name: "El Árbol",
    place: "san-marcos-sierras",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 86,
    id: "monte-nativo",
    name: "Monte Nativo - Escuela Luces del Valle",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 87,
    id: "desde-el-jardin",
    name: "Desde el Jardín",
    place: "ancasti",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 88,
    id: "don-valle",
    name: "Don Valle",
    place: "anquincila",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 89,
    id: "la-algarrobita",
    name: "La Algarrobita",
    place: "la-rioja",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 90,
    id: "latir-de-la-tierra",
    name: "Latir de la Tierra",
    place: "punilla",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 91,
    id: "chad",
    name: "Chad",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 92,
    id: "tenedor-verde",
    name: "Tenedor Verde",
    place: "mendiolaza",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 93,
    id: "enriqueta",
    name: "Enriqueta",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 94,
    id: "delafer",
    name: "Delafer",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 95,
    id: "eluney",
    name: "Eluney",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 96,
    id: "conservas-agroecologicas",
    name: "Conservas Agroecológicas",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 97,
    id: "las-tuscas",
    name: "Las Tuscas",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 98,
    id: "hijos-de-la-tierra",
    name: "Hijos de la Tierra",
    place: "agua-de-oro",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 99,
    id: "fernet-corral",
    name: "Fernet Corral",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 100,
    id: "fernetico",
    name: "Fernético",
    place: "traslasierra",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 101,
    id: "licoreria-el-colo",
    name: "Licorería El Colo",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 102,
    id: "sabado",
    name: "Vermut Sabado",
    place: "calamuchita",
    productionType: "AGROECOLOGICAL",
    address: "Chacra Alimento, Umepay",
    latitude: -32.9982,
    longitude: -68.8789,
    phone: "+5492615551234",
  },
  {
    number: 103,
    id: "huella-rebelde",
    name: "Huella Rebelde",
    place: "traslasierra",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 104,
    id: "mediterranea",
    name: "Mediterránea Destilería",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 105,
    id: "loco-vikingo",
    name: "Loco Vikingo",
    place: "saldan",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 106,
    id: "alimentando-el-alma",
    name: "Alimentando el Alma",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 107,
    id: "quinto-elemento",
    name: "Quinto Elemento",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 108,
    id: "rosanna",
    name: "Rosanna",
    place: "traslasierra",
    productionType: "VEGAN",
  },
  {
    number: 109,
    id: "vieja-kush",
    name: "Vieja Kush",
    place: "capilla-del-monte",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 110,
    id: "taku",
    name: "Taku",
    place: "capilla-del-monte",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 111,
    id: "cafe-las-flores",
    name: "Café Las Flores",
    place: "sin-localidad",
    productionType: "ORGANIC",
  },
  {
    number: 112,
    id: "sayri",
    name: "Sayri",
    place: "misiones",
    productionType: "AGROECOLOGICAL",
    address: "Córdoba y Misiones",
  },
  {
    number: 113,
    id: "cerro-del-condor",
    name: "Cerro del Cóndor",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 114,
    id: "la-yuyeria",
    name: "La Yuyería",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 115,
    id: "montes",
    name: "Montés",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 116,
    id: "el-milagro",
    name: "El Milagro",
    place: "traslasierra",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 117,
    id: "la-casa-de-shakin-ailin",
    name: "La Casa de Shakin Ailín",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 118,
    id: "fundacion-uno-somos",
    name: "Fundación Uno Somos",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 119,
    id: "pachacutec",
    name: "Pachacútec",
    place: "paravachasca",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 120,
    id: "la-abajena",
    name: "La Abajeña",
    place: "jujuy",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 121,
    id: "fuera-la-vaina",
    name: "Fuera la Vaina",
    place: "paravachasca",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 122,
    id: "in-situ-fuera-la-vaina",
    name: "In Situ / Fuera la Vaina",
    place: "paravachasca",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 123,
    id: "reciclando-utopias",
    name: "Reciclando Utopías",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
    phone: "+543516480335",
  },
  {
    number: 124,
    id: "terrasanarte",
    name: "Terrasanarte",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 125,
    id: "gaia-bio-insumos",
    name: "Gaia Bio-insumos",
    place: "agua-de-oro",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 126,
    id: "semilla-salvaje",
    name: "Semilla Salvaje",
    place: "rio-ceballos",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 127,
    id: "alquimia-yuyera",
    name: "Alquimia Yuyera",
    place: "villa-del-soto",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 128,
    id: "savia-del-aire",
    name: "Savia del Aire",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
    address: "Sierras de Córdoba",
  },
  {
    number: 129,
    id: "llama-violeta",
    name: "Llama Violeta",
    place: "anisacate",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 130,
    id: "flor-de-laburo",
    name: "Flor de Laburo / Salva",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 131,
    id: "casa-de-piedra",
    name: "Casa de Piedra",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 132,
    id: "oceana",
    name: "Oceana Biocosmética",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 133,
    id: "heiwa",
    name: "Heiwa Botánico",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 134,
    id: "yukti",
    name: "Yukti",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 135,
    id: "sagradas-crema",
    name: "Sagradas Crema",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 136,
    id: "zapam-zucum",
    name: "Zapam Zucum",
    place: "anisacate",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 137,
    id: "taypi",
    name: "Taypi",
    place: "san-marcos-sierras",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 138,
    id: "pranah-de-campo-divino",
    name: "Pranah de Campo Divino",
    place: "calamuchita",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 139,
    id: "colibri",
    name: "Colibrí Esenciales",
    place: "traslasierra",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 140,
    id: "adama",
    name: "Adama",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 141,
    id: "quetzal",
    name: "Quetzal",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 142,
    id: "passiflora",
    name: "Passiflora",
    place: "sierras-chicas",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 143,
    id: "amatreya",
    name: "Amatreya",
    place: "paravachasca",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 144,
    id: "salina",
    name: "Salina",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 145,
    id: "mario-luis",
    name: "Mario Luis",
    place: "rio-ceballos",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 146,
    id: "zuerst",
    name: "Zuerst",
    place: "sin-localidad",
    productionType: "VEGAN",
  },
  {
    number: 147,
    id: "conmark",
    name: "Conmark",
    place: "cordoba",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 148,
    id: "coop-inimbo",
    name: "Coop. Inimbo Red Textil",
    place: "chaco",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 149,
    id: "wichis",
    name: "Wichis Artesanías",
    place: "santiago-del-estero",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 150,
    id: "ecoplumas",
    name: "Ecoplumas",
    place: "rio-cuarto",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 151,
    id: "parvati",
    name: "Parvati Natural",
    place: "puerto-madryn",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 152,
    id: "rizoma",
    name: "Rizoma",
    place: "traslasierra",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 153,
    id: "cesteria-pilaga",
    name: "Cestería Pilagá",
    place: "formosa",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 154,
    id: "cesteria-de-mimbre-jose",
    name: "Cestería de Mimbre José",
    place: "agua-de-oro",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 155,
    id: "el-encuadernista",
    name: "El Encuadernista",
    place: "punilla",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 156,
    id: "los-juguetes-de-la-abuela",
    name: "Los Juguetes de la Abuela",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 157,
    id: "andina-producciones",
    name: "Andina Producciones",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
  {
    number: 158,
    id: "grafica-salvaje",
    name: "Gráfica Salvaje",
    place: "sin-localidad",
    productionType: "AGROECOLOGICAL",
  },
];

/** The catalog resolved against its place centroids, ready to seed the store. */
export const PRIMAVERA_2026_PRODUCERS: Producer[] =
  PRIMAVERA_2026_CATALOG.map(toProducer);
