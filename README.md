# EconoFlux

Medio editorial bilingüe en Astro + TypeScript. HTML estático completo, imágenes WebP locales y JavaScript solo para navegación móvil, filtros, búsqueda y copiar enlaces. Versión de revisión desplegada en Cloudflare Pages con integración GitHub. Las API de noticias y la automatización siguen pendientes.

## Desarrollo

Requiere Node.js 22.12+ (validado con Node 24) y npm.

```sh
npm ci
npm run dev         # puerto 4321
npm run check       # Astro + TypeScript
npm run build:review # compilación de revisión y comprobación de no indexación
npm run preview     # servir dist
npm test            # pruebas de navegador y contrato editorial
```

La raíz lleva a `/en/`; `/es/` es la versión española. El idioma de la URL manda. El selector conserva la página y relaciona artículos mediante `translationId`. Si falta una traducción, lleva a la portada del otro idioma sin fabricar una URL. Los listados actuales contienen hasta tres artículos: tienen navegación hacia el archivo completo; cuando crezca el catálogo se deberá añadir paginación por lotes.

## Contenido e identidad

- `src/content/articles.ts`: modelo tipado, tres pares educativos, fuentes originales y fechas reales de creación de las demos (1 de noviembre de 2026). Estado `draft`, `demo: true`.
- `src/content/pages.ts`: información editorial, contacto y avisos legales provisionales en ambos idiomas.
- `src/lib/i18n.ts`: traducciones de interfaz.
- `src/components`, `src/layouts`, `src/styles`: presentación separada del contenido.
- `public/images`: ilustraciones generadas con IA para esta vista. Sin fotografías de personas ni afirmaciones de reportería. Créditos visibles en cada artículo.

No se inventan precios: la franja muestra guiones. La búsqueda funciona con datos locales por idioma, sin peticiones a un servicio externo. Los espacios publicitarios están desactivados; `Ad.astro` reserva dimensiones si se activa una integración real. No hay analítica, formularios ni cookies de aplicación.

## Previsualización y producción

Por defecto `SITE_MODE=preview`: se muestran las demos, todas las páginas llevan `noindex`, robots bloquea el rastreo, el sitemap está vacío y `_headers` añade `X-Robots-Tag`.

```sh
npm run build:production
```

Producción **excluye físicamente** los artículos demo y los borradores del HTML, las tarjetas, la búsqueda y el sitemap. Mientras no se incorporen artículos reales publicados, los listados estarán vacíos. El contenido publicado debe tener `status: 'published'` y `demo: false`. No cambiar estos campos a las demos para llenar la producción.

Para recuperar la vista de diseño tras comprobar producción: `npm run build`.

## Versión de revisión en Cloudflare Pages

El proyecto **econoflux** está creado con **integración GitHub** y el repositorio `luiscazorla97-creator/Econoflux`.

URL de revisión: **https://econoflux.pages.dev/es/** (español) y **https://econoflux.pages.dev/en/** (inglés). Cloudflare confirmó el primer despliegue del commit `62160d4` y la comprobación remota de compilación: 36 páginas, seis demos y bloqueo de indexación. Las pruebas de navegador locales pasaron; la verificación del sitio público desde este entorno requiere permitir su dominio en la política de red. No crear un proyecto Direct Upload: Cloudflare no permite convertirlo después a integración Git.

Configuración reproducible: `scripts/cloudflare-pages-project.json` (sin credenciales).

| Ajuste | Valor |
| --- | --- |
| Nombre | `econoflux` |
| Repositorio | `luiscazorla97-creator/Econoflux` |
| Rama principal de Pages | `main` |
| Comando de compilación | `npm run build:review` |
| Directorio de salida | `dist` |
| Directorio raíz | raíz del repositorio |
| `NODE_VERSION` | `24` |
| `SITE_MODE` | `preview` en ambos entornos de Pages |

Aunque Pages denomina «production» a su rama principal, esta etapa solo publica una **versión de revisión** en su URL de Cloudflare. `build:review` fuerza el modo de demostración no indexable y verifica las 36 páginas, seis artículos, sitemap vacío y cabecera `X-Robots-Tag`. Las URLs de metadatos usan `CF_PAGES_URL` cuando Cloudflare la proporciona. No añadir `econoflux.com` ni cambiar DNS en esta etapa.

### Si Cloudflare aún no tiene acceso a GitHub

1. En Cloudflare, abrir **Workers & Pages → Create application → Pages → Connect to Git** (según la interfaz: **Import an existing Git repository**).
2. Elegir GitHub y autorizar la aplicación **Cloudflare Workers and Pages** para la cuenta `luiscazorla97-creator`, dando acceso al repositorio **Econoflux**. La autorización se realiza en GitHub; no requiere compartir tokens por chat.
3. Seleccionar **Econoflux**, crear el proyecto **econoflux** y aplicar la tabla anterior. Si el asistente permite seleccionar framework, elegir **Astro** y confirmar manualmente el comando y `dist`.
4. Guardar y desplegar. Los futuros commits en `main` activarán compilaciones automáticamente; las otras ramas generan previsualizaciones.

La autorización de la aplicación GitHub es independiente del token API de Cloudflare configurado en el entorno. Si falta, la API puede rechazar la creación con `source.type=github`; conservar este método y completar el asistente, sin recurrir a `wrangler pages deploy` para crear un proyecto distinto.

Para verificar localmente la misma compilación: `npm run build:review && npm run preview`. Para probar una URL ya desplegada: `PLAYWRIGHT_BASE_URL=https://URL-REAL-DE-CLOUDFLARE npm test`. La comprobación remota también valida la cabecera HTTP de no indexación. Usar únicamente la URL devuelta por Cloudflare, sin suponer que un subdominio esté disponible.

Los secretos solo se usan desde el entorno que administra Cloudflare. La web de revisión no necesita claves de API. La publicación del dominio, DNS y noticias automáticas son etapas posteriores.

## Publicación diaria sin ordenador

La web estática no ejecuta consultas al recibir visitas. La segunda fase requiere un **Cloudflare Worker con Cron Trigger**, una base D1 y credenciales de proveedores elegidos. Nada de esto está activo todavía.

Flujo previsto:

1. `fetchNews`: obtener fuentes mediante la API contratada, respetando licencia, límites y condiciones de atribución. Conservar URL, texto de origen y fecha de obtención.
2. `selectTopics`: agrupar noticias y detectar duplicados también semánticos. La utilidad actual normaliza URLs y calcula claves estables; no sustituye el agrupamiento de noticias sobre el mismo acontecimiento provenientes de distintas URLs.
3. `draftBothLanguages`: generar inglés y español con el mismo identificador. Redactar a partir de fuentes trazables, con atribución de IA honesta y sin inventar hechos. Validar salida, sanitizar cualquier HTML y no permitir que el texto de fuentes controle herramientas o credenciales.
4. `qualityGate`: verificar afirmaciones y enlaces, actualidad, derechos de imagen, completitud de ambos idiomas y ausencia de recomendaciones o promesas inventadas. Ante fallos, conservar borrador y registrar el motivo.
5. `store.commit`: transacción de ambos idiomas y fuentes en D1, con claves únicas. Claims atómicos y leases con vencimiento para reintentos tras fallos. No publicar dos veces el mismo tema.
6. Exportar contenido validado al formato de artículos, reconstruir Astro y desplegar de forma atómica en Pages. Un fallo conserva el último sitio correcto. El adaptador de exportación/build/deploy aún debe implementarse.
7. Configurar el cron en UTC, reintentos con espera progresiva, presupuesto diario, registros y alerta de fallos. El horario definitivo y la API se fijarán al conectar las cuentas.

`scripts/editorial-pipeline.ts` separa estas funciones y ofrece validación, trazabilidad e idempotencia con un almacén inyectado. `scripts/editorial-schema.sql` propone el esquema D1. Las pruebas usan un almacén en memoria; no constituyen una integración Cloudflare activa. No se incluyen conectores ficticios ni llamadas pagadas.

Variables futuras: `NEWS_API_KEY`, `TRANSLATION_API_KEY` (ver `.env.example`); secretos adicionales del proveedor se definirán cuando se elija. Las variables no llevan prefijo `PUBLIC_`. Al conectar precios, mostrar proveedor y momento de actualización.

## Comprobaciones de interfaz

En este entorno se utiliza `/usr/bin/chromium`. En otras máquinas se utiliza el Chromium de Playwright, o se puede definir `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` con la ruta del ejecutable. Playwright necesita Chromium: `npx playwright install chromium` (y dependencias del sistema si faltan). `npm test` compila la revisión e inicia el servidor del HTML estático; cubre ambos idiomas, artículos en HTML inicial, filtros, búsqueda, cambio entre traducciones, enlaces internos, menú móvil, desbordamientos y la lógica de publicación. Las capturas se guardan en `test-results/`.

Pendiente del lanzamiento en el dominio propio: configurar el dominio y DNS, añadir datos del titular y contacto verificado, cerrar textos legales según jurisdicción, contratar/configurar fuentes y modelo, implementar y probar adaptadores del Worker y activar cron. El permiso de publicación del propietario no sustituye las credenciales de acceso.
