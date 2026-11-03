# EconoFlux: SEO técnico y Google News

Implementación del 3 de noviembre de 2026. Esta guía complementa la operación
editorial existente; no modifica frecuencias, límites de gasto, anuncios ni URLs.

## Problemas encontrados y correcciones

- No existía un sitemap específico de noticias. `/news-sitemap.xml` consulta D1
  desde el servidor y exporta únicamente revisiones públicas bilingües completas,
  con fecha original de publicación dentro de las últimas 48 horas. Excluye
  borradores, demostraciones, contenido oculto, fechas futuras y Academia. Cada
  versión tiene su URL, título, idioma y fecha reales; el nombre es EconoFlux.
  Una actualización no vuelve reciente una noticia antigua. El máximo es de
  1.000 URLs por archivo, según Google, sin limitar publicaciones ni eliminar
  artículos del sitemap general. La configuración editorial vigente admite
  muchas menos de 1.000 páginas de noticias en cualquier ventana de 48 horas.
- El canonical y el idioma alternativo de las categorías paginadas apuntaban a
  la primera página. Cada página histórica ahora tiene canonical propio, title
  localizado y alternancias recíprocas que conservan el número de página.
  Los enlaces anteriores/siguientes son HTML y usan el recuento real; una página
  fuera del archivo devuelve 404. Esto también se aplica a rumores y Academia.
- La mayoría de las noticias carecía de sugerencias contextuales guardadas. Se
  conservan las sugerencias válidas y se buscan otras noticias públicas del mismo
  tema o con etiquetas compartidas. No hay llamadas nuevas a IA ni enlaces
  inventados. La selección se realiza por idioma y recupera revisiones bilingües
  completas. Portada, categorías, archivos y guías mantienen enlaces rastreables.
- El sitemap general hacía búsquedas de traducción sobre listas completas. Ahora
  usa joins por traducción/revisión y consultas indexadas. Por encima de 5.000
  URLs cambia automáticamente a un índice que divide páginas, noticias históricas
  y guías en archivos de hasta 5.000 URLs. Es un tamaño de archivo, no un cupo
  editorial. Nunca cambia las URLs del contenido ni descarta el archivo antiguo.
- El marcado de noticias incorpora `NewsArticle`, acceso gratuito, idioma,
  sección, fechas reales, fuentes, imagen y atribución a la organización.
  Academia usa `Article`. Se añaden `BreadcrumbList`, `Organization` y `WebSite`
  donde corresponde. No se inventan personas ni revisiones humanas.
- El JSON-LD se serializa escapando los signos `<` sin alterar el texto original.
  Las noticias que son análisis o última hora se distinguen visiblemente.
  La fecha/hora visible usa UTC, como la metodología pública del medio; solo
  aparece una fecha de actualización cuando hay una revisión registrada.
- Las páginas públicas permiten `max-image-preview:large`. Las imágenes de
  artículos y las tarjetas sociales conservan su procedencia y sus URLs HTTPS.
- La portada móvil dispone de la misma ilustración en un WebP derivado de 768 px:
  64.432 bytes frente a los 187.784 de la versión de 1536 px. El navegador elige
  mediante srcset; no se cambia el diseño 3D. Las imágenes secundarias conservan
  carga diferida y reservan dimensiones. No se elimina ni se bloquea AdSense.

## Lo que ya funcionaba y se conserva

El HTML completo y sus metadatos se generan en Pages Functions a partir de D1.
Los lectores y rastreadores no necesitan JavaScript para descubrir el contenido.
Cada idioma conserva su canonical; las traducciones no se canonicalizan entre sí.
Existen páginas EN/ES de Sobre EconoFlux, política editorial, verificación,
metodología, contacto y correcciones. Identifican al editor y el correo público
real, explican la asistencia de IA y sus limitaciones sin fingir credenciales.
Las guías enlazan noticias pertinentes y se mantienen las fuentes originales.

La raíz `/` responde 302 hacia `/es/` o `/en/` según las preferencias de
`Accept-Language` del navegador; usa inglés cuando no hay un idioma compatible.
La respuesta varía por idioma y no se almacena en caché. Las URLs explícitas y
el selector EN/ES conservan su prioridad; no se redirigen artículos según el
navegador. El aviso «Página con redirección» en Search Console para esa raíz es
normal y no describe el estado del destino. HTTP, www y
el alias estable pages.dev conservan la redirección al dominio HTTPS oficial.
Errores, búsquedas, APIs privadas y borradores de despliegue permanecen noindex.

## Rutas y actualización automática

- General: https://econoflux.com/sitemap.xml
- Noticias recientes: https://econoflux.com/news-sitemap.xml
- Robots: https://econoflux.com/robots.txt (anuncia ambos sitemaps).
- Partes del archivo: `/sitemaps/pages-1.xml`, `/sitemaps/articles-1.xml`,
  `/sitemaps/guides-1.xml`; los números sucesivos aparecen al crecer el índice.
- Noticias EN/ES: `/{lang}/articles/{slug}/`, con las URLs existentes.
- Archivo: `/{lang}/category/news/?page=2` y sucesivas cuando existan artículos.
- Academia: `/en/academy/` y `/es/academia/`.
- SEO privado de solo lectura:
  https://econoflux-editorial.luiscazorla97.workers.dev/admin/seo

Los sitemaps se generan al solicitarlos y usan `Cache-Control: no-store`. No
requieren recompilación, llamadas a proveedores ni otro cron. La cabecera
`X-Sitemap-Generated-At` indica cuándo se generó la respuesta; no se usa como
lastmod de los artículos. En el XML solo figuran fechas persistidas de contenido.
Cada publicación atómica EN/ES pasa a las consultas de portada, categorías,
metadatos y sitemaps; al cumplir 48 horas sale del feed News, pero sigue pública.

## Diagnóstico privado y operación

La migración aditiva `0013_seo_discovery.sql` crea índices de lectura y la tabla
privada `seo_http_observations`. No modifica datos editoriales ni configuración.
`0014_archive_read_index.sql` añade un índice para idioma, estado y fecha. Las
consultas de noticias y guías evitan agrupar todo el archivo cuando el idioma ya
identifica una fila por traducción; mantienen la agrupación al buscar en ambos
idiomas. La paginación conserva todos sus resultados.
La vista SEO usa el Access existente restringido al administrador. Permite
únicamente GET; no reabre los formularios de publicación ni cambia
`ADMIN_DISABLED`. `/api/seo` devuelve recuentos reales, publicaciones del día
America/New_York y de siete días, metadatos faltantes, enlaces contextuales,
duplicados, elegibilidad News y comprobaciones HTTPS de ambos sitemaps.

Los resultados HTTP tienen URL y fecha de observación. Son una auditoría fechada,
no una afirmación de vigilancia continua ni de que una URL esté en Google.
El estado de indexación se declara **no verificado** mientras no exista una
conexión autenticada a Search Console. La vista privada no solicita APIs de pago.

Para repetir la auditoría pública, sin credenciales ni llamadas a proveedores:

```bash
python scripts/server/seo_audit.py --output .local/seo/audit.json
```

Comprueba XML, fechas, respuestas, canonical, hreflang recíprocos, JSON-LD,
AdSense y navegación HTML hasta las páginas históricas. Detecta publicaciones
huérfanas siguiendo enlaces desde las portadas, no solo el sitemap.

Validación local:

```bash
npm run check:editorial
npm run check
npm run test:editorial
npm run build:production
npm run test:dynamic
```

Los fixtures locales prueban publicación normal y extraordinaria, cron, D1,
dedupe, presupuestos, fuentes, traducciones, imágenes y Access. Las pruebas SEO
incluyen expiración de 48 horas, borradores y fechas futuras, 1.000 entradas,
partición de archivos, enlaces históricos y paneles de escritorio/móvil.
No se publican fixtures ni noticias de prueba en producción.

## Rendimiento y límites de verificación

La medición inicial de Lighthouse móvil de la portada española obtuvo rendimiento
91, accesibilidad 100, buenas prácticas 100 y SEO 100; LCP simulado 3,09 s, CLS 0
y TBT 174,5 ms. Es una medición de laboratorio con publicidad habilitada, no datos
reales de todos los usuarios ni una predicción de posicionamiento.

El endpoint público de PageSpeed respondió HTTP 429 en esta sesión. Por tanto,
no se verificaron datos de campo CrUX/INP ni se afirma haber superado Core Web
Vitals para el conjunto de visitantes. Las mediciones posteriores al despliegue
se registran en el informe de validación; pueden variar con la red y los anuncios.

## Acciones dentro de Google

1. En la propiedad correcta de Search Console, comprobar/enviar
   `https://econoflux.com/sitemap.xml` y
   `https://econoflux.com/news-sitemap.xml`. Revisar su estado de lectura.
2. Inspeccionar directamente `/en/`, `/es/` y alguna URL canónica de noticia.
   Ejecutar «Probar URL publicada» y, si procede, «Solicitar indexación».
3. Revisar dentro de la cuenta los informes de páginas, acciones manuales y
   seguridad. Su estado no se puede inferir de una prueba HTTP externa.

Este entorno no tiene una sesión autenticada de Google. No se afirma haber
completado esos envíos ni haber obtenido inclusión en Google News. No se usa
Google Indexing API para noticias convencionales, pings obsoletos ni servicios
artificiales de indexación. Los sitemaps y el marcado facilitan descubrimiento;
Google decide la indexación y la aparición en sus productos.

Documentación oficial consultada:

- https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading
- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
