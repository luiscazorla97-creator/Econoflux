# EconoFlux: políticas y preparación para AdSense

Estado: **textos preparados y publicación autorizada por el titular** el 4 de noviembre de 2026. Las comprobaciones de identidad y consentimiento indicadas abajo siguen pendientes.

## Textos preparados

Los textos completos están en `src/content/policies.ts`. Se integran en la plantilla bilingüe existente, con canonical, hreflang, fecha de actualización, correo enlazado, navegación entre políticas y enlaces al pie. El sitemap general incluye las doce páginas; no se añaden al sitemap de noticias.

Rutas de los documentos en la versión preparada:

| Documento                                 | Inglés             | Español            |
| ----------------------------------------- | ------------------ | ------------------ |
| Aviso legal e información del responsable | `/en/legal/`       | `/es/legal/`       |
| Privacidad                                | `/en/privacy/`     | `/es/privacy/`     |
| Cookies y preferencias publicitarias      | `/en/cookies/`     | `/es/cookies/`     |
| Condiciones de uso                        | `/en/terms/`       | `/es/terms/`       |
| Publicidad y transparencia comercial      | `/en/advertising/` | `/es/advertising/` |
| Derechos de autor y solicitudes           | `/en/copyright/`   | `/es/copyright/`   |

Se conservan las páginas existentes de presentación, contacto, política editorial, verificación, metodología, correcciones y aviso financiero/educativo. No se ha modificado la automatización, la base de datos, el presupuesto, las noticias, los anuncios ni sus identificadores.

Los datos públicos utilizados son los autorizados: **Luis C.**, **Argentina**, **luterapps@gmail.com**. No se han inventado domicilio, razón social, inscripción, CUIT, credenciales profesionales ni revisión humana de artículos.

## Pendientes antes de presentar la web a revisión

1. **Identificación del responsable.** El artículo 6 de la Ley 25.326 exige informar la identidad y el domicilio del responsable al recabar datos. El nombre abreviado y el país disponibles no completan esos datos. El titular deberá determinar y proporcionar la identificación y domicilio que corresponda informar, respetando su decisión de no divulgar otros datos sin autorización. No se han puesto datos ficticios ni instrucciones internas en las páginas públicas. Revisar también las obligaciones de registro de responsable y bases ante la AAIP según los tratamientos efectivamente realizados; no se ha afirmado ni tramitado inscripción alguna.
2. **Consentimiento publicitario regional.** En AdSense, revisar **Privacidad y mensajes → Normativas europeas → Crear/gestionar mensaje**, seleccionar `econoflux.com`, configurar idiomas, proveedores, las opciones de consentimiento/rechazo/gestión y la reapertura de preferencias, y comprobar su funcionamiento con la herramienta de prueba del proveedor. Para publicidad personalizada a visitantes del EEE, Reino Unido y Suiza, Google exige una **CMP certificada e integrada con el TCF vigente de IAB**. El país del editor no elimina ese requisito. Google ofrece su solución en Privacidad y mensajes; no se ha contratado ningún servicio. La configuración real de esa cuenta **no se ha podido verificar en esta tarea**. Un mensaje puede cargarse desde la cuenta de AdSense sin estar implementado como componente del repositorio: su ausencia en el código no demuestra que falte en producción.
3. **Comprobar el comportamiento, además de los textos.** Verificar las solicitudes/cookies antes de consentir, después de rechazar, aceptar y retirar, incluyendo ventanas privadas y las regiones pertinentes. Los anuncios no personalizados también pueden usar cookies y no sustituyen automáticamente el consentimiento. No basta con añadir un aviso o los enlaces de Mi centro de anuncios. Los textos no configuran ni certifican una CMP.
4. **Inventario y proveedores reales.** Contrastar cookies, almacenamiento, finalidades, caducidades, proveedores publicitarios habilitados y transferencias internacionales con la configuración de AdSense, Cloudflare y Gmail. La política enlaza las explicaciones de los proveedores; no inventa un inventario exhaustivo ni plazos fijos. Completar las divulgaciones y mecanismos regionales que correspondan a la configuración real, incluidas las opciones de otros mercados cuando sean aplicables.
5. **Cuenta y revisión de AdSense.** Verificar titularidad del sitio, cuenta de una persona mayor de 18 años, identidad, pagos y avisos pendientes en AdSense. Solicitar la revisión desde **Sitios → econoflux.com** cuando la versión revisada esté publicada y los controles anteriores estén resueltos. La aprobación depende de Google y de su evaluación del contenido, navegación, tráfico y cumplimiento; preparar políticas no garantiza la aceptación. No se ha enviado ninguna solicitud ni accedido a la cuenta de Google.

`public/ads.txt` ya contiene el vendedor autorizado `pub-1382859681401211` con el registro de Google. Se conserva el script de AdSense existente. Estos archivos no prueban por sí solos que la cuenta o el sitio estén aprobados.

## Fuentes oficiales consultadas

- [AdSense: contenido obligatorio de la política de privacidad](https://support.google.com/adsense/answer/1348695?hl=es).
- [AdSense: requisitos para plataformas de gestión del consentimiento](https://support.google.com/adsense/answer/13554116?hl=es).
- [AdSense: requisitos de participación](https://support.google.com/adsense/answer/9724?hl=es).
- [Argentina: texto de la Ley 25.326](https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm), especialmente artículos 6, 14 y 16.
- [AAIP: derechos de las personas titulares de datos](https://www.argentina.gob.ar/aaip/datospersonales/derechos).
- [Google: uso de información en sitios asociados](https://policies.google.com/technologies/partner-sites), [cookies](https://policies.google.com/technologies/cookies) y [Mi centro de anuncios](https://myadcenter.google.com/).
- [Cloudflare: privacidad](https://www.cloudflare.com/privacypolicy/).

## Validación y alcance

Comprobaciones realizadas:

- `npm run check`: sin errores ni advertencias; conserva una sugerencia previa sobre `execCommand` en el componente de compartir, ajena a estas políticas.
- `npm run build:production`: compilación correcta, sin despliegue.
- Comprobación local en `.local/adsense-review/verify-policies.mjs`: las 26 páginas informativas de ambos idiomas responden correctamente y contienen título, canonical, hreflang y navegación en el HTML inicial; 52 comprobaciones de navegador a 390 y 1440 píxeles sin desbordamiento horizontal ni errores de JavaScript. Los cambios de página entre privacidad y cookies funcionan en ambos idiomas.
- Verificado que las 26 rutas están en el generador del sitemap, sin duplicados. La vista previa local conserva su exclusión de indexación y no solicita anuncios.
- Capturas locales revisadas y textos reunidos para lectura en `.local/adsense-review/politicas-econoflux.md`.

La comprobación usa exclusivamente una base D1 local temporal y un navegador local. No consulta ni escribe D1 de producción y no comprueba el consentimiento real de la cuenta de AdSense.

El titular autorizó publicar los cambios el 4 de noviembre de 2026. Se utiliza la rama `main` y la integración GitHub existente de Cloudflare Pages. Esta autorización no equivale a aprobación de AdSense ni resuelve los datos legales o el consentimiento pendientes.
