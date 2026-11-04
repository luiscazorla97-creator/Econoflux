import { policyPages } from "./policies";

export const pages = {
  en: {
    verification: {
      title: "How we verify information",
      intro: "Traceable reporting, evidence checks and bilingual consistency.",
      sections: [
        [
          "Before publication",
          "The automated editorial process retrieves accessible sources, prefers official documentation and distinguishes issuer claims from independently confirmed facts. A separate AI-assisted check compares the drafts with the consulted evidence. This is not a claim of human review or firsthand reporting.",
        ],
        [
          "Confirmed, rumor or leak",
          "Ordinary news can rely on accessible, identifiable original journalism with on-record evidence or genuinely independent corroboration; an official release is not always required. Confirmed articles distinguish what is established. Rumors and leaks identify the original report, what it actually claims and what remains unconfirmed or unauthenticated. Repetition of one origin does not corroborate it. Unsupported damaging accusations are withheld. Confirmations and denials update the same URL.",
        ],
        [
          "When evidence is incomplete",
          "We defer material that cannot be adequately verified. News is checked for duplicate events and guides for overlapping reader intent. English and Spanish must form a complete pair with equivalent facts and uncertainty before publication.",
        ],
        [
          "Limitations",
          "Automated checks can miss errors. External documents may be unavailable or change. Each publication links to the sources actually consulted; please report a suspected error to luterapps@gmail.com with the URL and supporting evidence.",
        ],
      ],
    },
    methodology: {
      title: "Sources and methodology",
      intro: "How EconoFlux researches, writes and maintains its library.",
      sections: [
        [
          "News and educational guides",
          "News selection uses Crypto News API and consulted original sources. Academy guides use official technical documents and other clearly identified primary materials. Drafting and factual and bilingual review use AI assistance; no human credentials or professional review are implied.",
        ],
        [
          "Planning and internal links",
          "Guide planning records intent, reader questions, topic clusters and related content. Keywords are editorial estimates, not measured search volumes or difficulty scores. Relevant links connect published content in the same language. We do not promise Google rankings.",
        ],
        [
          "Maintenance and dates",
          "Guides are checked about every 90 days and when relevant published developments warrant a check. Unchanged documentation does not refresh the visible modification date. Substantive revisions preserve the URL and publication date and record the actual modification date. Dates use UTC.",
        ],
        [
          "Illustrations and independence",
          "Original Academy diagrams explain concepts and do not document real incidents. Source photographs, when used, require recorded rights and attribution. No paid image-generation API is activated for the Academy. News has priority within the shared daily AI budget; incomplete guides are deferred.",
        ],
      ],
    },
    corrections: {
      title: "Corrections policy",
      intro: "A clear route to report errors and maintain a useful record.",
      sections: [
        [
          "Request a correction",
          "Email luterapps@gmail.com with the publication URL, the disputed passage and reliable supporting sources. EconoFlux is operated by Luis C. A submitted request is not itself proof that the article is wrong.",
        ],
        [
          "Review and changes",
          "We compare the disputed claim with available evidence. Material factual changes preserve the original URL and publication date, add a genuine modification date and explain the correction where appropriate. An unchanged scheduled check does not become a new publication. We do not claim an automatic email-response or resolution deadline.",
        ],
      ],
    },
    education: {
      title: "Educational and informational notice",
      intro: "Understand the information before making your own decisions.",
      sections: [
        [
          "Scope",
          "EconoFlux news and Academy guides provide general information and education. They are not personalized financial, investment, legal, tax or cybersecurity advice. No returns or protection from loss are guaranteed; examples are illustrative, not live quotations or recommendations.",
        ],
        [
          "Risk and jurisdiction",
          "Crypto assets, custody arrangements, smart contracts and platforms can fail. Regulations and taxes depend on jurisdiction and applicable dates. Consult suitably qualified independent professionals for decisions specific to your circumstances. Never send us private keys, recovery phrases, passwords or API secrets.",
        ],
      ],
    },
    about: {
      title: "About EconoFlux",
      intro: "An independent perspective on digital finance.",
      sections: [
        [
          "Our purpose",
          "EconoFlux is a bilingual publication covering cryptocurrency and digital finance. Our reporting is available in English and Spanish at econoflux.com.",
        ],
        [
          "An honest starting point",
          "EconoFlux publishes AI-assisted news and educational guides with links to their sources. News is checked every ten minutes; shared market data is refreshed about every 15 minutes. The normal publication pace is one story per hour, with up to three distinct important stories and sufficiently supported urgent developments between routine slots. Publication depends on evidence, editorial checks and the configured budget, rather than a guaranteed number of stories.",
        ],
      ],
    },
    editorial: {
      title: "Editorial principles",
      intro: "Clarity, traceable sources and transparent authorship.",
      sections: [
        [
          "Sources before headlines",
          "Our reporting links to sources, distinguishes confirmed facts from attributed statements and analysis, and preserves the provenance of each story. Unverified claims must not be presented as facts.",
        ],
        [
          "Automation and accountability",
          "Articles use the EconoFlux editorial byline. Sources and methodology explain the research, drafting and verification process. Automatic publishing checks for duplicate events, preserves sources and requires factual and bilingual editorial review. Stories with insufficient accessible evidence remain pending.",
        ],
        [
          "Corrections",
          "Substantial corrections preserve the original URL and show a genuine modification date and a clarification where appropriate.",
        ],
      ],
    },
    contact: {
      title: "Contact",
      intro: "Editorial contact and corrections.",
      sections: [
        [
          "Get in touch",
          "EconoFlux is operated by Luis C. For editorial inquiries, corrections or privacy requests, email luterapps@gmail.com. Include the article URL and the facts or sources that need review.",
        ],
      ],
    },
    ...policyPages.en,
  },
  es: {
    verification: {
      title: "Cómo verificamos la información",
      intro:
        "Reportes trazables, controles de evidencia y coherencia bilingüe.",
      sections: [
        [
          "Antes de publicar",
          "El proceso editorial automatizado consulta fuentes accesibles, da prioridad a la documentación oficial y distingue las declaraciones de un emisor de los hechos confirmados de manera independiente. Una comprobación separada con asistencia de IA compara los borradores con las pruebas consultadas. No afirmamos que exista revisión humana ni cobertura presencial.",
        ],
        [
          "Confirmada, rumor o filtración",
          "Las noticias ordinarias pueden apoyarse en periodismo original accesible e identificable con pruebas atribuibles o corroboración realmente independiente; no siempre se exige un comunicado oficial. Los artículos confirmados distinguen qué está respaldado. Los rumores y las filtraciones identifican el reporte original, qué afirma exactamente y qué sigue sin confirmar o autenticar. Repetir un mismo origen no lo corrobora. Las acusaciones perjudiciales sin respaldo suficiente quedan pendientes. Las confirmaciones y los desmentidos actualizan la misma URL.",
        ],
        [
          "Cuando faltan pruebas",
          "Posponemos el contenido que no pueda verificarse de forma suficiente. Comprobamos acontecimientos duplicados en noticias e intenciones de búsqueda coincidentes en guías. Inglés y español deben constituir un par completo con hechos e incertidumbres equivalentes antes de publicar.",
        ],
        [
          "Limitaciones",
          "Los controles automatizados pueden pasar por alto errores. Los documentos externos pueden cambiar o dejar de estar disponibles. Cada publicación enlaza las fuentes consultadas; comunica posibles errores a luterapps@gmail.com con la URL y las pruebas pertinentes.",
        ],
      ],
    },
    methodology: {
      title: "Fuentes y metodología",
      intro:
        "Cómo investigamos, redactamos y mantenemos la biblioteca de EconoFlux.",
      sections: [
        [
          "Noticias y guías educativas",
          "La selección de noticias utiliza Crypto News API y fuentes originales consultadas. Las guías emplean documentación técnica oficial y otras fuentes primarias identificadas. La redacción y las comprobaciones factual y bilingüe utilizan asistencia de IA; no atribuimos credenciales humanas ni revisión profesional inexistentes.",
        ],
        [
          "Planificación y enlaces internos",
          "El plan de cada guía registra intención, preguntas, grupos temáticos y contenido relacionado. Las palabras clave son estimaciones editoriales, no volúmenes de búsqueda ni dificultad medidos. Los enlaces pertinentes conectan contenido publicado del mismo idioma. No prometemos posiciones en Google.",
        ],
        [
          "Mantenimiento y fechas",
          "Comprobamos las guías aproximadamente cada 90 días y cuando las novedades publicadas pertinentes justifican una revisión. La documentación sin cambios no renueva la fecha visible. Las modificaciones sustanciales conservan URL y publicación original y registran su fecha real. Las fechas utilizan UTC.",
        ],
        [
          "Ilustraciones y presupuesto",
          "Los diagramas originales de Academia explican conceptos y no documentan incidentes reales. Las fotografías requieren derechos y atribución registrados. No activamos una API de imágenes de pago para Academia. Las noticias tienen prioridad dentro del presupuesto diario compartido de IA; las guías incompletas se posponen.",
        ],
      ],
    },
    corrections: {
      title: "Política de correcciones",
      intro:
        "Una vía clara para comunicar errores y mantener un registro útil.",
      sections: [
        [
          "Solicitar una corrección",
          "Escribe a luterapps@gmail.com con la URL, el pasaje que consideras incorrecto y fuentes fiables que lo respalden. EconoFlux está operado por Luis C. Recibir una solicitud no demuestra por sí mismo que el artículo sea incorrecto.",
        ],
        [
          "Revisión y cambios",
          "Contrastamos la afirmación con las pruebas disponibles. Los cambios de hechos relevantes conservan la URL y la fecha de publicación, añaden una fecha real de modificación y explican la corrección cuando corresponde. Una comprobación programada sin cambios no se convierte en una publicación nueva. No afirmamos que exista respuesta automática al correo ni garantizamos plazos de resolución.",
        ],
      ],
    },
    education: {
      title: "Aviso educativo e informativo",
      intro: "Comprende la información antes de tomar tus propias decisiones.",
      sections: [
        [
          "Alcance",
          "Las noticias y guías de EconoFlux proporcionan información y educación generales. No son asesoramiento financiero, de inversión, legal, fiscal ni de ciberseguridad personalizado. No garantizamos rentabilidad ni protección frente a pérdidas; los ejemplos son ilustrativos, no cotizaciones en directo ni recomendaciones.",
        ],
        [
          "Riesgos y jurisdicción",
          "Los criptoactivos, la custodia, los contratos inteligentes y las plataformas pueden fallar. Las normas e impuestos dependen de la jurisdicción y las fechas aplicables. Consulta a profesionales independientes cualificados para decisiones específicas de tu situación. Nunca nos envíes claves privadas, frases de recuperación, contraseñas ni secretos de API.",
        ],
      ],
    },
    about: {
      title: "Sobre EconoFlux",
      intro: "Una perspectiva independiente de las finanzas digitales.",
      sections: [
        [
          "Nuestro propósito",
          "EconoFlux es un medio bilingüe sobre criptomonedas y finanzas digitales. La información se publica en inglés y español en econoflux.com.",
        ],
        [
          "Un comienzo transparente",
          "EconoFlux publica noticias y guías educativas con asistencia de IA y enlaces a sus fuentes. Las noticias se revisan cada diez minutos y las cotizaciones compartidas se actualizan aproximadamente cada 15 minutos. El ritmo normal es una noticia por hora, con hasta tres acontecimientos importantes distintos y novedades urgentes suficientemente respaldadas entre horarios habituales. La publicación depende de las pruebas, los controles editoriales y el presupuesto configurado; no se garantiza una cantidad de noticias.",
        ],
      ],
    },
    editorial: {
      title: "Principios editoriales",
      intro: "Claridad, fuentes trazables y autoría transparente.",
      sections: [
        [
          "Las fuentes antes que los titulares",
          "Las noticias enlazan sus fuentes, distinguen hechos confirmados, declaraciones atribuidas y análisis, y conservan la procedencia de la información. Las afirmaciones no verificadas no deben presentarse como hechos.",
        ],
        [
          "Automatización y responsabilidad",
          "Los artículos utilizan la firma editorial de EconoFlux. La página de fuentes y metodología explica el proceso de investigación, redacción y verificación. La publicación automática comprueba duplicados, conserva las fuentes y exige revisión factual y editorial bilingüe. Las noticias sin evidencia accesible suficiente quedan pendientes.",
        ],
        [
          "Correcciones",
          "Las correcciones sustanciales conservan la URL original y muestran una fecha real de modificación y una aclaración cuando corresponde.",
        ],
      ],
    },
    contact: {
      title: "Contacto",
      intro: "Contacto editorial y correcciones.",
      sections: [
        [
          "Cómo contactar",
          "EconoFlux está a cargo de Luis C. Para consultas editoriales, correcciones o solicitudes de privacidad, escribí a luterapps@gmail.com. Incluí la URL del artículo y los hechos o fuentes que deban revisarse.",
        ],
      ],
    },
    ...policyPages.es,
  },
};
