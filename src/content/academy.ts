import type { Article } from "./articles";
import type { Lang } from "../lib/i18n";

export const academyCategories = [
  {
    id: "bitcoin",
    en: "Bitcoin for beginners",
    es: "Bitcoin para principiantes",
    introEn:
      "Understand keys, transactions and the Bitcoin network before making decisions.",
    introEs:
      "Comprende las claves, las transacciones y la red Bitcoin antes de tomar decisiones.",
  },
  {
    id: "ethereum",
    en: "Ethereum & smart contracts",
    es: "Ethereum y contratos inteligentes",
    introEn:
      "Learn how gas, applications and Ethereum scaling work, including their limitations.",
    introEs:
      "Aprende cómo funcionan el gas, las aplicaciones y el escalado de Ethereum, con sus limitaciones.",
  },
  {
    id: "security",
    en: "Security & wallets",
    es: "Seguridad y billeteras",
    introEn:
      "Practical explanations of self-custody, backups, phishing and safer wallet habits.",
    introEs:
      "Explicaciones prácticas de autocustodia, copias de seguridad, phishing y hábitos de uso de billeteras.",
  },
  {
    id: "stablecoins",
    en: "Stablecoins",
    es: "Stablecoins",
    introEn:
      "Explore pegs, reserves and redemption, without confusing stability targets with guarantees.",
    introEs:
      "Explora paridad, reservas y reembolso sin confundir un objetivo de estabilidad con una garantía.",
  },
  {
    id: "defi",
    en: "DeFi",
    es: "DeFi",
    introEn:
      "Understand decentralized lending, liquidity and the risks behind onchain applications.",
    introEs:
      "Comprende los préstamos descentralizados, la liquidez y los riesgos de las aplicaciones onchain.",
  },
  {
    id: "technology",
    en: "Blockchain & technology",
    es: "Blockchain y tecnología",
    introEn:
      "Clear guides to the technical building blocks, from consensus to Layer 2 networks.",
    introEs:
      "Guías claras de los componentes técnicos, desde el consenso hasta las redes Layer 2.",
  },
  {
    id: "exchanges",
    en: "Exchanges & platforms",
    es: "Exchanges y plataformas",
    introEn:
      "Compare custody models, withdrawal processes and the limits of platform disclosures.",
    introEs:
      "Compara modelos de custodia, procesos de retiro y los límites de la información de las plataformas.",
  },
  {
    id: "regulation",
    en: "Regulation & taxes",
    es: "Regulación e impuestos",
    introEn:
      "Jurisdiction-specific information with an explicit reference date. Rules are not universal.",
    introEs:
      "Información por jurisdicción con fecha de referencia explícita. Las normas no son universales.",
  },
] as const;
export type AcademyCategory = (typeof academyCategories)[number]["id"];
export const academyConnections: Record<string, string[]> = {
  "what-is-bitcoin-how-it-works": [
    "what-is-ethereum-bitcoin-differences",
    "cold-wallet-how-it-works-risks",
    "protect-crypto-from-scams",
  ],
  "what-is-ethereum-bitcoin-differences": [
    "what-is-bitcoin-how-it-works",
    "ethereum-gas-fees-explained",
    "crypto-staking-how-it-works-risks",
  ],
  "cold-wallet-how-it-works-risks": [
    "protect-crypto-from-scams",
    "centralized-decentralized-exchanges",
    "what-is-bitcoin-how-it-works",
  ],
  "protect-crypto-from-scams": [
    "cold-wallet-how-it-works-risks",
    "centralized-decentralized-exchanges",
    "defi-beginner-risks",
  ],
  "usdt-usdc-differences": [
    "defi-beginner-risks",
    "centralized-decentralized-exchanges",
    "protect-crypto-from-scams",
  ],
  "defi-beginner-risks": [
    "usdt-usdc-differences",
    "centralized-decentralized-exchanges",
    "ethereum-gas-fees-explained",
  ],
  "ethereum-gas-fees-explained": [
    "what-is-ethereum-bitcoin-differences",
    "layer-2-networks-risks",
    "defi-beginner-risks",
  ],
  "crypto-staking-how-it-works-risks": [
    "what-is-ethereum-bitcoin-differences",
    "cold-wallet-how-it-works-risks",
    "defi-beginner-risks",
  ],
  "layer-2-networks-risks": [
    "ethereum-gas-fees-explained",
    "what-is-ethereum-bitcoin-differences",
    "cold-wallet-how-it-works-risks",
  ],
  "centralized-decentralized-exchanges": [
    "cold-wallet-how-it-works-risks",
    "usdt-usdc-differences",
    "defi-beginner-risks",
  ],
};
export interface Guide extends Article {
  kind: "guide";
  correctionNote?: string;
  academyCategory: AcademyCategory;
  cluster: string;
  level: "beginner" | "intermediate";
  jurisdiction?: string;
  asOf?: string;
}
export const academyName = (lang: Lang) =>
  lang === "en" ? "Crypto Academy" : "Academia Crypto";
export const academyUrl = (lang: Lang) =>
  lang === "en" ? "/en/academy/" : "/es/academia/";
export const guideUrl = (a: Pick<Guide, "lang" | "slug">) =>
  academyUrl(a.lang) + (a.lang === "en" ? "guides/" : "guias/") + a.slug + "/";
export const academyCategoryUrl = (lang: Lang, id: string) =>
  academyUrl(lang) + (lang === "en" ? "category/" : "categoria/") + id + "/";
