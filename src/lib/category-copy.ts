import type { Lang } from "./i18n";

const introductions: Record<string, Record<Lang, string>> = {
  news: {
    en: "Crypto news with dates, identifiable sources and context: follow digital assets, financial policy and technology, with facts separated from unconfirmed reports.",
    es: "Noticias crypto con fechas, fuentes identificables y contexto sobre activos digitales, política financiera y tecnología. Hechos y reportes pendientes se distinguen claramente.",
  },
  bitcoin: {
    en: "Bitcoin reporting on its network, custody, institutional products and market developments. Read the sources, dates and limits behind each story.",
    es: "Información sobre Bitcoin: su red, custodia, productos institucionales y novedades del mercado. Consulta las fuentes, fechas y límites de cada noticia.",
  },
  ethereum: {
    en: "Ethereum news covering the network, smart contracts, staking and its wider ecosystem. Source-linked reporting explains developments and their practical implications.",
    es: "Noticias de Ethereum sobre su red, contratos inteligentes, staking y ecosistema. Información con fuentes para entender los cambios y sus implicaciones prácticas.",
  },
  altcoins: {
    en: "News about crypto projects, tokens and exchanges beyond Bitcoin. Examine the technology, reported developments and risks without treating price forecasts as facts.",
    es: "Noticias sobre proyectos, tokens y exchanges más allá de Bitcoin. Tecnología, novedades reportadas y riesgos, sin presentar previsiones de precios como hechos.",
  },
  defi: {
    en: "DeFi, stablecoins and digital-finance reporting: understand protocols, services and regulatory developments through attributed facts and clearly stated uncertainties.",
    es: "DeFi, stablecoins y finanzas digitales: información sobre protocolos, servicios y regulación, con hechos atribuidos y límites de confirmación claros.",
  },
  markets: {
    en: "Bitcoin, Ethereum and Solana quotes with provider timestamps, plus market reports that distinguish observed moves, source-backed explanations and unproven causes.",
    es: "Cotizaciones de Bitcoin, Ethereum y Solana con hora del proveedor e informes que distinguen movimientos observados, explicaciones con fuentes y causas no demostradas.",
  },
};

export function categoryIntro(category: string, lang: Lang) {
  return (introductions[category] || introductions.news)[lang];
}
