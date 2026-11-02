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
  requiredSources?: string[];
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
  optimisticRollups: {
    url: "https://ethereum.org/en/developers/docs/scaling/optimistic-rollups/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/developers/docs/scaling/optimistic-rollups/index.md",
    label:
      "Ethereum.org — Optimistic rollups: operators, censorship resistance and exits",
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
    url: "https://tether.to/en/how-it-works/",
    label: "Tether — How it works (issuer statements)",
  },
  usdtProtocols: {
    url: "https://tether.to/en/supported-protocols/",
    label: "Tether — Supported protocols and deprecated deployments",
  },
  usdcContracts: {
    url: "https://developers.circle.com/stablecoins/usdc-contract-addresses",
    label: "Circle Developers — Official USDC contract addresses and networks",
  },
  bitcoin: {
    url: "https://bitcoin.org/en/how-it-works",
    label: "Bitcoin.org — How Bitcoin works",
  },
  bitcoinFaq: {
    url: "https://bitcoin.org/en/faq",
    label: "Bitcoin.org — Frequently asked questions",
  },
  bip39: {
    url: "https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki",
    fetchUrl:
      "https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039.mediawiki",
    label: "Bitcoin BIPs — BIP 39: mnemonic codes and optional passphrases",
  },
  ethereumIntro: {
    url: "https://ethereum.org/en/developers/docs/intro-to-ethereum/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/developers/docs/intro-to-ethereum/index.md",
    label: "Ethereum.org — What is Ethereum?",
  },
  staking: {
    url: "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/rewards-and-penalties/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/developers/docs/consensus-mechanisms/pos/rewards-and-penalties/index.md",
    label: "Ethereum.org — Proof-of-stake rewards and penalties",
  },
  proofOfStake: {
    url: "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/",
    fetchUrl:
      "https://raw.githubusercontent.com/ethereum/ethereum-org-website/dev/public/content/developers/docs/consensus-mechanisms/pos/index.md",
    label: "Ethereum.org — Proof of stake",
  },
  getEth: {
    url: "https://ethereum.org/en/get-eth/",
    label:
      "Ethereum.org — Obtaining ETH: centralized and decentralized exchanges",
  },
  dex: {
    url: "https://www.coinbase.com/learn/crypto-basics/what-is-a-dex",
    label:
      "Coinbase Learn — What is a DEX? (exchange educational documentation)",
  },
  stakingOptions: {
    url: "https://ethereum.org/en/staking/",
    label: "Ethereum.org — Staking options and risks",
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
  requiredSourceKeys: S[] = [],
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
    ...(requiredSourceKeys.length
      ? { requiredSources: requiredSourceKeys.map((k) => docs[k].url) }
      : {}),
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
    [
      "gas fee",
      "gas fees",
      "comisiones de gas",
      "comisiones gas",
      "eip-1559",
      "gwei",
    ],
    "comisiones-gas-ethereum",
  ),
];
export const queuedTopics: TopicSpec[] = [
  topic(
    "what-is-bitcoin-how-it-works",
    "What is Bitcoin and how does it work? A complete beginner’s guide",
    "Qué es Bitcoin y cómo funciona: guía completa para principiantes",
    "bitcoin",
    "bitcoin-basics",
    "pillar",
    "A beginner's introduction to Bitcoin: decentralized ledger, keys and signatures, peer-to-peer verification, proof of work, supply rules, mining, transaction lifecycle and limitations. Distinguish BTC, Bitcoin and other networks. Practical non-investment walkthrough of reading a transaction and checking a receiving address. Explain fees/confirmations briefly and link to the narrower planned transaction guide rather than duplicating its troubleshooting intent. Do not promise fixed block times, finality, returns or universal anonymity. All current protocol claims must be in the retrieved documents.",
    ["bitcoin", "bitcoinFaq", "wallet", "bip39"],
    ["bitcoin", "btc", "proof of work", "mining", "minería"],
    "que-es-bitcoin-como-funciona",
  ),
  topic(
    "what-is-ethereum-bitcoin-differences",
    "What is Ethereum? How it works and how it differs from Bitcoin",
    "Qué es Ethereum y en qué se diferencia de Bitcoin",
    "ethereum",
    "ethereum-basics",
    "pillar",
    "Beginner overview of Ethereum, ETH vs network vs ERC tokens, accounts, smart contracts, proof of stake, transaction lifecycle, applications, and balanced Bitcoin comparison. Compare purpose, transaction model, consensus and limits with dated source-supported facts, never throughput promises or better-investment rankings. Explain gas and staking only briefly; dedicated guides cover their mechanics. Hypothetical use case must not imply code enforces real-world delivery, truth or safety.",
    ["ethereumIntro", "proofOfStake", "accounts", "bitcoin"],
    ["ethereum", "ether", "eth", "smart contract", "contrato inteligente"],
    "que-es-ethereum-diferencias-bitcoin",
  ),
  topic(
    "crypto-staking-how-it-works-risks",
    "Crypto staking explained: how it works and which risks matter",
    "Qué es el staking de criptomonedas, cómo funciona y qué riesgos tiene",
    "ethereum",
    "ethereum-staking",
    "pillar",
    "Explain proof-of-stake validation using Ethereum as an explicitly scoped example; other networks differ. Solo validators vs staking as a service, pools, exchange staking and liquid staking. Distinguish staking from lending/yield products, rewards from guaranteed interest, penalties vs slashing and smart-contract/provider/liquidity risks. Explain queues, operational duties and custody without current APY, guaranteed withdrawal times or live numerical examples absent in the ledger. Never solicit deposits or display seed phrases.",
    ["staking", "proofOfStake", "stakingOptions", "safety"],
    ["staking", "validator", "validador", "slashing", "proof of stake"],
    "staking-criptomonedas-como-funciona-riesgos",
  ),
  topic(
    "centralized-decentralized-exchanges",
    "Centralized and decentralized exchanges: how they work and differ",
    "Cómo funcionan los exchanges centralizados y descentralizados",
    "exchanges",
    "exchange-basics",
    "pillar",
    "Compare CEX custodial balances/order matching with DEX wallet-based smart-contract swaps and common AMM models only where documents support them. Explain deposits, trades, withdrawals, approvals, routing, slippage, liquidity and fees, distinguishing examples from universal mechanisms. DEX frontends, contracts and governance may retain centralized dependencies. No exchange rankings, invented legal eligibility, liquidity quotes, live fees or guarantees. Dedicated custody/withdrawal guide is a narrower operational follow-up, not this comparison's main intent.",
    ["getEth", "dex", "defi", "accounts", "safety"],
    ["exchange", "exchanges", "dex", "cex", "swap", "intercambio"],
    "exchanges-centralizados-descentralizados-como-funcionan",
  ),
  topic(
    "recovery-phrase-safe-backup",
    "Recovery phrases: how to keep a usable, private backup",
    "Frase de recuperación: cómo conservar una copia privada y utilizable",
    "security",
    "wallet-security",
    "supporting",
    "Focus on recovery and backups; avoid duplicating the pillar scam checklist. Distinguish passphrase, seed phrase and wallet password. Do not display usable seed phrases or seed-generation instructions.",
    ["safety", "wallet", "accounts", "bip39"],
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
    [
      "smart contract",
      "contrato inteligente",
      "contract upgrade",
      "contract exploit",
    ],
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
    ["l2", "gas", "optimisticRollups"],
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
    "Use actual retrieved issuer disclosures with dates and attributed statements, not assurances of safety or investment preference. Consult current protocol/contract directories: older introductory issuer pages may list legacy deployments. Never imply that a deprecated chain currently has issuer support or guaranteed redemption. Distinguish the issuer's USD value claim from technical transfer compatibility across chains. If required current issuer disclosures/directories are inaccessible, defer.",
    ["usdc", "usdt", "stablecoins", "usdtProtocols", "usdcContracts"],
    ["usdt", "usdc", "tether", "circle"],
    "usdt-usdc-diferencias",
    ["usdc", "usdt", "usdtProtocols", "usdcContracts"],
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
