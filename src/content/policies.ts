export type PolicyId =
  "privacy" | "terms" | "cookies" | "legal" | "advertising" | "copyright";
export interface PolicyPage {
  title: string;
  intro: string;
  reviewedAt: string;
  sections: [string, string][];
  links: { label: string; url: string }[];
}
const updated = "2026-11-04";
const adsterraPrivacy = "https://adsterra.com/privacy-policy-managed/";
const googlePrivacy = "https://policies.google.com/privacy";
const googlePartners = "https://policies.google.com/technologies/partner-sites";
const googleAds = "https://myadcenter.google.com/";
const googleCookies = "https://policies.google.com/technologies/cookies";
const argentinaLaw =
  "https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm";
const argentinaRights =
  "https://www.argentina.gob.ar/aaip/datospersonales/derechos";
const cloudflarePrivacy = "https://www.cloudflare.com/privacypolicy/";
export const policyIds: PolicyId[] = [
  "legal",
  "privacy",
  "cookies",
  "terms",
  "advertising",
  "copyright",
];
export const policyPages: Record<"en" | "es", Record<PolicyId, PolicyPage>> = {
  en: {
    legal: {
      title: "Legal notice and publisher information",
      intro: "Who operates EconoFlux and how to contact the publication.",
      reviewedAt: updated,
      sections: [
        [
          "Publisher and contact",
          "EconoFlux.com is operated by Luis C., based in Argentina. Editorial, privacy, advertising and rights inquiries can be sent to luterapps@gmail.com. EconoFlux is a digital publication, not a regulated financial institution or an investment service.",
        ],
        [
          "Purpose of the website",
          "EconoFlux publishes cryptocurrency and digital-finance news and educational Crypto Academy guides in English and Spanish. It provides general information, not brokerage, custody, exchange, portfolio management, personalized recommendations or a place to deposit funds. We do not ask readers for private keys or recovery phrases.",
        ],
        [
          "Authorship and responsibility",
          "Articles use the EconoFlux editorial byline. Research, drafting and factual and bilingual checks use an automated AI-assisted process described in Sources and methodology. No human credentials, professional certification or firsthand reporting are implied. Luis C. is the contact responsible for the publication; automation does not remove the need to address substantiated corrections.",
        ],
        [
          "Separate policies",
          "The Terms of use govern permitted use of the website. The Privacy and Cookies policies explain data processing and advertising technologies. The Financial and educational notice explains risks and the informational scope. Editorial, verification, corrections, advertising and copyright policies provide additional information.",
        ],
        [
          "External services and links",
          "Hosting and protection use Cloudflare. Public official pages include Google AdSense, and articles include Adsterra native, rectangular and vertical banners. Linked reporting sources, advertisers and other external services have their own terms and privacy practices. A reference link, an advertising placement or a provider’s logo does not imply endorsement of an investment or a guarantee of its accuracy or safety.",
        ],
        [
          "Questions and applicable rights",
          "Contact luterapps@gmail.com with the relevant page URL and the nature of your inquiry. EconoFlux operates from Argentina. Argentine personal-data protection is governed by Law 25,326 and its applicable regulations. Nothing in these notices removes mandatory rights or obligations under applicable law, including protections that apply to readers in other countries.",
        ],
      ],
      links: [],
    },
    privacy: {
      title: "Privacy policy",
      intro:
        "How EconoFlux and its service providers handle information when you browse, search or contact us.",
      reviewedAt: updated,
      sections: [
        [
          "Responsible contact and scope",
          "EconoFlux is operated by Luis C., based in Argentina. Contact luterapps@gmail.com for privacy inquiries or rights requests. This policy covers econoflux.com and takes account of Argentine Law 25,326. External publishers, advertisers and services linked from the site are responsible for their own processing under their policies.",
        ],
        [
          "Information processed when browsing",
          "Requests to the website necessarily involve technical information such as IP address, requested URL, date and time, browser and device details and security signals. Cloudflare and other delivery or advertising providers may process this information for their services. Cookies and similar identifiers can be used as described in the Cookies policy. We do not offer public reader accounts, newsletter subscriptions, payment collection or public comment forms.",
        ],
        [
          "Search and contact messages",
          "Search terms are sent to this website’s server to find stored published news and guides. Avoid entering personal or sensitive information in search. If you email us, your address, message and any attachments are processed to answer and document the inquiry. The mailbox uses Gmail, whose provider also processes email according to its policies. Send only information needed for your request, never passwords, identity documents without a justified need, API secrets, private keys or recovery phrases.",
        ],
        [
          "Purposes and applicable legal grounds",
          "Information is used to deliver requested pages and search results, protect the service, answer inquiries, address corrections and rights requests, and support advertising delivery, measurement and fraud prevention. Under Argentine Law 25,326, processing requires informed consent unless a legal exception applies. Other applicable laws may provide different legal grounds. Optional technologies or personalized advertising require consent where applicable; continued browsing alone does not provide that consent. Emailing us is voluntary; without sufficient contact details we may be unable to answer or handle a request.",
        ],
        [
          "Google advertising and previous visits",
          "Third-party vendors, including Google, use cookies to serve ads based on a visitor’s previous visits to this website or other websites. Google’s advertising cookies enable Google and its partners to serve ads based on visits to EconoFlux and/or other sites on the Internet. Advertising can involve IP addresses, browser or device identifiers, approximate location derived from technical data and interactions with ads. The precise technologies and purposes depend on the visitor’s choices, region and the advertising configuration.",
        ],
        [
          "Adsterra native, rectangular and vertical banners in articles",
          "Articles load the Adsterra banners through bauval.org. Loading third-party advertising transmits technical request information, such as IP address and browser details, to the provider. The provider and its partners may also use cookies or similar technologies for advertising and measurement, depending on their configuration and applicable choices. Adsterra is separate from Google; Google advertising controls do not necessarily control Adsterra. Consult Adsterra’s privacy policy below for its practices, contact and available privacy rights.",
        ],
        [
          "Choices about advertising",
          "You can adjust Google personalized advertising through My Ad Center. Third-party advertising choices are also described by the Digital Advertising Alliance and the European Interactive Digital Advertising Alliance. These controls and browser settings have different scopes and do not replace any consent message required for this website. Where a consent message is displayed, use its options to accept, reject or configure optional purposes and to revisit your choices. Refusing personalization does not necessarily remove all advertising or essential security processing.",
        ],
        [
          "Providers, recipients and international processing",
          "Cloudflare provides hosting and security; Google, Adsterra and advertising partners provide advertising services; Google provides the contact mailbox. Providers may act as processors or independent controllers depending on the service. Advertising providers and their purposes are identified through the applicable advertising and consent information. Services can process information outside your country. Where law requires it, appropriate transfer mechanisms and safeguards must apply; consult provider policies and contact us for questions about processing under our responsibility.",
        ],
        [
          "Retention",
          "Contact messages are retained for as long as needed to answer and document the inquiry, manage disputes and comply with applicable obligations. Technical and advertising data retention depends on its purpose, provider, configuration and legal requirements; cookies also have their own lifetimes. Data should be deleted or anonymized when no longer necessary, subject to applicable retention obligations and substantiated claims. Contact us about retention of information relating to you.",
        ],
        [
          "Rights and requests",
          "Under Argentine Law 25,326, you can request access to your personal data, correction, updating and deletion, subject to legal exceptions. Access is free at intervals of at least six months, or sooner where a legitimate interest is demonstrated. The legal response period for access is 10 calendar days from receipt of a duly notified request; correction, updating or deletion must be addressed within five working days under the conditions of Article 16. Email luterapps@gmail.com describing your request and enough information to locate the data. Proportionate identity verification may be needed; do not send unnecessary sensitive documents. Depending on other applicable laws, you may also have rights to object, restrict processing, portability or withdraw consent. Rights relating to a provider’s independent processing can be exercised with that provider.",
        ],
        [
          "Argentine supervisory authority",
          "The Agencia de Acceso a la Información Pública (AAIP), as the supervisory authority for Law 25,326, receives complaints and claims from people whose personal-data protection rights have been affected by noncompliance. Its official rights and complaint guidance is linked below. You can also use any other competent authority or legal remedy available under applicable law.",
        ],
        [
          "Children and sensitive information",
          "The publication is intended for a general audience interested in digital finance and is not directed at children. We do not request sensitive personal information or knowingly solicit personal information from children. If you believe a child has supplied personal data, contact us so that the situation can be assessed and appropriate action taken. This statement is not an age-verification mechanism.",
        ],
        [
          "Security and policy changes",
          "Reasonable technical and organizational protections and provider security measures support the service, but no Internet system can guarantee absolute security. Policy changes are reflected in the text’s update date. A policy update alone does not authorize a new processing purpose that requires separate information or consent.",
        ],
      ],
      links: [
        {
          label: "Argentina: Personal Data Protection Law 25,326",
          url: argentinaLaw,
        },
        {
          label: "AAIP: personal-data rights and complaints",
          url: argentinaRights,
        },
        {
          label: "How Google uses information from partner sites",
          url: googlePartners,
        },
        { label: "Google Privacy Policy", url: googlePrivacy },
        { label: "Google My Ad Center", url: googleAds },
        { label: "Google cookie information", url: googleCookies },
        { label: "Cloudflare Privacy Policy", url: cloudflarePrivacy },
        { label: "Adsterra Privacy Policy", url: adsterraPrivacy },
        {
          label: "Digital Advertising Alliance choices",
          url: "https://optout.aboutads.info/",
        },
        {
          label: "European advertising choices",
          url: "https://www.youronlinechoices.com/",
        },
      ],
    },
    cookies: {
      title: "Cookies and advertising preferences",
      intro:
        "The purposes of cookies and similar technologies, and the controls available to readers.",
      reviewedAt: updated,
      sections: [
        [
          "What these technologies do",
          "Cookies are small values stored by a browser; related technologies can include local storage, pixels and device identifiers. Their purpose, duration and access can differ. Some are necessary for service delivery or security, while others support advertising or optional measurement.",
        ],
        [
          "Necessary delivery and security",
          "Cloudflare may use technical information and security technologies to deliver pages, detect abuse and protect the website. Strictly necessary technologies are distinct from optional advertising purposes. Whether a particular technology is necessary depends on its actual function and the applicable law, not just the label assigned to it.",
        ],
        [
          "Advertising cookies and partners",
          "Official EconoFlux pages include Google AdSense. Google and third-party advertising vendors can use cookies or similar identifiers to select, deliver and measure ads and prevent fraud, including personalized ads based on previous visits to this and other websites. Google explains its technologies and cookie purposes in the links below. Non-personalized advertising may still use cookies or other data for functions such as frequency management, measurement or security; it is not automatically exempt from consent requirements.",
        ],
        [
          "Adsterra banners and technologies",
          "Articles load the Adsterra banners through bauval.org. Loading third-party advertising transmits technical request information, such as IP address and browser details, to the provider. The provider and its partners may also use cookies or similar technologies for advertising and measurement, depending on their configuration and applicable choices. Adsterra is separate from Google; Google advertising controls do not necessarily control Adsterra. Consult Adsterra’s privacy policy below for its practices, contact and available privacy rights.",
        ],
        [
          "Consent and withdrawal",
          "Visiting the site does not itself constitute consent to optional cookies. Where consent is required, it must be obtained through the applicable consent mechanism, with rejection and withdrawal options required by law. Use the advertising privacy message when it is displayed to review purposes, providers and your choices. Withdrawing consent applies to subsequent consent-based processing and does not make earlier lawful processing unlawful.",
        ],
        [
          "Browser and Google controls",
          "Browser settings can block or remove cookies; doing so may remove saved choices or affect features. My Ad Center controls Google personalized advertising for the contexts described there. Industry opt-out services have their own participating providers and scope. Deleting a cookie, rejecting optional purposes and changing advertising settings are different actions; use the relevant control for your purpose.",
        ],
        [
          "Names, lifetimes and regional differences",
          "The exact cookies, providers and lifetimes can vary with region, advertising configuration, whether an ad is delivered and choices made in a consent message. Consult Google’s cookie documentation below and the provider information in any applicable consent message. Browser privacy tools can show cookies stored on your device and their expiry dates. Contact us about a specific cookie or provider you cannot identify.",
        ],
        [
          "Contact and updates",
          "For questions about technologies used by EconoFlux, contact luterapps@gmail.com. The Privacy policy describes the responsible contact, processing and rights. Material changes to optional purposes require the relevant information and consent, rather than being authorized by changing this text alone.",
        ],
      ],
      links: [
        { label: "Google cookie purposes and controls", url: googleCookies },
        { label: "Google My Ad Center", url: googleAds },
        { label: "Google data use on partner sites", url: googlePartners },
        { label: "Cloudflare Privacy Policy", url: cloudflarePrivacy },
        { label: "Adsterra Privacy Policy", url: adsterraPrivacy },
        {
          label: "Digital Advertising Alliance choices",
          url: "https://optout.aboutads.info/",
        },
        {
          label: "European advertising choices",
          url: "https://www.youronlinechoices.com/",
        },
      ],
    },
    terms: {
      title: "Terms of use",
      intro:
        "Conditions for using EconoFlux’s news, educational content and website features.",
      reviewedAt: updated,
      sections: [
        [
          "Operator and scope",
          "EconoFlux.com is operated by Luis C., based in Argentina; contact luterapps@gmail.com. These terms address use of the public website, including news, Crypto Academy, search and sharing features. They do not create a brokerage, advisory, custody or investment-management relationship.",
        ],
        [
          "Informational content and financial risks",
          "Content is general information and education, not personalized financial, investment, legal, tax or cybersecurity advice. Prices may be delayed, sources can change and reports may contain uncertainty. Crypto assets can lose substantial or all value; technical, custody, liquidity, counterparty, protocol and regulatory risks can apply. Seek independent qualified advice where appropriate. No return or result is guaranteed.",
        ],
        [
          "Permitted use and intellectual property",
          "You may browse, link to and share official article URLs and use material as permitted by applicable law or a relevant license. Facts, public-domain material and third-party rights are not claimed as EconoFlux property. Reproducing substantial protected text or illustrations, redistributing the site or representing its content as your own may require authorization. Statutory quotation and other mandatory exceptions remain applicable; attribution alone is not always a license.",
        ],
        [
          "Responsible use",
          "Do not attempt unauthorized access, tamper with content or systems, impersonate the publisher, distribute malware, harvest personal data unlawfully or use automated access in a way that disrupts the service. Legitimate indexing, accessibility uses, linking and other lawful uses are not categorically prohibited. Observe applicable law and proportionate technical access rules.",
        ],
        [
          "Accuracy, automation and corrections",
          "Articles reflect their stated sources and dates. Automated AI-assisted drafting and checking can make mistakes; methodology and verification pages explain the process. Rumors, leaks, analysis and confirmed reporting require different readings. Notify us of a suspected error with its URL and supporting sources. A material correction preserves the original URL and publication date and records a genuine change date where appropriate.",
        ],
        [
          "External links and advertising",
          "Source links, advertisements and external services are provided under their own terms and policies. EconoFlux does not control third-party transactions or guarantee an advertiser’s product, platform, returns or security. An advertisement does not constitute an editorial recommendation. Consult the Advertising policy and evaluate third-party claims independently.",
        ],
        [
          "Availability and responsibility",
          "The site may be updated, temporarily unavailable or contain errors. No uninterrupted availability or specific search ranking is guaranteed. Readers remain responsible for decisions made using general information, subject to mandatory legal protections. Nothing here excludes responsibility that cannot lawfully be excluded, including any applicable protections concerning intentional misconduct, gross negligence or consumer rights.",
        ],
        [
          "Privacy, changes and questions",
          "The Privacy and Cookies policies describe data processing and advertising controls. Terms changes are reflected in the text’s update date and do not retroactively remove mandatory rights. No exclusive court, waiver of statutory rights or compulsory arbitration is imposed by these terms. Contact luterapps@gmail.com for questions or permission requests.",
        ],
      ],
      links: [],
    },
    advertising: {
      title: "Advertising and commercial transparency",
      intro:
        "How advertising is distinguished from EconoFlux’s editorial information.",
      reviewedAt: updated,
      sections: [
        [
          "Advertising on the website",
          "EconoFlux includes Google AdSense and Adsterra native, rectangular and vertical banners, identified as advertising. Ads may appear when the providers deliver them; availability varies. Participation in an advertising program is not a claim that Google endorses EconoFlux, has verified every article or guarantees the safety of an advertised product.",
        ],
        [
          "Editorial independence",
          "Advertising delivery is separate from the sources, factual checks and bilingual editorial process. Ads are not presented as independently verified reporting. The presence or absence of an ad does not establish the truth of a news claim. Corrections are assessed against evidence, not an advertiser’s preference.",
        ],
        [
          "Financial advertising and risk",
          "An ad for a token, exchange, trading service or other financial product is not a personalized recommendation, assurance of legality or promise of return. Assess the provider, terms, authorization and risks independently before interacting. EconoFlux does not receive or hold investment deposits through the website.",
        ],
        [
          "Sponsored and affiliate material",
          "If EconoFlux publishes paid placements, affiliate links or other material with a relevant commercial relationship, that relationship must be disclosed clearly near the material and distinguished from editorial reporting. This is a disclosure policy, not a statement that any specific sponsorship or affiliate agreement currently exists.",
        ],
        [
          "Personalization and privacy",
          "Google and advertising partners can use cookies and information from prior visits to this or other sites, subject to choices and applicable requirements. The Privacy and Cookies policies link to Google’s explanations and advertising controls. Advertising choices must not be inferred from continued browsing alone where consent is required.",
        ],
        [
          "Invalid traffic and complaints",
          "Do not click ads to support the publication or encourage others to do so; clicks must reflect a genuine interest in the advertiser. We do not offer rewards for ad views or clicks. Report a misleading, offensive or suspicious placement to luterapps@gmail.com with the page URL and a description; do not click an ad just to obtain evidence. Google’s ad controls can also provide reporting options.",
        ],
      ],
      links: [
        { label: "Google advertising controls", url: googleAds },
        { label: "Google information for partner sites", url: googlePartners },
      ],
    },
    copyright: {
      title: "Copyright, attribution and content requests",
      intro:
        "Use of original materials, third-party sources and requests concerning rights.",
      reviewedAt: updated,
      sections: [
        [
          "Text, sources and illustrations",
          "EconoFlux prepares original news and educational materials with source links and AI assistance. Illustrations can be original conceptual assets or third-party material with recorded usage rights and attribution. Conceptual illustrations do not document an actual event. Credits and any specific license accompanying an asset take precedence over a general assumption about its use.",
        ],
        [
          "Limits of rights claimed",
          "Copyright or other rights may apply to protected text, selection, design and images where recognized by law. EconoFlux does not claim exclusive rights in facts, public-domain materials, third-party trademarks or source documents. Protection for AI-assisted material depends on the applicable law and the contribution involved; no blanket claim of registration or exclusive copyright is made.",
        ],
        [
          "Sharing and reuse",
          "Sharing official article links is welcome. For reuse of substantial protected material or images without an applicable license or statutory exception, request permission at luterapps@gmail.com. A source citation or attribution is not necessarily permission to copy. Do not remove a required credit or imply that a third party or EconoFlux endorses your use.",
        ],
        [
          "Reporting a rights concern",
          "Send the exact EconoFlux URL, the specific material concerned, a description of your rights or authority to act, supporting information and a contact address. Provide only necessary personal information. We assess sufficiently specific claims and can seek clarification, correct attribution, restrict material or remove it as appropriate. Submitting a claim does not by itself establish ownership or require removal of lawful uses.",
        ],
        [
          "Applicable procedures and contact",
          "These instructions provide an editorial contact route for permissions, attribution and correction inquiries at luterapps@gmail.com. They do not limit any mandatory rights, statutory notices, remedies or procedures available under applicable law.",
        ],
      ],
      links: [],
    },
  },
  es: {
    legal: {
      title: "Aviso legal e identificación del editor",
      intro: "Quién opera EconoFlux y cómo contactar con el medio.",
      reviewedAt: updated,
      sections: [
        [
          "Responsable y contacto",
          "EconoFlux.com está operado por Luis C., establecido en Argentina. Las consultas editoriales, de privacidad, publicidad o derechos se atienden en luterapps@gmail.com. EconoFlux es una publicación digital, no una entidad financiera regulada ni un servicio de inversión.",
        ],
        [
          "Finalidad del sitio",
          "EconoFlux publica noticias sobre criptomonedas y finanzas digitales y guías educativas de Academia Crypto en español e inglés. Ofrece información general, no intermediación, custodia, compraventa, gestión de carteras, recomendaciones personalizadas ni un lugar donde depositar fondos. No solicitamos claves privadas ni frases de recuperación a los lectores.",
        ],
        [
          "Autoría y responsabilidad",
          "Los artículos utilizan la firma editorial de EconoFlux. La investigación, redacción y comprobaciones factual y bilingüe emplean un proceso automatizado con asistencia de IA, descrito en Fuentes y metodología. No se atribuyen credenciales humanas, certificaciones profesionales ni cobertura presencial inexistentes. Luis C. es el contacto responsable del medio; la automatización no elimina la necesidad de atender correcciones fundamentadas.",
        ],
        [
          "Políticas complementarias",
          "Las Condiciones de uso regulan la utilización del sitio. Las políticas de Privacidad y Cookies explican los tratamientos y las tecnologías publicitarias. El Aviso educativo e informativo desarrolla los riesgos y el alcance de la información. Las páginas editoriales, de verificación, correcciones, publicidad y derechos de autor aportan información adicional.",
        ],
        [
          "Servicios y enlaces externos",
          "Cloudflare proporciona alojamiento y protección. Las páginas oficiales incluyen Google AdSense y los artículos incorporan banners nativos, rectangulares y verticales de Adsterra. Las fuentes enlazadas, anunciantes y servicios externos tienen sus propias condiciones y prácticas de privacidad. Un enlace, un anuncio o el logotipo de un proveedor no implican respaldo de una inversión ni garantía de exactitud o seguridad.",
        ],
        [
          "Consultas y derechos aplicables",
          "Para consultas, escribe a luterapps@gmail.com indicando la URL y el motivo. EconoFlux opera desde Argentina, donde la protección de datos personales se rige por la Ley 25.326 y su normativa aplicable. Estos avisos no eliminan derechos ni obligaciones imperativos, incluidas las protecciones que correspondan a lectores de otros países.",
        ],
      ],
      links: [],
    },
    privacy: {
      title: "Política de privacidad",
      intro:
        "Cómo tratan EconoFlux y sus proveedores la información cuando navegas, buscas o contactas con el medio.",
      reviewedAt: updated,
      sections: [
        [
          "Responsable, contacto y alcance",
          "EconoFlux está operado por Luis C., establecido en Argentina. Escribe a luterapps@gmail.com para consultas de privacidad o solicitudes de derechos. Esta política se aplica a econoflux.com y tiene en cuenta la Ley argentina 25.326. Los medios, anunciantes y servicios externos enlazados son responsables de sus propios tratamientos conforme a sus políticas.",
        ],
        [
          "Información tratada durante la navegación",
          "Las solicitudes a la web implican información técnica, como dirección IP, URL solicitada, fecha y hora, características del navegador y dispositivo y señales de seguridad. Cloudflare y los proveedores de entrega o publicidad pueden tratar esos datos para sus servicios. Pueden utilizarse cookies e identificadores similares según la Política de cookies. No ofrecemos cuentas públicas de lectores, suscripciones a boletines, cobro de pagos ni formularios públicos de comentarios.",
        ],
        [
          "Búsquedas y mensajes de contacto",
          "Los términos de búsqueda se envían al servidor del sitio para localizar noticias y guías publicadas. Evita introducir datos personales o sensibles en el buscador. Si nos escribes, tratamos la dirección de correo, el mensaje y sus adjuntos para atender y documentar la consulta. El buzón utiliza Gmail, cuyo proveedor trata el correo conforme a sus políticas. Envía solo lo necesario: nunca contraseñas, documentos de identidad sin una necesidad justificada, secretos de API, claves privadas ni frases de recuperación.",
        ],
        [
          "Finalidades y bases aplicables",
          "La información se utiliza para entregar páginas y resultados solicitados, proteger el servicio, atender consultas, tramitar correcciones y derechos y apoyar la entrega y medición publicitaria y la prevención del fraude. Conforme a la Ley argentina 25.326, se requiere consentimiento informado salvo que exista una excepción legal. Otras legislaciones aplicables pueden prever bases diferentes. Las tecnologías opcionales o la publicidad personalizada requieren consentimiento cuando corresponda; seguir navegando no lo proporciona por sí solo. Escribirnos es voluntario; sin datos de contacto suficientes puede resultar imposible responder o tramitar una solicitud.",
        ],
        [
          "Publicidad de Google y visitas anteriores",
          "Los proveedores de terceros, incluido Google, utilizan cookies para mostrar anuncios basados en visitas anteriores del usuario a este sitio o a otros sitios. Las cookies publicitarias permiten que Google y sus socios muestren anuncios basados en visitas a EconoFlux y/o a otros sitios de Internet. La publicidad puede implicar direcciones IP, identificadores de navegador o dispositivo, ubicación aproximada derivada de datos técnicos e interacciones con anuncios. Las tecnologías y finalidades concretas dependen de las elecciones del visitante, la región y la configuración publicitaria.",
        ],
        [
          "Banners nativos de Adsterra en artículos",
          "Los artículos cargan los banners nativos, rectangulares y verticales de Adsterra mediante bauval.org. La carga de publicidad de terceros transmite al proveedor información técnica de la solicitud, como dirección IP y datos del navegador. El proveedor y sus socios también pueden utilizar cookies o tecnologías similares para publicidad y medición, según su configuración y las elecciones aplicables. Adsterra es independiente de Google: los controles publicitarios de Google no gestionan necesariamente Adsterra. Consulta abajo su política de privacidad para conocer sus prácticas, contacto y derechos disponibles.",
        ],
        [
          "Opciones sobre publicidad",
          "Puedes ajustar la publicidad personalizada de Google en Mi centro de anuncios. La Digital Advertising Alliance y la European Interactive Digital Advertising Alliance también explican opciones para otros proveedores. Esos controles y la configuración del navegador tienen alcances diferentes y no sustituyen el mensaje de consentimiento que corresponda en este sitio. Cuando se muestre un mensaje, utiliza sus opciones para aceptar, rechazar o configurar finalidades opcionales y revisar tus decisiones. Rechazar la personalización no elimina necesariamente toda la publicidad ni los tratamientos esenciales de seguridad.",
        ],
        [
          "Proveedores, destinatarios y tratamiento internacional",
          "Cloudflare presta alojamiento y seguridad; Google, Adsterra y sus socios publicitarios prestan servicios de publicidad; Google proporciona el buzón de contacto. Según el servicio, los proveedores pueden actuar como encargados o responsables independientes. Los proveedores publicitarios y sus finalidades se identifican mediante la información publicitaria y de consentimiento aplicable. Los servicios pueden tratar datos fuera de tu país. Cuando la ley lo exija, deberán aplicarse mecanismos y garantías adecuados de transferencia; consulta las políticas de los proveedores y contacta para cuestiones bajo nuestra responsabilidad.",
        ],
        [
          "Conservación",
          "Los mensajes se conservan mientras sea necesario para atender y documentar la consulta, gestionar reclamaciones y cumplir las obligaciones aplicables. La conservación de datos técnicos y publicitarios depende de su finalidad, proveedor, configuración y requisitos legales; las cookies también tienen sus propios plazos. Los datos deben eliminarse o anonimizarse cuando dejen de ser necesarios, sin perjuicio de obligaciones de conservación y reclamaciones fundamentadas. Puedes consultar la conservación de información relativa a ti.",
        ],
        [
          "Derechos y solicitudes",
          "La Ley argentina 25.326 reconoce los derechos de acceso, rectificación, actualización y supresión, sujetos a las excepciones legales. El acceso es gratuito a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo para solicitarlo antes. El plazo legal para responder al acceso es de diez días corridos desde la recepción de una solicitud fehaciente; la rectificación, actualización o supresión debe atenderse en cinco días hábiles bajo las condiciones del artículo 16. Escribe a luterapps@gmail.com describiendo tu solicitud y facilitando información suficiente para localizar los datos. Puede requerirse una comprobación proporcionada de identidad; no envíes documentación sensible innecesaria. Otras normas aplicables pueden reconocer oposición, limitación, portabilidad o retirada del consentimiento. Los derechos sobre tratamientos independientes de un proveedor pueden ejercerse ante él.",
        ],
        [
          "Autoridad de control en Argentina",
          "La Agencia de Acceso a la Información Pública (AAIP), como órgano de control de la Ley 25.326, tiene la atribución de atender denuncias y reclamos de quienes resulten afectados en sus derechos por incumplimientos en materia de protección de datos personales. Enlazamos abajo su información oficial sobre derechos y reclamaciones. Se mantienen las demás autoridades y vías legales que correspondan según la normativa aplicable.",
        ],
        [
          "Menores e información sensible",
          "La publicación se dirige al público general interesado en finanzas digitales y no está orientada a menores. No solicitamos datos sensibles ni recabamos deliberadamente información personal de menores. Si crees que un menor ha facilitado datos, contacta para valorar la situación y adoptar las medidas oportunas. Esta declaración no constituye un sistema de verificación de edad.",
        ],
        [
          "Seguridad y cambios de política",
          "El servicio utiliza medidas técnicas y organizativas razonables y la seguridad de sus proveedores, sin que pueda garantizarse seguridad absoluta en Internet. Las modificaciones se reflejan en la fecha de actualización del texto. Cambiar esta política no autoriza por sí mismo una nueva finalidad que requiera información o consentimiento separados.",
        ],
      ],
      links: [
        {
          label: "Argentina: Ley 25.326 de Protección de Datos Personales",
          url: argentinaLaw,
        },
        {
          label: "AAIP: derechos y reclamaciones sobre datos personales",
          url: argentinaRights,
        },
        {
          label: "Cómo utiliza Google la información de sitios asociados",
          url: googlePartners,
        },
        { label: "Política de privacidad de Google", url: googlePrivacy },
        { label: "Mi centro de anuncios de Google", url: googleAds },
        { label: "Información de Google sobre cookies", url: googleCookies },
        {
          label: "Política de privacidad de Cloudflare",
          url: cloudflarePrivacy,
        },
        { label: "Política de privacidad de Adsterra", url: adsterraPrivacy },
        {
          label: "Opciones de la Digital Advertising Alliance",
          url: "https://optout.aboutads.info/",
        },
        {
          label: "Opciones publicitarias en Europa",
          url: "https://www.youronlinechoices.com/",
        },
      ],
    },
    cookies: {
      title: "Política de cookies y preferencias publicitarias",
      intro:
        "Finalidades de las cookies y tecnologías similares y controles disponibles para los lectores.",
      reviewedAt: updated,
      sections: [
        [
          "Qué hacen estas tecnologías",
          "Las cookies son pequeños valores que guarda el navegador; las tecnologías relacionadas pueden incluir almacenamiento local, píxeles e identificadores de dispositivo. Sus finalidades, duración y acceso pueden ser distintos. Algunas son necesarias para prestar el servicio o protegerlo y otras apoyan publicidad o medición opcional.",
        ],
        [
          "Entrega y seguridad necesarias",
          "Cloudflare puede utilizar información técnica y tecnologías de seguridad para entregar páginas, detectar abuso y proteger la web. Las tecnologías estrictamente necesarias se distinguen de las finalidades publicitarias opcionales. Que una tecnología sea necesaria depende de su función real y de la legislación, no únicamente de la etiqueta que se le asigne.",
        ],
        [
          "Cookies publicitarias y socios",
          "Las páginas oficiales de EconoFlux incluyen Google AdSense. Google y proveedores publicitarios de terceros pueden utilizar cookies o identificadores similares para seleccionar, entregar y medir anuncios y prevenir fraude, incluida publicidad personalizada según visitas anteriores a este y otros sitios. Google explica sus tecnologías y finalidades en los enlaces inferiores. Los anuncios no personalizados también pueden utilizar cookies u otros datos para limitar frecuencia, medir o proteger el servicio; no quedan automáticamente exentos de los requisitos de consentimiento.",
        ],
        [
          "Banners y tecnologías de Adsterra",
          "Los artículos cargan los banners nativos, rectangulares y verticales de Adsterra mediante bauval.org. La carga de publicidad de terceros transmite al proveedor información técnica de la solicitud, como dirección IP y datos del navegador. El proveedor y sus socios también pueden utilizar cookies o tecnologías similares para publicidad y medición, según su configuración y las elecciones aplicables. Adsterra es independiente de Google: los controles publicitarios de Google no gestionan necesariamente Adsterra. Consulta abajo su política de privacidad para conocer sus prácticas, contacto y derechos disponibles.",
        ],
        [
          "Consentimiento y retirada",
          "Visitar el sitio no equivale por sí mismo a consentir cookies opcionales. Cuando se requiera consentimiento, deberá obtenerse mediante el mecanismo aplicable, con las opciones de rechazo y retirada exigibles. Utiliza el mensaje de privacidad publicitaria cuando se muestre para revisar finalidades, proveedores y elecciones. Retirar el consentimiento se aplica a los tratamientos posteriores basados en él y no convierte en ilícitos los tratamientos anteriores que fueran legales.",
        ],
        [
          "Controles del navegador y de Google",
          "El navegador permite bloquear o eliminar cookies; hacerlo puede borrar preferencias o afectar a funciones. Mi centro de anuncios controla la personalización de Google en los contextos que explica ese servicio. Las herramientas sectoriales de exclusión tienen sus propios proveedores y alcance. Borrar una cookie, rechazar finalidades opcionales y cambiar preferencias publicitarias son acciones diferentes; utiliza el control pertinente para tu finalidad.",
        ],
        [
          "Nombres, duración y diferencias regionales",
          "Las cookies, proveedores y plazos concretos pueden variar según la región, configuración publicitaria, entrega de anuncios y elecciones en un mensaje de consentimiento. Consulta la documentación de cookies de Google enlazada abajo y la información de proveedores de cualquier mensaje de consentimiento aplicable. Las herramientas de privacidad del navegador permiten consultar las cookies guardadas y sus fechas de caducidad. Escríbenos si no puedes identificar una cookie o proveedor concreto.",
        ],
        [
          "Contacto y actualizaciones",
          "Para consultas sobre tecnologías utilizadas por EconoFlux, escribe a luterapps@gmail.com. La Política de privacidad explica el responsable, tratamientos y derechos. Los cambios sustanciales de finalidades opcionales requieren la información y el consentimiento pertinentes; no se autorizan únicamente modificando este texto.",
        ],
      ],
      links: [
        {
          label: "Finalidades y controles de cookies de Google",
          url: googleCookies,
        },
        { label: "Mi centro de anuncios de Google", url: googleAds },
        {
          label: "Uso de datos de Google en sitios asociados",
          url: googlePartners,
        },
        {
          label: "Política de privacidad de Cloudflare",
          url: cloudflarePrivacy,
        },
        { label: "Política de privacidad de Adsterra", url: adsterraPrivacy },
        {
          label: "Opciones de la Digital Advertising Alliance",
          url: "https://optout.aboutads.info/",
        },
        {
          label: "Opciones publicitarias en Europa",
          url: "https://www.youronlinechoices.com/",
        },
      ],
    },
    terms: {
      title: "Condiciones de uso",
      intro:
        "Condiciones para utilizar las noticias, contenidos educativos y funciones de EconoFlux.",
      reviewedAt: updated,
      sections: [
        [
          "Responsable y alcance",
          "EconoFlux.com está operado por Luis C., establecido en Argentina; el contacto es luterapps@gmail.com. Estas condiciones se refieren a la web pública, incluidas noticias, Academia Crypto, búsquedas y funciones para compartir. No crean una relación de intermediación, asesoramiento, custodia ni gestión de inversiones.",
        ],
        [
          "Información y riesgos financieros",
          "El contenido es información y educación generales, no asesoramiento financiero, de inversión, legal, fiscal o de ciberseguridad personalizado. Las cotizaciones pueden tener retraso, las fuentes pueden cambiar y los reportes pueden contener incertidumbres. Los criptoactivos pueden perder una parte sustancial o todo su valor; existen riesgos técnicos, de custodia, liquidez, contraparte, protocolo y regulación. Acude a profesionales independientes cualificados cuando corresponda. No se garantiza rentabilidad ni resultado alguno.",
        ],
        [
          "Uso permitido y propiedad intelectual",
          "Puedes navegar, enlazar y compartir las URLs oficiales y utilizar material según permita la ley o su licencia. No se reivindican como propiedad de EconoFlux los hechos, el dominio público ni los derechos de terceros. Reproducir material protegido sustancial o ilustraciones, redistribuir la web o presentar su contenido como propio puede requerir autorización. Se mantienen los límites legales de cita y otras excepciones imperativas; atribuir no equivale siempre a disponer de una licencia.",
        ],
        [
          "Uso responsable",
          "No intentes accesos no autorizados, manipules contenidos o sistemas, suplantes al editor, distribuyas código malicioso, obtengas datos personales ilícitamente ni utilices accesos automatizados que perturben el servicio. No se prohíben de forma general la indexación legítima, los usos de accesibilidad, los enlaces ni otros usos legales. Respeta la normativa y las reglas técnicas de acceso proporcionadas.",
        ],
        [
          "Exactitud, automatización y correcciones",
          "Los artículos reflejan las fuentes y fechas indicadas. La redacción y los controles con asistencia de IA pueden equivocarse; las páginas de metodología y verificación explican el proceso. Los rumores, filtraciones, análisis y noticias confirmadas deben interpretarse conforme a su naturaleza. Comunica posibles errores con la URL y las fuentes que los respalden. Una corrección sustancial conserva URL y fecha de publicación y registra la fecha real del cambio cuando procede.",
        ],
        [
          "Enlaces y publicidad externos",
          "Las fuentes, anuncios y servicios externos se ofrecen bajo sus propias condiciones y políticas. EconoFlux no controla sus transacciones ni garantiza productos, plataformas, rentabilidad o seguridad de un anunciante. Un anuncio no constituye recomendación editorial. Consulta la Política de publicidad y contrasta por tu cuenta las afirmaciones de terceros.",
        ],
        [
          "Disponibilidad y responsabilidad",
          "La web puede actualizarse, sufrir interrupciones o contener errores. No se garantiza disponibilidad ininterrumpida ni posiciones determinadas en buscadores. Los lectores responden de sus decisiones basadas en información general, sin perjuicio de las protecciones legales imperativas. Estas condiciones no excluyen responsabilidades que no puedan limitarse legalmente, incluidas las protecciones aplicables frente a dolo, negligencia grave o en materia de consumo.",
        ],
        [
          "Privacidad, cambios y consultas",
          "Las políticas de Privacidad y Cookies explican tratamientos y controles publicitarios. Los cambios de estas condiciones se reflejan en su fecha y no eliminan retroactivamente derechos imperativos. No se impone un fuero exclusivo, renuncia a derechos legales ni arbitraje obligatorio. Escribe a luterapps@gmail.com para consultas o solicitudes de permiso.",
        ],
      ],
      links: [],
    },
    advertising: {
      title: "Política de publicidad y transparencia comercial",
      intro:
        "Cómo se distingue la publicidad de la información editorial de EconoFlux.",
      reviewedAt: updated,
      sections: [
        [
          "Publicidad en la web",
          "EconoFlux incluye Google AdSense y banners nativos, rectangulares y verticales de Adsterra, identificados como publicidad. Los anuncios pueden aparecer cuando los proveedores los entreguen; su disponibilidad varía. Participar en un programa publicitario no significa que Google respalde EconoFlux, haya verificado todos los artículos ni garantice la seguridad de los productos anunciados.",
        ],
        [
          "Independencia editorial",
          "La entrega publicitaria es independiente de las fuentes, controles de hechos y proceso editorial bilingüe. Los anuncios no se presentan como información periodística verificada de forma independiente. La presencia o ausencia de publicidad no demuestra que una noticia sea cierta. Las correcciones se valoran por las pruebas, no por la preferencia de un anunciante.",
        ],
        [
          "Publicidad financiera y riesgos",
          "Un anuncio sobre tokens, exchanges, trading u otros productos financieros no constituye recomendación personalizada, garantía de legalidad ni promesa de rentabilidad. Contrasta por tu cuenta proveedor, condiciones, autorización y riesgos antes de interactuar. EconoFlux no recibe ni custodia depósitos de inversión mediante la web.",
        ],
        [
          "Contenido patrocinado y afiliación",
          "Si EconoFlux publica material pagado, enlaces de afiliación u otro contenido con una relación comercial relevante, esa relación deberá identificarse claramente cerca del contenido y diferenciarse de la información editorial. Esta es una política de divulgación, no una afirmación de que exista un patrocinio o acuerdo de afiliación concreto en la actualidad.",
        ],
        [
          "Personalización y privacidad",
          "Google y sus socios publicitarios pueden utilizar cookies e información de visitas anteriores a este y otros sitios, sujetos a las elecciones y requisitos aplicables. Las políticas de Privacidad y Cookies enlazan explicaciones y controles de Google. Donde se exija consentimiento, seguir navegando no permite presumir preferencias publicitarias.",
        ],
        [
          "Tráfico no válido y reclamaciones",
          "No pulses anuncios para apoyar al medio ni animes a otras personas a hacerlo: cada clic debe responder a un interés real por el anunciante. No ofrecemos premios por ver o pulsar anuncios. Comunica publicidad engañosa, ofensiva o sospechosa a luterapps@gmail.com con la URL y una descripción; no pulses un anuncio únicamente para obtener pruebas. Los controles de Google también pueden ofrecer opciones para denunciarlo.",
        ],
      ],
      links: [
        { label: "Controles publicitarios de Google", url: googleAds },
        {
          label: "Información de Google para sitios asociados",
          url: googlePartners,
        },
      ],
    },
    copyright: {
      title: "Derechos de autor, atribución y solicitudes",
      intro:
        "Uso de materiales originales, fuentes de terceros y comunicación de cuestiones de derechos.",
      reviewedAt: updated,
      sections: [
        [
          "Textos, fuentes e ilustraciones",
          "EconoFlux prepara noticias y materiales educativos originales con enlaces a fuentes y asistencia de IA. Las ilustraciones pueden ser recursos conceptuales originales o materiales de terceros con derechos de uso y atribución registrados. Las ilustraciones conceptuales no documentan un acontecimiento real. Los créditos y la licencia que acompañen un recurso prevalecen sobre las suposiciones generales sobre su utilización.",
        ],
        [
          "Alcance de los derechos reivindicados",
          "Pueden existir derechos sobre textos protegidos, selección, diseño e imágenes cuando la ley los reconozca. EconoFlux no reivindica exclusividad sobre hechos, dominio público, marcas de terceros ni documentos fuente. La protección de material asistido por IA depende de la legislación y la aportación realizada; no se afirma de forma general que esté registrado o sujeto a derechos exclusivos.",
        ],
        [
          "Compartir y reutilizar",
          "Se pueden compartir las URLs oficiales. Para reutilizar material protegido sustancial o imágenes sin una licencia o excepción legal aplicable, solicita permiso en luterapps@gmail.com. Citar o atribuir no equivale necesariamente a tener autorización para copiar. No retires créditos obligatorios ni insinúes respaldo de terceros o de EconoFlux a tu utilización.",
        ],
        [
          "Comunicar una cuestión de derechos",
          "Envía la URL exacta de EconoFlux, el material concreto, una descripción de tus derechos o de tu autorización para actuar, información que lo respalde y una dirección de contacto. Facilita solo los datos personales necesarios. Valoraremos reclamaciones suficientemente identificadas y podremos pedir aclaraciones, corregir atribuciones, limitar material o retirarlo cuando proceda. Presentar una solicitud no demuestra por sí mismo titularidad ni obliga a retirar usos lícitos.",
        ],
        [
          "Procedimientos aplicables y contacto",
          "Estas instrucciones ofrecen una vía de contacto editorial para permisos, atribución y correcciones en luterapps@gmail.com. No limitan derechos imperativos, notificaciones legales, recursos ni procedimientos previstos por la normativa aplicable.",
        ],
      ],
      links: [],
    },
  },
};
