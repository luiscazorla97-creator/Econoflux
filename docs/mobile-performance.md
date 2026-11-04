# Rendimiento móvil de EconoFlux

Optimización del 4 de noviembre de 2026 sobre el frontend existente.

## Diagnóstico antes de modificar

El informe aportado por el propietario indicaba rendimiento 43, FCP 4,0 s,
LCP 5,4 s, TBT 10 ms y CLS 1,00, con el resto de categorías en 100.

Las mediciones de laboratorio realizadas desde este entorno, con anuncios
habilitados y sin interceptar sus solicitudes, dieron:

| URL / perfil                         | Rendimiento | FCP    | LCP    | TBT      | CLS |
| ------------------------------------ | ----------- | ------ | ------ | -------- | --- |
| `/` móvil, con redirección de idioma | 89          | 1,31 s | 3,52 s | 123,5 ms | 0   |
| `/es/` móvil                         | 98          | 0,99 s | 2,19 s | 97,5 ms  | 0   |
| `/en/` escritorio                    | 99          | 0,39 s | 0,76 s | 0 ms     | 0   |

Son entornos y ejecuciones diferentes de PageSpeed, no una reproducción de su
resultado 43. No se debe presentar esa cifra y una posterior medición local
como una mejora causal 43 → resultado local.

Lighthouse identificó `.hero-art` como elemento LCP. La imagen ya era WebP,
responsive, de alta prioridad y sin lazy loading. La hoja de estilos compartida
se descargaba como recurso bloqueante independiente. No existen fuentes web
externas: se usan Arial/Helvetica/sans-serif y Georgia para el monograma.

Un PerformanceObserver registró layout shifts, cambios de LCP e inserciones
publicitarias en EN/ES móvil y escritorio, durante doce segundos tras cargar,
con red de 1,6 Mbps/150 ms y CPU 4×. No registró desplazamientos en esas
sesiones. Las imágenes, tarjetas, cabecera y barra de precios ya tenían
reservas de tamaño. AdSense cargó sus nodos, pero no produjo anuncios visibles
que desplazaran contenido en estas sesiones. No se atribuye sin evidencia el
CLS 1,00 a esos elementos ni se afirma haber corregido su causa concreta.

## Cambios puntuales

- `astro.config.mjs`: entrega las mismas reglas CSS con el HTML mediante
  `build.inlineStylesheets: "always"`. La hoja tiene unos 28 KB sin comprimir.
  Se elimina una petición bloqueante de primer renderizado, manteniendo todas
  las reglas, transiciones y tamaños. El coste es repetir el CSS en cada HTML
  en lugar de aprovechar su caché independiente entre páginas.
- `src/layouts/Layout.astro`: permite declarar una precarga responsive de la
  imagen LCP al principio del head. Los anuncios, scripts, SEO, canonical,
  hreflang y JSON-LD permanecen en su lugar y con su contenido original.
- `src/pages/[lang]/index.astro`: usa una única definición de srcset/sizes para
  precarga e imagen y ajusta sizes al breakpoint real de 780 px. El navegador
  descarga una sola variante. No cambia la ilustración ni se recomprimen
  innecesariamente los archivos existentes. La imagen visible mantiene
  fetchpriority high; las secundarias conservan carga diferida y dimensiones.
- `scripts/verify-mobile-performance.mjs`: comprueba la descarga única,
  estilos inline, tamaños, SEO, anuncios y desplazamientos observados en
  ambas versiones y tamaños de pantalla. Guarda capturas y resultados privados
  en `.local/performance/`, sin invocar APIs de noticias o generación.

El CSS fuente, las imágenes, las animaciones y el script AdSense no se editan.
No se modifican Worker editorial, cron, D1, APIs, límites, presupuesto, cantidad
ni programación de publicaciones. Se conserva la caché de imágenes y el
comportamiento fresco del contenido dinámico y sitemaps.

## Verificación y límites

```bash
npm run check
npm run build:production
npm run test:dynamic
node scripts/verify-mobile-performance.mjs
```

La verificación móvil se complementa con Lighthouse móvil y escritorio,
manteniendo activa la monetización. Las métricas de cada ejecución se guardan
para comparar la misma URL y perfil, incluyendo resultados desfavorables.

El CLS 1,00 del informe original sigue pendiente de reproducir con ese informe
o su traza concreta. Las condiciones de anuncios, ubicación, red y ejecución
pueden variar. No se agregan espacios vacíos de tamaño supuesto ni se ocultan
unidades para obtener una puntuación. Las mediciones de laboratorio no
certifican Core Web Vitals de campo ni garantizan 90+ en cada visitante.
