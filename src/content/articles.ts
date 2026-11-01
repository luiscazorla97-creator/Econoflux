import type { Lang } from "../lib/i18n";
export type Category = "bitcoin" | "ethereum" | "defi" | "altcoins";
export interface Section {
  id: string;
  title: string;
  text: string[];
  subheading?: string;
  list?: string[];
  table?: { headings: string[]; rows: string[][] };
}
export interface Article {
  id: string;
  translationId: string;
  lang: Lang;
  slug: string;
  title: string;
  summary: string;
  category: Category;
  tags: string[];
  image: { src: string; alt: string; credit: string };
  sources: { label: string; url: string }[];
  publishedAt: string;
  updatedAt?: string;
  status: "draft" | "published";
  demo: boolean;
  author: string;
  sections: Section[];
}
const date = "2026-11-01";
const seeds = [
  {
    category: "bitcoin" as const,
    slugs: ["what-is-bitcoin", "que-es-bitcoin"],
    titles: ["Inside the Bitcoin ecosystem", "Dentro del ecosistema Bitcoin"],
    summaries: [
      "People, technology and real-world use cases powering Bitcoin’s global role.",
      "Personas, tecnología y usos reales que dan forma al papel global de Bitcoin.",
    ],
    alts: [
      "A golden Bitcoin coin in a dark sculptural setting",
      "Una moneda dorada de Bitcoin en una composición oscura",
    ],
    sources: [
      {
        label: "Bitcoin white paper — Satoshi Nakamoto",
        url: "https://bitcoin.org/bitcoin.pdf",
      },
      {
        label: "Bitcoin developer guides",
        url: "https://developer.bitcoin.org/devguide/",
      },
    ],
    sections: [
      [
        {
          id: "fundamentals",
          title: "What is Bitcoin?",
          text: [
            "Bitcoin is a digital payment network that lets participants transfer value without a central ledger operator. Its native unit, bitcoin (BTC), is recorded on a shared history of transactions called the blockchain.",
            "The network launched in 2009 following a white paper published under the name Satoshi Nakamoto. Owning bitcoin means controlling the keys that authorize spending, rather than possessing a physical coin.",
          ],
        },
        {
          id: "network",
          title: "How the network agrees",
          text: [
            "Nodes independently check transactions against consensus rules. Miners assemble valid transactions into blocks and use proof of work to propose additions to the chain.",
            "Confirmations make a transaction increasingly difficult to reverse, but they are not an absolute guarantee. Network conditions affect both confirmation time and fees.",
          ],
          subheading: "Three ideas to remember",
          list: [
            "A wallet manages keys; it does not store coins as files.",
            "A public address can receive funds, while private keys must remain secret.",
            "The supply schedule is defined by protocol rules, with an eventual limit near 21 million bitcoin.",
          ],
        },
        {
          id: "tradeoffs",
          title: "Utility comes with trade-offs",
          text: [
            "Bitcoin can support transfers and self-custody, but its price can fluctuate sharply. Transactions are generally irreversible, and losing keys can mean losing access permanently.",
            "Custodial services simplify some tasks while introducing reliance on a third party. Self-custody gives more direct control and also more responsibility.",
          ],
          table: {
            headings: [
              "Approach",
              "Who controls the keys?",
              "Main consideration",
            ],
            rows: [
              ["Self-custody", "The holder", "Backup and operational security"],
              [
                "Custodial account",
                "A service provider",
                "Provider reliability and withdrawal rules",
              ],
            ],
          },
        },
        {
          id: "start",
          title: "A thoughtful starting point",
          text: [
            "Learn how wallets, backups and transaction fees work before making any transfer. Never share a seed phrase and verify destinations carefully.",
            "This guide explains concepts rather than recommending an investment. Read original documentation and consider the legal and tax rules where you live.",
          ],
        },
      ],
      [
        {
          id: "fundamentals",
          title: "¿Qué es Bitcoin?",
          text: [
            "Bitcoin es una red de pagos digitales que permite transferir valor sin un operador central del registro. Su unidad nativa, bitcoin (BTC), se registra en un historial compartido de transacciones llamado cadena de bloques.",
            "La red comenzó a funcionar en 2009 tras la publicación de un documento firmado con el nombre Satoshi Nakamoto. Tener bitcoin significa controlar las claves que autorizan su gasto, no poseer una moneda física.",
          ],
        },
        {
          id: "network",
          title: "Cómo alcanza acuerdos la red",
          text: [
            "Los nodos verifican las transacciones de forma independiente según las reglas de consenso. Los mineros agrupan transacciones válidas en bloques y utilizan prueba de trabajo para proponer nuevas incorporaciones a la cadena.",
            "Las confirmaciones hacen cada vez más difícil revertir una transacción, pero no ofrecen una garantía absoluta. Las condiciones de la red influyen en los tiempos y las comisiones.",
          ],
          subheading: "Tres conceptos para recordar",
          list: [
            "Una cartera gestiona claves; no guarda monedas como archivos.",
            "Una dirección pública permite recibir fondos; las claves privadas deben mantenerse en secreto.",
            "Las reglas del protocolo establecen una emisión con un límite final cercano a 21 millones de bitcoin.",
          ],
        },
        {
          id: "tradeoffs",
          title: "Utilidad y compromisos",
          text: [
            "Bitcoin permite transferencias y autocustodia, pero su precio puede variar bruscamente. Las transacciones suelen ser irreversibles y perder las claves puede significar perder el acceso para siempre.",
            "Los servicios de custodia simplifican algunas tareas, pero implican confiar en un tercero. La autocustodia aporta control directo y también más responsabilidad.",
          ],
          table: {
            headings: [
              "Modalidad",
              "¿Quién controla las claves?",
              "Aspecto principal",
            ],
            rows: [
              [
                "Autocustodia",
                "El titular",
                "Copias de seguridad y protección",
              ],
              [
                "Cuenta con custodio",
                "Un proveedor",
                "Fiabilidad y condiciones de retirada",
              ],
            ],
          },
        },
        {
          id: "start",
          title: "Un punto de partida informado",
          text: [
            "Aprende cómo funcionan las carteras, las copias de seguridad y las comisiones antes de realizar una transferencia. Nunca compartas tu frase de recuperación y verifica el destino con cuidado.",
            "Esta guía explica conceptos, no recomienda inversiones. Consulta documentación original y las normas legales y fiscales de tu país.",
          ],
        },
      ],
    ],
  },
  {
    category: "ethereum" as const,
    slugs: ["how-ethereum-works", "como-funciona-ethereum"],
    titles: ["Ethereum, explained", "Ethereum, explicado"],
    summaries: [
      "How Ethereum works, why it matters, and the ideas behind its evolving ecosystem.",
      "Cómo funciona Ethereum, por qué importa y las ideas que impulsan su ecosistema.",
    ],
    alts: [
      "A smoky glass Ethereum crystal illuminated in gold",
      "Un cristal oscuro de Ethereum con iluminación dorada",
    ],
    sources: [
      {
        label: "Ethereum documentation",
        url: "https://ethereum.org/en/developers/docs/",
      },
      {
        label: "Ethereum — proof of stake",
        url: "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/",
      },
    ],
    sections: [
      [
        {
          id: "platform",
          title: "More than a payment network",
          text: [
            "Ethereum is a blockchain that executes programs called smart contracts. These programs manage shared state according to rules that participants can inspect. Ether (ETH) is its native asset, used to pay network fees and help secure consensus.",
            "Applications can combine contracts to support transfers, collectibles or financial tools. A contract executing as written does not guarantee that its design is safe or that its use is lawful.",
          ],
        },
        {
          id: "gas",
          title: "Transactions and gas",
          text: [
            "Every operation requires computation. Gas measures that work, while the fee paid depends on network demand and transaction settings. A transaction that fails during execution may still incur fees.",
          ],
          subheading: "The path of a transaction",
          list: [
            "A wallet signs a request to change blockchain state.",
            "Validators include transactions in blocks.",
            "Nodes execute and verify the resulting state changes.",
          ],
        },
        {
          id: "consensus",
          title: "Securing a shared computer",
          text: [
            "Ethereum uses proof of stake. Validators commit ETH and participate in proposing and attesting to blocks. Protocol penalties discourage certain kinds of misconduct.",
            "Layer 2 networks aim to make transactions cheaper by processing activity outside the base layer while using Ethereum for parts of their security. Their assumptions and withdrawal procedures differ.",
          ],
        },
        {
          id: "risks",
          title: "What to check before interacting",
          text: [
            "Check which network your wallet is using, what a transaction authorizes and whether a token approval grants ongoing spending access. Smart contract bugs, malicious interfaces and compromised keys can all cause losses.",
            "Use official documentation to understand a system. Open source code and audits provide information, but neither eliminates risk.",
          ],
        },
      ],
      [
        {
          id: "platform",
          title: "Más que una red de pagos",
          text: [
            "Ethereum es una cadena de bloques que ejecuta programas llamados contratos inteligentes. Estos gestionan un estado compartido siguiendo reglas que los participantes pueden revisar. Ether (ETH) es su activo nativo: sirve para pagar comisiones y contribuir a la seguridad del consenso.",
            "Las aplicaciones combinan contratos para ofrecer transferencias, coleccionables o herramientas financieras. Que un contrato ejecute su código no garantiza que su diseño sea seguro ni que su uso sea legal.",
          ],
        },
        {
          id: "gas",
          title: "Transacciones y gas",
          text: [
            "Cada operación requiere computación. El gas mide ese trabajo, mientras que la comisión depende de la demanda y de la configuración de la transacción. Una operación fallida también puede generar costes.",
          ],
          subheading: "El recorrido de una transacción",
          list: [
            "Una cartera firma una petición para cambiar el estado de la cadena.",
            "Los validadores incluyen transacciones en bloques.",
            "Los nodos ejecutan y verifican los cambios resultantes.",
          ],
        },
        {
          id: "consensus",
          title: "La seguridad de un ordenador compartido",
          text: [
            "Ethereum utiliza prueba de participación. Los validadores comprometen ETH y participan proponiendo bloques y dando fe de ellos. Las penalizaciones del protocolo desincentivan ciertas conductas indebidas.",
            "Las redes de capa 2 buscan abaratar las transacciones procesando actividad fuera de la capa base y utilizando Ethereum para parte de su seguridad. Sus supuestos y procesos de retirada varían.",
          ],
        },
        {
          id: "risks",
          title: "Qué revisar antes de interactuar",
          text: [
            "Comprueba la red de tu cartera, qué autoriza una transacción y si una aprobación permite gastar tokens de forma continuada. Los fallos de contratos, las interfaces maliciosas y las claves comprometidas pueden provocar pérdidas.",
            "Consulta documentación oficial para comprender el sistema. El código abierto y las auditorías aportan información, pero no eliminan los riesgos.",
          ],
        },
      ],
    ],
  },
  {
    category: "defi" as const,
    slugs: ["introduction-to-defi", "introduccion-a-defi"],
    titles: ["A closer look at DeFi", "Una mirada a DeFi"],
    summaries: [
      "The building blocks and people exploring a more open financial system.",
      "Las herramientas y las personas que exploran un sistema financiero más abierto.",
    ],
    alts: [
      "Sculptural golden ribbons and dark glass cubes",
      "Cintas doradas y cubos de cristal oscuro",
    ],
    sources: [
      {
        label: "Ethereum — decentralized finance",
        url: "https://ethereum.org/en/defi/",
      },
      {
        label: "Ethereum — smart contracts",
        url: "https://ethereum.org/en/developers/docs/smart-contracts/",
      },
    ],
    sections: [
      [
        {
          id: "meaning",
          title: "What does DeFi mean?",
          text: [
            "Decentralized finance, or DeFi, describes financial applications built with blockchain smart contracts. Common examples include token exchanges and collateralized lending systems.",
            "The word decentralized covers a spectrum. Governance, interfaces, price feeds and administrator permissions can introduce important points of control.",
          ],
        },
        {
          id: "blocks",
          title: "The basic building blocks",
          text: [
            "Protocols can interact with one another, allowing developers to combine existing services. This composability also connects their risks: a failure in one component may affect others.",
          ],
          subheading: "Common examples",
          list: [
            "Exchanges use pools or order books to facilitate token swaps.",
            "Lending protocols manage collateral and borrowing rules.",
            "Stablecoins seek a reference value but rely on different mechanisms and can lose their peg.",
          ],
        },
        {
          id: "risk",
          title: "Understand the risks first",
          text: [
            "Smart contract vulnerabilities can expose funds. Oracles may deliver inaccurate prices, governance can change rules and falling collateral values can trigger liquidation.",
            "A displayed yield is not a guaranteed return. Token incentives, fees, market movements and losses can change the outcome substantially.",
          ],
          table: {
            headings: ["Risk", "A useful question"],
            rows: [
              ["Contract", "Who can upgrade or pause the system?"],
              ["Collateral", "When does liquidation occur?"],
              ["Liquidity", "Can positions be exited under stress?"],
            ],
          },
        },
        {
          id: "research",
          title: "Build a research habit",
          text: [
            "Read protocol documentation and understand permissions before connecting a wallet. Trace where returns are expected to come from and what could prevent withdrawals.",
            "DeFi is an area of technical experimentation, not a promise of safe income. This sample is educational and does not endorse a protocol or asset.",
          ],
        },
      ],
      [
        {
          id: "meaning",
          title: "¿Qué significa DeFi?",
          text: [
            "Las finanzas descentralizadas, o DeFi, son aplicaciones financieras construidas con contratos inteligentes en cadenas de bloques. Entre los ejemplos habituales figuran los intercambios de tokens y los préstamos con garantía.",
            "La descentralización tiene distintos grados. La gobernanza, las interfaces, las fuentes de precios y los permisos de administración pueden introducir puntos de control importantes.",
          ],
        },
        {
          id: "blocks",
          title: "Las piezas fundamentales",
          text: [
            "Los protocolos pueden interactuar entre sí y combinar servicios existentes. Esa capacidad también conecta sus riesgos: el fallo de un componente puede afectar a otros.",
          ],
          subheading: "Ejemplos habituales",
          list: [
            "Los intercambios utilizan fondos de liquidez o libros de órdenes para cambiar tokens.",
            "Los protocolos de préstamo gestionan garantías y condiciones de endeudamiento.",
            "Las monedas estables buscan un valor de referencia, pero sus mecanismos varían y pueden perder la paridad.",
          ],
        },
        {
          id: "risk",
          title: "Comprende primero los riesgos",
          text: [
            "Las vulnerabilidades de los contratos pueden exponer fondos. Los oráculos pueden aportar precios incorrectos, la gobernanza puede cambiar las reglas y una caída de las garantías puede provocar liquidaciones.",
            "Una rentabilidad mostrada no es un rendimiento garantizado. Los incentivos, las comisiones, el mercado y las pérdidas pueden cambiar considerablemente el resultado.",
          ],
          table: {
            headings: ["Riesgo", "Una pregunta útil"],
            rows: [
              ["Contrato", "¿Quién puede actualizar o pausar el sistema?"],
              ["Garantía", "¿Cuándo se produce una liquidación?"],
              ["Liquidez", "¿Se puede salir en momentos de tensión?"],
            ],
          },
        },
        {
          id: "research",
          title: "Crea un hábito de investigación",
          text: [
            "Lee la documentación y comprende los permisos antes de conectar una cartera. Investiga de dónde proceden los posibles rendimientos y qué podría impedir las retiradas.",
            "DeFi es un área de experimentación técnica, no una promesa de ingresos seguros. Este ejemplo es educativo y no recomienda protocolos ni activos.",
          ],
        },
      ],
    ],
  },
];
export const articles: Article[] = seeds.flatMap((s) =>
  (["en", "es"] as const).map((lang, i) => ({
    id: `${s.category}-${lang}`,
    translationId: s.category,
    lang,
    slug: s.slugs[i],
    title: s.titles[i],
    summary: s.summaries[i],
    category: s.category,
    tags: [s.category, "learn"],
    image: {
      src: `/images/${s.category}.webp`,
      alt: s.alts[i],
      credit: "EconoFlux · AI",
    },
    sources: s.sources,
    publishedAt: date,
    status: "draft" as const,
    demo: true,
    author:
      lang === "en"
        ? "EconoFlux demo editorial"
        : "Redacción de demostración EconoFlux",
    sections: s.sections[i],
  })),
);
export const preview = process.env.SITE_MODE !== "production";
export const visibleArticles = articles.filter(
  (a) => preview || (a.status === "published" && !a.demo),
);
export const articleUrl = (a: Article) => `/${a.lang}/articles/${a.slug}/`;
export const readingTime = (a: Article) =>
  Math.max(
    1,
    Math.ceil(
      a.sections
        .map((s) => [...s.text, ...(s.list || [])].join(" "))
        .join(" ")
        .split(/\s+/).length / 200,
    ),
  );
