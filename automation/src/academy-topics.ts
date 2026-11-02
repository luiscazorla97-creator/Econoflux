import type { AcademyCategory } from "../../src/content/academy";
export interface AcademySource {
  url: string;
  fetchUrl?: string;
  label: string;
}
export interface TopicSpec {
  id: string;
  intent: string;
  category: AcademyCategory;
  cluster: string;
  role: "pillar" | "supporting";
  level: "beginner" | "intermediate";
  en: string;
  es: string;
  slugEn: string;
  slugEs: string;
  scope: string;
  sources: AcademySource[];
  terms: string[];
  jurisdiction?: string;
  asOf?: string;
}
export const docs = {
  safety: {
    url: "https://ethereum.org/en/security/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/security/index.md",
    label: "Ethereum.org — Security and scam prevention",
  },
  wallet: {
    url: "https://bitcoin.org/en/secure-your-wallet",
    label: "Bitcoin.org — Securing your wallet",
  },
  accounts: {
    url: "https://ethereum.org/en/developers/docs/accounts/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/developers/docs/accounts/index.md",
    label: "Ethereum.org — Ethereum accounts",
  },
  gas: {
    url: "https://ethereum.org/en/developers/docs/gas/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/developers/docs/gas/index.md",
    label: "Ethereum.org — Gas and fees",
  },
  eip1559: {
    url: "https://eips.ethereum.org/EIPS/eip-1559",
    label: "Ethereum Improvement Proposal 1559 — Fee market",
  },
  contracts: {
    url: "https://ethereum.org/en/developers/docs/smart-contracts/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/developers/docs/smart-contracts/index.md",
    label: "Ethereum.org — Smart contracts",
  },
  l2: {
    url: "https://ethereum.org/en/layer-2/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/layer-2/index.md",
    label: "Ethereum.org — Layer 2",
  },
  stablecoins: {
    url: "https://ethereum.org/en/stablecoins/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/stablecoins/index.md",
    label: "Ethereum.org — Stablecoins",
  },
  defi: {
    url: "https://ethereum.org/en/defi/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/defi/index.md",
    label: "Ethereum.org — Decentralized finance",
  },
  usdc: {
    url: "https://www.circle.com/transparency",
    label: "Circle — USDC transparency (issuer statements)",
  },
  usdt: {
    url: "https://tether.to/en/transparency/",
    label: "Tether — Transparency (issuer statements)",
  },
  bitcoin: {
    url: "https://bitcoin.org/en/how-it-works",
    label: "Bitcoin.org — How Bitcoin works",
  },
  irs: {
    url: "https://www.irs.gov/filing/digital-assets",
    label: "United States Internal Revenue Service — Digital assets",
  },
} satisfies Record<string, AcademySource>;
type S = keyof typeof docs;
function topic(
  id: string,
  en: string,
  es: string,
  category: AcademyCategory,
  cluster: string,
  role: "pillar" | "supporting",
  scope: string,
  sourceKeys: S[],
  terms: string[],
  slugEs: string,
): TopicSpec {
  return {
    id,
    intent: id,
    category,
    cluster,
    role,
    level: "beginner",
    en,
    es,
    slugEn: id,
    slugEs,
    scope,
    sources: sourceKeys.map((k) => docs[k]),
    terms,
  };
}
export const initialTopics: TopicSpec[] = [
  topic(
    "protect-crypto-from-scams",
    "How to protect your crypto from scams: a beginner’s security guide",
    "Cómo proteger tus criptomonedas de estafas: guía de seguridad para principiantes",
    "security",
    "wallet-security",
    "pillar",
    "Practical scam prevention, phishing, approvals, recovery, responses to suspected compromise. Cold storage and recovery phrases are brief supporting definitions; separate guides cover those in depth. Do not recommend moving funds on a potentially compromised device or advertise recovery services.",
    ["safety", "wallet"],
    ["scam", "fraud", "phishing", "estafa", "fraude", "security incident"],
    "proteger-criptomonedas-estafas",
  ),
  topic(
    "cold-wallet-how-it-works-risks",
    "What is a cold wallet? How it works and the risks to understand",
    "Qué es una wallet fría, cómo funciona y qué riesgos tiene",
    "security",
    "wallet-security",
    "supporting",
    "Offline signing, keys vs coins, cold storage vs hardware vs hot vs custodial wallet, recovery and operational failure. Do not claim any hardware wallet is always offline or immune to bad signatures. No device endorsements or invented real seed phrases.",
    ["wallet", "safety", "accounts"],
    ["wallet", "custody", "billetera", "custodia", "private key"],
    "wallet-fria-como-funciona-riesgos",
  ),
  topic(
    "ethereum-gas-fees-explained",
    "Ethereum gas fees explained: how costs, limits and tips work",
    "Comisiones de gas de Ethereum: cómo funcionan los costes, límites y propinas",
    "ethereum",
    "ethereum-transactions",
    "pillar",
    "Ethereum L1 execution gas, gas used vs gas limit, base fee, priority fee, max fee, failed transactions, L2 and blob fee distinction. Hypothetical calculations clearly labelled and checked; not live price estimates. Note 21000 gas only for an ordinary simple ETH transfer without additional execution, not a universal transaction cost. No predictions or universal cheapest-hour advice.",
    ["gas", "eip1559", "accounts"],
    ["ethereum", "gas fee", "gas fees", "comisiones", "eip-1559", "gwei"],
    "comisiones-gas-ethereum",
  ),
];
export const queuedTopics: TopicSpec[] = [
  topic(
    "recovery-phrase-safe-backup",
    "Recovery phrases: how to keep a usable, private backup",
    "Frase de recuperación: cómo conservar una copia privada y utilizable",
    "security",
    "wallet-security",
    "supporting",
    "Focus on recovery and backups; avoid duplicating the pillar scam checklist. Distinguish passphrase, seed phrase and wallet password. Do not display usable seed phrases or seed-generation instructions.",
    ["safety", "wallet", "accounts"],
    ["seed phrase", "recovery phrase", "frase semilla", "backup"],
    "frase-recuperacion-copia-segura",
  ),
  topic(
    "how-stablecoins-work-risks",
    "How stablecoins work and why pegs can fail",
    "Cómo funcionan las stablecoins y por qué pueden perder la paridad",
    "stablecoins",
    "stablecoins",
    "pillar",
    "Explain mechanisms, redemption eligibility and risk, no current reserve percentages or promises of dollar redemption for all holders.",
    ["stablecoins", "defi"],
    ["stablecoin", "peg", "depeg", "paridad"],
    "como-funcionan-stablecoins-riesgos",
  ),
  topic(
    "smart-contracts-explained",
    "Smart contracts explained: code, permissions and limits",
    "Contratos inteligentes: código, permisos y limitaciones",
    "ethereum",
    "ethereum-contracts",
    "pillar",
    "Distinguish code execution from legal contracts and promises of safety. Proxy/admin/oracle risk, practical non-investment example.",
    ["contracts", "safety"],
    ["smart contract", "contrato inteligente", "upgrade", "contract exploit"],
    "contratos-inteligentes-explicados",
  ),
  topic(
    "layer-2-networks-risks",
    "What is a Layer 2 network? Fees, bridges and security trade-offs",
    "Qué es una red Layer 2: comisiones, puentes y riesgos",
    "technology",
    "ethereum-scaling",
    "pillar",
    "Rollups vs sidechains, custody and bridges, sequencing and exit assumptions. Do not imply all L2 networks inherit identical security.",
    ["l2", "gas"],
    ["layer 2", "rollup", "bridge", "puente", "scaling"],
    "redes-layer-2-riesgos",
  ),
  topic(
    "defi-beginner-risks",
    "DeFi for beginners: how applications work and what can go wrong",
    "DeFi para principiantes: cómo funciona y cuáles son sus riesgos",
    "defi",
    "defi-risk",
    "pillar",
    "Lending, AMMs, collateral and liquidations, approvals, oracle and governance risk, no yield recommendations or live percentages.",
    ["defi", "contracts", "safety"],
    ["defi", "lending", "liquidation", "liquidez", "liquidacion"],
    "defi-principiantes-riesgos",
  ),
  topic(
    "bitcoin-transactions-confirmations",
    "Bitcoin transactions and confirmations: a beginner’s guide",
    "Transacciones y confirmaciones de Bitcoin: guía para principiantes",
    "bitcoin",
    "bitcoin-basics",
    "pillar",
    "Explain UTXOs, addresses, fees and confirmations without outdated fee predictions, guaranteed finality or conflating Bitcoin with account-based chains.",
    ["bitcoin", "wallet"],
    [
      "bitcoin transaction",
      "bitcoin network",
      "confirmations",
      "confirmaciones",
    ],
    "transacciones-confirmaciones-bitcoin",
  ),
  topic(
    "exchange-custody-withdrawals",
    "Exchange custody and withdrawals: what users should check",
    "Custodia y retiros en exchanges: qué conviene comprobar",
    "exchanges",
    "exchange-custody",
    "pillar",
    "Custodial balances vs onchain keys, availability vs solvency, small test transfer, network and destination checks. No platform rankings or guarantee that tests eliminate risk.",
    ["wallet", "safety", "accounts"],
    ["exchange", "withdrawal", "withdrawals", "retiros", "custodial"],
    "custodia-retiros-exchanges",
  ),
  topic(
    "usdt-usdc-differences",
    "USDT vs USDC: how to compare two issuer-backed stablecoins",
    "USDT frente a USDC: cómo comparar dos stablecoins con emisor",
    "stablecoins",
    "stablecoins",
    "supporting",
    "Use actual retrieved issuer disclosures with dates and attributed statements, not assurances of safety or investment preference. If both official issuer disclosures are not accessible, defer.",
    ["usdc", "usdt", "stablecoins"],
    ["usdt", "usdc", "tether", "circle"],
    "usdt-usdc-diferencias",
  ),
  {
    ...topic(
      "us-federal-digital-asset-tax-records",
      "US federal digital-asset tax records: what to keep",
      "Registros fiscales de activos digitales para impuestos federales de Estados Unidos",
      "regulation",
      "us-tax-records",
      "pillar",
      "United States federal scope only, not state or foreign rules; verify current IRS source and dated forms, keep records, no personalized tax advice or invented thresholds. If current applicability cannot be verified, defer.",
      ["irs"],
      ["irs", "us tax", "tax reporting", "impuestos estados unidos"],
      "registros-fiscales-crypto-estados-unidos",
    ),
    jurisdiction: "United States — federal",
    asOf: new Date().toISOString().slice(0, 10),
  },
];
