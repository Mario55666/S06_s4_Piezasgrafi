# S06 · Actividad 4 · Simulador 3D de impresión offset (Speedmaster CD 102)

Landing page con una prensa offset de pliegos en 3D, una ficha de cálculo de imposición y un taller gamificado (DUA-Experiencial) para la UD **Producción y publicación de piezas gráficas** del IDC. Semana 6, actividad 4.

- **Archivo local:** `simulador-offset-cd102.html` (un solo archivo, abre con doble clic).
- **En el NAS:** `../servidor-nas/tareas/tarea-06/Actividad_4/index.html` (con envío al docente). La portada `tarea-06/index.html` ya enlaza la Actividad 4.
- **Necesita internet** para tres cosas que vienen de cdnjs: la vista 3D (three.js r128), las animaciones (anime.js 3.2.2) y el informe PDF (jsPDF 2.5.1). Sin conexión, la página muestra un esquema 2D de la prensa con las mismas 16 partes y todo lo demás funciona (el informe se descarga en Markdown).

## Objetivo de la actividad 4

> Calcula cuántas piezas de un tamaño dado caben en un pliego de referencia, en las dos orientaciones posibles, aplicando el margen de pinza declarado. Determina cuál orientación conviene y lo registra en la ficha de cálculo.

Piezas (Estación C): afiche A2 (420 × 594 mm), portada de revista A4 (210 × 297 mm), volantes A5 (148 × 210 mm) y publicidad en miniatura de 9,5 × 5,5 cm de acabado final.

Pliego de referencia 100 × 70 cm, pinza declarada de 10 mm en un lado largo, piezas al corte sin sangrado ni calles. Área útil: 1000 × 690 mm. Orientación A: lado corto de la pieza a lo ancho del pliego. Orientación B: girada 90°.

| Pieza | Orientación A | Orientación B | Conviene | Aprovechamiento |
|---|---|---|---|---|
| Afiche A2 | 2 × 1 = 2 | 1 × 1 = 1 | A | 71 % |
| Portada A4 | 4 × 2 = 8 | 3 × 3 = 9 | B | 80 % |
| Volantes A5 | 6 × 3 = 18 | 4 × 4 = 16 | A | 80 % |
| Miniatura 9,5 × 5,5 cm | 18 × 7 = 126 | 10 × 12 = 120 | A | 94 % |

El estudiante primero calcula el área útil y luego, por pieza, columnas y filas en las dos orientaciones, y elige la que conviene. Cada error abre una pista; al segundo error se muestra la división y el esquema. Lo resuelto queda en la ficha de cálculo (tabla en pantalla, CSV para Excel e informes PDF/MD).

## Recorrido y puntaje (359 puntos)

| Estación | Qué hace | Puntos |
|---|---|---|
| 1 · El pliego de anoche | Observa un pliego defectuoso y formula una hipótesis | 5 |
| A · Recorrido 3D | Explora 12+ de las 16 partes del catálogo, ve el funcionamiento guiado y resuelve la pista 1 | 40 |
| B · Antes de empezar | Lista de verificación | 5 |
| 2 · ¿Por qué «offset»? | Diagrama de rodillos con flechas de tinta y agua, definición por contraste, 4 tarjetas, viaje de la tinta, pista 2 | 38 |
| **C · Ficha de cálculo** | **Área útil y piezas por pliego de las cuatro piezas en las dos orientaciones** | **37** |
| 3 · Taller de prensa | Arte y plancha (con medidas), montaje K-C-M-Y, tintas, arranque con la consola, pupitre hasta el pliego OK, revisión y 4 defectos | 150 |
| 4 · Anagramas | MANTILLA, TINTERO, REGISTRO + pista 4 | 34 |
| 5 · Pupitre y cierre | Código 2-6-8-9, dos casos nuevos, reflexiones, ticket | 50 |

## La prensa 3D

- **Ampliar:** botón «⛶ Ampliar» (pantalla completa o, si el navegador no lo permite, ventana completa), zoom con la rueda del ratón, con +/− o con el regulador (100–800 %), mover con clic derecho o Mayús + arrastrar, y doble clic en una parte para acercarla.
- **Transparencia:** «👁 Transparencia» vuelve transparentes carcasas, laterales y tapas (nivel regulable), también mientras imprime, y muestra la anatomía del cuerpo 2.
- **Agua y tinta:** «💧 Agua y tinta» muestra en cada cuerpo gotas celestes (agua: batea → mojadores → plancha) y flechas del color de la tinta (tintero → batería → plancha → mantilla → pliego). Su tamaño sigue los ajustes del pupitre. La plancha y la mantilla de cada cuerpo se ven entintadas con el efecto de tus ajustes.
- **Consola de marcha:** 🔔 Aviso → ▶ Marcha → 💨 Aire → 📄 Marcador → 🖨 Impresión, más ⏹ Paro y 🛑 Emergencia (con rearme). Regulador de velocidad de 3 000 a 15 000 pliegos/h. La máquina sube y baja de velocidad gradualmente y gira a velocidad de preparación (hasta 5 000 pl/h) hasta que se activa la impresión. El contador de tiraje separa la maculatura de los pliegos buenos (los que salen con el pliego en tolerancia) y muestra el avance hacia el tiraje de 1 000 afiches.
- **Sonido** (se activa con «🔇 Sonido»): motor y rodillos según la velocidad, golpeteo de cilindros (una vuelta por pliego), sopladores y succión del marcador, entrada de cada pliego, bocina de aviso y paro de emergencia. Es sonido sintetizado, sin archivos.
- En el pupitre (paso 3.4), «📏 Sacar un pliego y medir la tira» solo funciona con la prensa imprimiendo, y un diagrama muestra cómo llegan el agua y la tinta de cada cuerpo a la plancha y a la mantilla.

## Fuentes y valores

- **CD 102** (`03-Research/Imposicion-Digital-CTP/TDB_CD102_en.md`, ficha técnica de Heidelberg): plancha 790 × 1030 mm de 0,20–0,30 mm; distancia del borde delantero de la plancha al inicio de impresión 43 mm (52 mm opcional); pinza 10–12 mm (11–12 mm en soportes de más de 0,8 mm); mantilla 840 × 1052 mm de 1,95 mm con barras metálicas; pliego máx. 720 × 1020 mm, mín. 340 × 480 mm; formato de impresión 710 × 1020 mm. El blanco de cola (37 mm) se deduce: 790 − 43 − 710. El simulador usa 10 mm de pinza.
- **SM 74** (`sm74.md`, datos técnicos de Heidelberg): plancha 605 × 745 mm de 0,25–0,30 mm; inicio de impresión a 59,5 mm del borde; pinza 8–10 mm; mantilla 627 × 772 mm de 1,95 mm.
- **SM 52** (459 × 525 mm): valor de referencia. **Pendiente: verificar con la ficha de la máquina.**
- **Partes 1–16:** catálogo «Speedmaster CD 102. The versatile» (Heidelberg, 05/16). Velocidad máxima de 15 000 pl/h: catálogo.
- **Valores didácticos, no del fabricante** (editables en `src/print.js` y `src/app.js`): densidades meta K 1,80 ± 0,10, C 1,45 ± 0,08, M 1,40 ± 0,08 e Y 1,00 ± 0,08; ganancia 11–17 %; agua 35–55 %; presión 0,10–0,15 mm; registro ± 0,05 mm; nivel de tintero 40–70 %; secuencia de arranque, velocidad de preparación y zonas del regulador; secuencia AutoPlate en seis pasos.

## Justificación pedagógica (DUA-Experiencial)

La actividad ofrece múltiples formas de implicación (misión con enigmas, puntos, rangos, rachas), de representación (prensa 3D manipulable, diagrama de rodillos animado, esquemas de imposición, tablas de medición, cuentahílos) y de acción y expresión (explorar, calcular, ordenar, montar, arrancar, ajustar, diagnosticar, escribir). Sigue el ciclo experiencial: experiencia concreta (pliego defectuoso, recorrido 3D), observación reflexiva (hipótesis, lectura de la tira), conceptualización (offset indirecto y planográfico; área útil y orientación) y experimentación activa (ficha de cálculo y taller de prensa).

## Envío al docente

La copia del NAS carga `/envio-resultados.js` con `data-sub="actividad-4"`. El servidor solo acepta `tarea-06` como actividad y guarda cada envío como `apellidos_nombres__id`. Sin `data-sub`, la Actividad 4 compartiría el identificador de la Actividad 1 en el mismo navegador y sobrescribiría sus resultados. Por eso `envio-resultados.js` (en `Proyectos/` y en `servidor-nas/sitio/`) ahora lee `data-sub`; el cambio no afecta a las actividades que no lo usan. **Copia también ese archivo al NAS.**

## Construir

```bash
node construir.js
```

| Archivo | Contenido |
|---|---|
| `src/index.src.html` | Estructura, estilos IDC y textos (marcadores `__IDC_LOGO__` y `<!--__SCRIPTS__-->`) |
| `src/print.js` | Formatos de plancha y pliego, imposición, diagrama acotado, separación CMYK, planchas CTP, superficies entintadas, modelo de impresión, cuentahílos |
| `src/sound.js` | Sonido sintetizado (Web Audio) |
| `src/press3d.js` | Prensa 3D: zoom y paneo, transparencia, flechas de agua y tinta, alimentación e impresión, velocidad |
| `src/rollers.js` | Diagrama interactivo de rodillos y vistas de plancha, mantilla y pliego |
| `src/app.js` | Estaciones, ficha de cálculo, consola de marcha, taller, guardado, informes y constancia |
| `construir.js` | Arma el HTML local y la copia del NAS |

Mg. Mario Quiroz Martínez · Docente · Unidad didáctica: Producción y publicación de piezas gráficas · Semana 6 · Actividad 4
