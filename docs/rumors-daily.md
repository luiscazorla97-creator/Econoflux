# Objetivo diario de Rumores y filtraciones

El titular solicitó publicar dos reportes diarios, distintos, en esta sección. El objetivo se integra en el flujo de noticias existente, **sin crear artículos duplicados para llenar otra sección**, añadir otro cron, repetir consultas de Crypto News API o aumentar el presupuesto de US$6 diarios.

La nueva tabla aditiva `report_editorial_control` configura el objetivo combinado de **dos acontecimientos al día entre rumores y filtraciones**; las versiones inglesa y española cuentan como uno. Se cuenta por fecha de America/New_York, incluyendo cambios de horario de verano. Las actualizaciones y desmentidos conservan la URL y fecha inicial y no consumen un cupo nuevo. Los reportes resueltos conservan su procedencia y cuentan en el día de publicación original.

A partir de las 10:00 se da prioridad a alcanzar un primer reporte y desde las 18:00 a alcanzar el segundo. Son ventanas de selección, no una promesa de publicación a una hora exacta. Las noticias urgentes verificadas o de relevancia excepcional conservan precedencia. Se mantienen el máximo horario, el intervalo de revisión de diez minutos, las reservas de trabajo, las prioridades de Academia, la pausa general y todos los controles de verificación, imágenes, traducción y gasto.

Un título que mencione rumor o filtración solo es una pista para revisar un candidato. **No constituye evidencia ni asigna la etiqueta pública.** La clasificación procede de la verificación existente: reporte original identificable y accesible, atribución, citas contrastadas, lo confirmado y lo que sigue sin autenticar, y controles especiales para acusaciones perjudiciales. No se convierten predicciones de precios o acusaciones sin respaldo en reportes publicables. Compartir un origen no equivale a corroboración independiente.

El contador y las reservas impiden nuevas publicaciones de rumor/filtración por encima del objetivo configurado, sin bloquear noticias confirmadas ni correcciones de artículos existentes. Se vuelve a leer el número de publicaciones después de cada artículo y no se cuentan dos veces pares bilingües pendientes de confirmación HTTP. La selección y publicación siguen bajo el mismo bloqueo del programador de noticias.

Si no hay dos reportes adecuados, hay fuentes inaccesibles, falta una imagen válida, están incompletas las traducciones o se alcanza el límite de gasto, **no se fuerza el cupo ni se inventan noticias**. Se conserva el trabajo pendiente y se aplican los reintentos existentes. No se afirma que todos los días existan dos rumores suficientemente respaldados.

La API mantiene su consulta general de hasta cien artículos y la ingestión acotada a diez reportes inéditos por revisión. No hay una nueva suscripción ni se cambia su filtro a un conjunto fijo de criptomonedas.

Pruebas: `automation/tests/report-daily.test.ts`, junto con las suites existentes de publicación horaria y política de confirmación. Cubren conteo bilingüe, ventanas locales, UTC medianoche, reportes resueltos, reservas, correcciones, prioridades, ausencia de nuevas consultas externas y compatibilidad cuando el objetivo está desactivado.
