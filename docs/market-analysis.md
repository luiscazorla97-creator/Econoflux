# Informes de Mercados: catalizadores y explicaciones

Ampliación solicitada por el titular: además de las cotizaciones, explicar qué acontecimientos y mecanismos están respaldados por las fuentes y qué se desconoce. No se deduce una causa a partir de una subida ni se promete conocer todos los motivos de cada operación.

La migración aditiva `0017_market_context.sql` añade controles opcionales, inicialmente desactivados, y trabajos persistentes por edición. `analysis_required=1` exige una explicación revisada antes de publicar nuevas ediciones. `upgrade_existing=1` permite ampliar informes recientes conservando sus URLs, las cifras archivadas y la fecha original; las dos traducciones se actualizan juntas y solo una revisión real cambia `updatedAt`.

## Flujo

1. Seleccionar información reciente sobre mercados, macroeconomía, ETF, política o regulación entre los reportes ya recibidos por el sistema. No se añaden consultas a Crypto News API. Releer las fuentes originales accesibles, de manera acotada, y conservar texto y hora de consulta.
2. Preparar en inglés y español una entradilla y entre tres y seis secciones de contexto: catalizadores publicados, cronología, mecanismo propuesto, interpretación atribuida y límites. No se presentan coincidencias temporales, predicciones ni opiniones como causas probadas. Una fuente repetida no constituye corroboración independiente.
3. Exigir citas de evidencia privadas realmente presentes en los documentos. Una segunda llamada al modelo revisa hechos, cifras, fechas, traducción y seguridad de las atribuciones. Solo una explicación aprobada, con huella coincidente, puede incorporarse al artículo.
4. Separar las cotizaciones actuales calculadas por código de las cifras históricas de los medios. Las salidas de ETF de una sesión anterior no se transforman en entradas del día actual. El gasto electoral no se presenta como compras de criptoactivos. Las novedades posteriores a una captura no se atribuyen retrospectivamente como su causa.
5. Prepara la explicación hasta quince minutos antes de la ventana prevista y publica cuando esté completa y haya cotizaciones válidas. Contextos desactualizados, modificados después de la revisión o incompatibles con el movimiento observado requieren nueva comprobación. Las correcciones se acotan; errores de credenciales, cuota o revisiones fallidas conservan el trabajo privado.

No se inventan tipos de interés, datos económicos, volúmenes, liquidaciones ni compras institucionales. Si las fuentes no permiten explicar por separado el movimiento de Ethereum o Solana, se dice claramente. Tampoco se incorporan acusaciones perjudiciales sin respaldo.

## Presupuesto

La fase de datos y el gráfico original siguen sin consumir IA. **La ampliación de redacción y revisión sí utiliza OpenAI**, con el modelo existente y la misma contabilidad atómica de gasto, reservas y llamadas que noticias y Academia. No existe una bolsa adicional ni un aumento del máximo de **US$6 diarios**. Normalmente requiere dos llamadas por edición, más una única corrección si el revisor identifica un error. La facturación real depende de los tokens; el sistema reserva consumo antes de llamar y aplaza el trabajo si no alcanza el presupuesto. No contrata otro servicio.

Una edición que necesite análisis no se fuerza con contenido inventado o sin revisión para completar tres publicaciones. Si faltan fuentes o margen de gasto, queda pendiente. Se conservan los horarios y cupos ya autorizados; la publicación efectiva sigue los controles de calidad.

## Primera ampliación preparada

Los borradores de revisión están en `.local/markets/detailed-report-en.md` y `.local/markets/detailed-report-es.md`, con las fuentes originales. Distinguen el rebote descrito por CryptoBriefing el 4 de noviembre, la interpretación atribuida a Lacie Zhang, las salidas de ETF de la sesión del 3 publicadas por BeInCrypto y el gasto electoral descrito por Reuters el 27 de octubre como antecedente. No afirman que esos datos demuestren una causa única. La revisión independiente y la publicación de esa ampliación siguen pendientes.

Pruebas: `automation/tests/market-context.test.ts` comprueba fuentes, traducciones, revisión separada, gasto compartido, huella del contenido y actualización bilingüe atómica conservando URL, precios y fecha inicial. La integración con los tres cupos de Mercados se cubre también con su suite existente.
