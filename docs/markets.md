# Mercados: tres ediciones diarias independientes

Autorizado por el titular el 4 de noviembre de 2026. Se añaden ediciones de datos de mercado a la web y al Worker existentes; no se sustituyen ni modifican los cupos de noticias o Academia.

## Publicación y horarios

- Tres ediciones por fecha de **America/New_York**, a las **09:00, 15:00 y 21:00**, con cálculo de horario de verano. Ambas traducciones cuentan como una edición.
- El día de activación: primera edición al activar y otras dos separadas normalmente dos horas, dentro del mismo día local. Si la activación es demasiado tardía o no existen datos frescos y diferentes, no se fuerza el cupo. La separación mínima es de 90 minutos y no se acumulan ediciones de fechas vencidas.
- Se utiliza el único cron de un minuto del Worker `econoflux-editorial`. Se añade una tarea con un bloqueo propio; se conservan las llamadas a noticias, Academia, cotizaciones e imágenes.
- Las tablas `market_editorial_control`, `market_editions` y `market_edition_assets` son aditivas. Las banderas de noticias/Academia, sus ventanas, el intervalo de diez minutos, sus reservas y el límite de US$6 no se actualizan.
- La activación tiene su propia bandera; también respeta `automation_control.enabled/paused`. Un bloqueo, las claves únicas de día/edición y la escritura atómica de las dos traducciones impiden publicaciones dobles.

## Evidencia y alcance

Son **informes de cotizaciones**, no investigaciones ni explicaciones especulativas de las causas del mercado. Reutilizan exclusivamente la caché compartida que ya actualiza Crypto Prices. Se requieren BTC, ETH y SOL completos, variaciones válidas y hora del proveedor de como máximo quince minutos; un error de actualización aplaza la publicación. No consultan Crypto News API por su cuenta ni por visitante.

Cada edición contiene precios en USD, variación diaria, comparación relativa entre los tres activos y, cuando existe una edición anterior, variación calculada entre capturas. Las ventanas diaria e inter-edición se distinguen expresamente. Los datos se validan por código; la redacción bilingüe está determinada por esos mismos datos, sin llamadas a un modelo. No se añaden volumen, flujos de ETF, capitalización, liquidaciones, predicciones ni causas que las cotizaciones no prueben. Puede enlazar cobertura confirmada ya publicada sin republicar sus acontecimientos ni atribuirles causalidad.

La captura original se conserva en `/market-data/market-YYYY-MM-DD-N.json`, sin claves ni URL privadas. Los artículos mantienen esas cifras y su fecha original. Se rechaza repetir la misma captura con las mismas cifras visibles; un cambio de fecha de consulta no basta para crear contenido.

## Imágenes, SEO y coste

Cada informe recibe un gráfico original de sus tres variaciones, con los datos y hora de esa captura. Es una visualización de datos, no una serie histórica ni una fotografía. Se almacena en SVG y PNG de 1200 × 630, con autoría EconoFlux, texto alternativo y URL propia. Se registra también en la biblioteca editorial para que el trabajo de imágenes no lo sustituya ni gaste IA para ese informe.

Los artículos usan las plantillas existentes: URL propia EN/ES, canonical, hreflang, JSON-LD, Open Graph/Twitter, sitemap general y de noticias, compartir y anuncios. Se habilita `markets` como categoría de artículos y se corrige el texto fijo «Cotizaciones no disponibles». Mercados muestra las cotizaciones realmente guardadas; su refresco de quince minutos consulta solo el endpoint público de caché.

**Consumo adicional de IA: US$0. Llamadas adicionales a Crypto News API: 0.** Continúan los límites y consumos ya existentes. Solo se añaden pequeñas operaciones de D1 y ejecución del mismo Worker; no se contrata ningún servicio o plan. Las cuotas de la plataforma siguen siendo las de la cuenta.

## Fotografías y marcas reales

La selección ya prioriza material de biblioteca con procedencia y derechos registrados antes de generar ilustraciones con IA. Se amplía esa selección a `licensed-logo`, además de `licensed-photo`, para permitir marcas reales cuando sean pertinentes. La biblioteca se enriquece con dos fotografías de Bitcoin y logotipos de Ethereum, Binance y Coinbase, con las licencias de sus páginas de Wikimedia Commons verificadas, crédito, autor, enlace de origen, enlace de licencia y versiones WebP para artículo, miniatura y redes. Las fotografías se identifican como archivo y los logotipos como tales: no documentan el acontecimiento narrado ni implican respaldo comercial. Las marcas conservan sus derechos de marca aunque la imagen sea de dominio público en materia de copyright.

La importación es acotada y no habilita descarga indiscriminada de Google Images ni una búsqueda automática de licencias. El selector utiliza un recurso compatible aún no asignado a otra noticia y recurre al flujo de imágenes existente cuando no hay uno adecuado. No se reemplazan las imágenes ni URLs de artículos ya publicados.

## Ampliación de explicaciones

El titular solicitó después explicar los catalizadores de cada movimiento. La preparación de esa ampliación y su gasto de IA dentro del mismo límite están documentados en [market-analysis.md](market-analysis.md). La versión inicial de cotizaciones ya publicada no debe confundirse con esa ampliación, que requiere su despliegue y activación.

## Comprobación

`automation/tests/market-editorial.test.ts` verifica horario local/DST, tres cupos, publicación bilingüe, concurrencia, pausa, datos caducados, captura repetida y ausencia de llamadas de red o cargos de IA. También comprueba que los controles, cupos y uso de noticias y Academia permanecen sin cambios. La comprobación local de páginas en `.local/markets/checks/render.mjs` valida HTML indexable, capturas JSON, gráficos PNG, portada Mercados y artículos en ambos idiomas a 390 y 1440 píxeles.
