/* Simulador CD 102 · lógica de la actividad: estaciones con compuertas, puntaje, acertijos, taller de prensa,
   guardado en el navegador e informes PDF/MD. ES5. Requiere PRINTSIM (print.js) y PRESS3D (press3d.js).
   Expone los globales state, buildMD, downloadMD y downloadPDF que lee envio-resultados.js. */
window.APP = (function () {
  "use strict";
  var PS = window.PRINTSIM, P3 = window.PRESS3D;

  /* ================= DATOS ================= */
  var STATION_ORDER = ["s1", "sT", "sV", "s2", "sI", "s3", "s4", "s5"];
  var STATION_NAMES = { s1: "1 · El pliego de anoche", sT: "A · Recorrido 3D", sV: "B · Antes de empezar", s2: "2 · ¿Por qué «offset»?", sI: "C · Ficha de cálculo", s3: "3 · Taller de prensa", s4: "4 · Anagramas", s5: "5 · Pupitre y cierre" };
  var PHASES = ["p1", "p2", "p3", "p4", "p5"];
  var CODE = [2, 6, 8, 9];

  var ITEMS = {
    "e1-hip": 5,
    "t-parts": 20, "t-func": 10, "t-p1": 10,
    "v-chk": 5,
    "d-def": 10, "d-flip": 8, "d-ord": 10, "d-p2": 10,
    "i-area": 5, "i-a2": 8, "i-a4": 8, "i-a5": 8, "i-mini": 8,
    "a-fmt": 10, "a-pre": 10,
    "b-seq": 10, "b-ord": 10,
    "c-ink": 10, "c-lvl": 5, "c-p3": 10,
    "e-start": 10, "e-ok": 20, "e-eff": 10,
    "f-sign": 5, "f-d1": 5, "f-c1": 5, "f-d2": 5, "f-c2": 5, "f-d3": 5, "f-c3": 5, "f-d4": 5, "f-c4": 5,
    "g-a1": 8, "g-a2": 8, "g-a3": 8, "g-p4": 10,
    "h-safe": 15, "h-tr1": 10, "h-tr2": 10, "h-ref": 10, "h-tick": 5
  };
  var ITEM_INFO = {
    "e1-hip": ["s1", "Hipótesis inicial"],
    "t-parts": ["sT", "12 partes exploradas"], "t-func": ["sT", "Funcionamiento completo"], "t-p1": ["sT", "Pista 1: marcador"],
    "v-chk": ["sV", "Lista de verificación"],
    "d-def": ["s2", "Definición de offset"], "d-flip": ["s2", "Tarjetas de la transferencia"], "d-ord": ["s2", "Viaje de la tinta"], "d-p2": ["s2", "Pista 2: AutoPlate"],
    "i-area": ["sI", "Área útil (pliego − pinza)"], "i-a2": ["sI", "Afiche A2"], "i-a4": ["sI", "Portada de revista A4"], "i-a5": ["sI", "Volantes A5"], "i-mini": ["sI", "Publicidad en miniatura 9,5 × 5,5 cm"],
    "a-fmt": ["s3", "Formato de plancha"], "a-pre": ["s3", "Preimpresión y CTP"],
    "b-seq": ["s3", "Secuencia AutoPlate"], "b-ord": ["s3", "Orden de planchas K-C-M-Y"],
    "c-ink": ["s3", "Tintas en su tintero"], "c-lvl": ["s3", "Nivel de los tinteros"], "c-p3": ["s3", "Pista 3: entintado y mojado"],
    "e-start": ["s3", "Secuencia de arranque de la prensa"], "e-ok": ["s3", "Pliego OK alcanzado"], "e-eff": ["s3", "Eficiencia (maculatura)"],
    "f-sign": ["s3", "Firma del pliego OK"],
    "f-d1": ["s3", "Defecto: fuera de registro"], "f-c1": ["s3", "Corrección: registro"],
    "f-d2": ["s3", "Defecto: velo"], "f-c2": ["s3", "Corrección: velo"],
    "f-d3": ["s3", "Defecto: mota (hickey)"], "f-c3": ["s3", "Corrección: mota"],
    "f-d4": ["s3", "Defecto: remosqueo"], "f-c4": ["s3", "Corrección: remosqueo"],
    "g-a1": ["s4", "Anagrama: MANTILLA"], "g-a2": ["s4", "Anagrama: TINTERO"], "g-a3": ["s4", "Anagrama: REGISTRO"], "g-p4": ["s4", "Pista 4: tintero"],
    "h-safe": ["s5", "Pupitre desbloqueado"], "h-tr1": ["s5", "Transferencia: cartulina"], "h-tr2": ["s5", "Transferencia: densidad baja"], "h-ref": ["s5", "Reflexiones"], "h-tick": ["s5", "Ticket de salida"]
  };
  var MAX = 0;
  Object.keys(ITEMS).forEach(function (k) { MAX += ITEMS[k]; });

  var RANKS = [{ min: 0, name: "Aprendiz de prensa" }, { min: 70, name: "Ayudante de máquina" }, { min: 150, name: "Operador offset" }, { min: 240, name: "Maquinista" }, { min: 320, name: "Jefe de taller" }];
  var PRAISE = ["Muy bien", "Excelente", "Así se trabaja", "Buen ojo", "Impecable", "Eso es oficio", "Vas como un maquinista", "Preciso"];
  var TIPS = [
    "Corrige primero la presión y el agua; después, la densidad. Si no, persigues un valor que se moverá solo.",
    "Registro: mueve un cuerpo a la vez y tira una prueba. Si mueves los tres, no sabrás cuál corrigió.",
    "Carga el tintero poco y a menudo: un nivel estable da un color estable.",
    "La tira de control es el idioma del maquinista: sin ella opinas; con ella mides.",
    "El pliego OK se firma junto a la prueba de color, nunca de memoria.",
    "Una mota que se repite en el mismo lugar viene de la plancha o la mantilla: para y limpia.",
    "Antes de subir el agua por un velo, confirma que la plancha no esté rayada.",
    "Abre el tintero en pasos de 3 a 5 %: los cambios grandes te hacen pasar de largo la meta."
  ];

  var SECTIONS = {
    alim: { ic: "📥", name: "Alimentación", parts: [1, 2, 3, 4], focus: 2, d: "El marcador separa los pliegos de la pila, la mesa los alinea y los sensores verifican que entre uno solo y bien colocado." },
    imp: { ic: "🎨", name: "Impresión", parts: [5, 6, 7, 8, 9], focus: "units", d: "Cuatro cuerpos impresores, uno por color. En cada uno, la plancha mojada y entintada pasa la imagen a la mantilla y esta al pliego." },
    acab: { ic: "✨", name: "Barniz y secado", parts: [10, 11], focus: 10, d: "En línea, la unidad de barniz protege la impresión y el secador fija tinta y barniz antes de apilar." },
    sal: { ic: "📤", name: "Salida", parts: [12, 13, 14], focus: 14, d: "Las cadenas llevan el pliego impreso a la pila: el antiestático y los frenos lo depositan sin marcas." },
    ctrl: { ic: "🖥️", name: "Control y mantenimiento", parts: [15, 16], focus: 15, d: "Desde el pupitre se ajusta y se mide todo; la lubricación central mantiene la máquina disponible." }
  };

  /* Partes 1–16: catálogo «Speedmaster CD 102. The versatile» (Heidelberg, 05/16), traducido y resumido. */
  var PARTS = [
    { id: 1, sec: "alim", short: "Non-stop", name: "Sistema non-stop", d: "Los dispositivos del marcador y de la salida permiten cambiar la pila de papel «al vuelo», sin detener la máquina.", why: "La prensa sigue imprimiendo mientras se repone el papel: más pliegos netos por turno." },
    { id: 2, sec: "alim", short: "Marcador", name: "Marcador Preset Plus", d: "Con ajustes de aire preestablecidos y compensación de velocidad según el material, separa con precisión una gran variedad de soportes, pliego a pliego.", why: "Si entran dos pliegos juntos o uno torcido, todo lo que sigue sale mal.", dato: "Sopladores (aire que separa el pliego) y ventosas de succión preajustados por tipo de soporte" },
    { id: 3, sec: "alim", short: "Alineación", name: "Alineación del pliego", d: "Las escuadras frontales se ajustan a distancia con precisión; el control automático de llegada y el frenado del pliego lo dejan siempre en la misma posición.", why: "Es la base del registro: si el pliego no entra siempre igual, los colores no coinciden." },
    { id: 4, sec: "alim", short: "Monitoreo", name: "Monitoreo del pliego", d: "Sensores y cuatro detectores de doble pliego autocalibrados vigilan cada pliego para una producción continua.", why: "Un doble pliego puede dañar la mantilla y detener el tiraje." },
    { id: 5, sec: "imp", short: "Cuerpo impresor", name: "Cuerpo impresor", d: "Cilindros con superficies de alta calidad y sistemas de pinzas especiales reducen el mantenimiento; el ajuste central del registro a distancia acorta la preparación.", why: "Aquí ocurre el offset: plancha → mantilla → pliego. Hay un cuerpo por color.", dato: "Registro central a distancia · mantilla 840 × 1052 mm, 1,95 mm" },
    { id: 6, sec: "imp", short: "AutoPlate", name: "AutoPlate", d: "Cambiador de planchas semiautomático: trabaja rápido y con precisión con solo pulsar un botón, y ahorra tiempo de preparación.", why: "Menos tiempo de máquina parada entre un trabajo y otro.", dato: "Plancha 790 × 1030 mm · 0,20–0,30 mm · la imagen empieza a 43 mm del borde delantero (52 mm opcional)" },
    { id: 7, sec: "imp", short: "AirTransfer", name: "Sistema AirTransfer", d: "Toberas Venturi transportan el pliego sobre un colchón de aire, sin contacto y de forma estable, en todo el rango de soportes.", why: "La tinta recién impresa no se marca ni se raya.", dato: "Soportes de 0,03 a 1 mm de espesor" },
    { id: 8, sec: "imp", short: "Entintado y mojado", name: "Batería de entintado y mojado Alcolor", d: "El mojado de película Alcolor, compensado según la velocidad y con función Vario, mantiene estable el equilibrio agua-tinta y evita motas (hickeys). La batería de entintado, de gran capacidad, da un color estable en todo el tiraje.", why: "Sin agua, la tinta se pega donde no hay imagen (velo); con exceso, el color se lava." },
    { id: 9, sec: "imp", short: "Tintero", name: "Tintero", d: "Tintero sin calibración con 500 incrementos por zona de color; se limpia rápido gracias a una funda (liner).", why: "Cada zona dosifica la tinta de una franja del pliego según cuánta imagen tiene.", dato: "500 incrementos por zona de color" },
    { id: 10, sec: "acab", short: "Barniz", name: "Unidad de barniz", d: "Un sistema de rasqueta de cámara aplica una capa homogénea; las mordazas combinadas permiten cambiar rápido entre barniz total y con reserva.", why: "Protege la impresión y le da brillo o mate, en línea." },
    { id: 11, sec: "acab", short: "Secador", name: "Secador", d: "Hay distintos secadores según el equipamiento; el DryStar Combination une lámparas IR y aire caliente en un módulo. Las distancias cortas entre secador y pliego ahorran energía.", why: "La tinta y el barniz deben fijarse antes de llegar a la pila." },
    { id: 12, sec: "sal", short: "Freno de pliegos", name: "Freno de pliegos", d: "Los frenos se colocan donde se necesite y evitan marcas en el pliego; aceleran el retiro y volteo.", why: "El pliego llega a gran velocidad: hay que frenarlo sin tocar la imagen." },
    { id: 13, sec: "sal", short: "StaticStar", name: "StaticStar", d: "Equipo antiestático que reduce la carga electrostática de los pliegos para separarlos y transportarlos de forma estable.", why: "Los pliegos con estática se pegan y la pila sale desordenada." },
    { id: 14, sec: "sal", short: "Salida", name: "Salida Preset Plus", d: "Salida con pantalla táctil y rueda de control (jogwheel) que forma pilas precisas, listas para la segunda pasada y el acabado.", why: "Una pila mal formada complica el corte y el doblado." },
    { id: 15, sec: "ctrl", short: "Press Center 2", name: "Prinect Press Center 2", d: "Puesto de mando que conecta la prensa con el flujo Prinect. Su guía Intellistart, orientada al proceso, reduce la preparación; integra diagnóstico y la medición de color Prinect Easy Control.", why: "Desde aquí se ajustan tinta, agua y registro, y se mide la tira de control." },
    { id: 16, sec: "ctrl", short: "Lubricación", name: "Lubricación central", d: "Lubricación central totalmente automática en el lado de accionamiento y en el del operador.", why: "Menos tiempo de mantenimiento: la máquina está disponible más horas." }
  ];
  var HOT = { 1: [7, 87], 2: [7, 22], 3: [16.5, 53], 4: [14, 45], 5: [37, 23], 6: [24.6, 39], 7: [31, 85], 8: [50.5, 32], 9: [59.5, 20], 10: [72, 23], 11: [80.5, 24], 12: [90, 58], 13: [86, 49], 14: [92, 83], 15: [98, 44], 16: [43, 91] };
  var ANAT = [
    { id: "A", short: "Plancha", name: "Cilindro portaplancha", d: "Lleva la plancha de aluminio con la imagen al derecho. Recibe primero agua y después tinta." },
    { id: "B", short: "Mantilla", name: "Cilindro portamantilla", d: "Cubierto por la mantilla de caucho: recibe la imagen invertida y la pasa al pliego." },
    { id: "C", short: "Impresión", name: "Cilindro de impresión", d: "Sujeta el pliego con sus pinzas (la barra amarilla) y lo presiona contra la mantilla." },
    { id: "D", short: "Transferencia", name: "Tambor de transferencia", d: "Entrega el pliego de un cuerpo al siguiente sin perder el registro." },
    { id: "E", short: "Entintado", name: "Batería de entintado", d: "Rodillos que convierten la tinta del tintero en una película fina y uniforme sobre la plancha." },
    { id: "F", short: "Mojado", name: "Mojado", d: "Rodillos que llevan la solución de mojado desde la batea hasta la plancha." }
  ];
  var TOUR = [
    { t: "1 · Alimentación", parts: [2, 1], view: 2, cap: "El marcador Preset Plus separa el pliego superior de la pila con aire (soplado y succión) y lo envía a la mesa. El sistema non-stop permite reponer la pila sin parar." },
    { t: "2 · Alineación y control", parts: [3, 4], view: 3, cap: "En la mesa, las escuadras colocan el pliego siempre en la misma posición y los sensores detectan dobles pliegos. Sin esta precisión no habría registro." },
    { t: "3 · Entintado y mojado", parts: [9, 8], view: 8, cap: "El tintero dosifica la tinta por zonas y la batería de rodillos la reparte en una película fina. El mojado Alcolor aplica agua: la tinta grasa solo se queda en la imagen." },
    { t: "4 · Plancha → mantilla → pliego", parts: [6, 5], view: 6, cap: "La plancha entintada pasa la imagen a la mantilla de caucho y esta la imprime en el pliego, que el cilindro de impresión presiona con sus pinzas. Es indirecto: offset." },
    { t: "5 · Cuatricromía", parts: [5, 7], view: "units", cap: "El pliego pasa por los cuatro cuerpos (negro, cian, magenta y amarillo) gracias a los tambores de transferencia, flotando sobre el AirTransfer sin rozar la tinta fresca." },
    { t: "6 · Barniz y secado", parts: [10, 11], view: 10, cap: "La unidad de barniz aplica una capa homogénea con rasqueta de cámara y el secador (IR + aire caliente) fija tinta y barniz." },
    { t: "7 · Salida", parts: [12, 13, 14], view: 14, cap: "Las cadenas llevan el pliego a la salida: el StaticStar descarga la estática y los frenos lo depositan sin marcas en una pila precisa." },
    { t: "8 · Control", parts: [15, 16], view: 15, cap: "Desde el Prinect Press Center 2 el maquinista ajusta tinta, agua y registro, y mide el color. La lubricación central automática mantiene la máquina disponible." }
  ];
  var GLOSSARY = [
    { id: "offset", t: "Offset (litografía offset)", d: "Impresión indirecta y planográfica: la plancha entintada pasa la imagen a una mantilla de caucho y esta al papel." },
    { id: "plancha", t: "Plancha", d: "Lámina de aluminio con la imagen grabada. Las zonas de imagen aceptan tinta y las demás, agua. Se usa una por color." },
    { id: "ctp", t: "CTP (Computer to Plate)", d: "Grabado de la plancha directamente desde el archivo digital con láser térmico o violeta, sin fotolito." },
    { id: "mantilla", t: "Mantilla", d: "Lámina de caucho sobre el cilindro portamantilla. Recibe la imagen de la plancha (invertida) y la pasa al pliego." },
    { id: "portaplancha", t: "Cilindro portaplancha", d: "Cilindro que lleva la plancha. Recibe agua de los mojadores y tinta de los entintadores." },
    { id: "impresion", t: "Cilindro de impresión", d: "Sujeta el pliego con pinzas y lo presiona contra la mantilla." },
    { id: "transferencia", t: "Tambor de transferencia", d: "Cilindro que entrega el pliego de un cuerpo impresor al siguiente sin perder el registro." },
    { id: "tintero", t: "Tintero", d: "Depósito de tinta con zonas regulables a lo ancho del pliego. En la CD 102, 500 incrementos por zona." },
    { id: "zona", t: "Zona de tintero", d: "Franja del ancho del pliego cuya cantidad de tinta se regula por separado según la imagen que contiene." },
    { id: "cip3", t: "CIP3 / CIP4", d: "Formatos que envían a la prensa datos de preimpresión (cobertura de tinta por zona) para preajustar los tinteros." },
    { id: "mojado", t: "Solución de mojado", d: "Agua con aditivos que cubre las zonas sin imagen de la plancha para que no acepten tinta." },
    { id: "equilibrio", t: "Equilibrio agua-tinta", d: "Proporción justa de agua y tinta: con poca agua aparece velo; con exceso, el color se lava." },
    { id: "pinza", t: "Pinza (margen de pinza)", d: "Franja del borde del pliego que sujetan las pinzas; ahí no se imprime. Ficha CD 102: 10–12 mm (el simulador usa 10 mm)." },
    { id: "areautil", t: "Área útil", d: "Parte del pliego donde se puede imprimir: el pliego menos la franja de pinza. Pliego 1000 × 700 mm con pinza de 10 mm → 1000 × 690 mm." },
    { id: "orientacion", t: "Orientación de la pieza", d: "Posición de la pieza en el pliego: con su lado corto o con su lado largo a lo ancho. Conviene la que da más piezas por pliego." },
    { id: "mordaza", t: "Blanco de mordaza", d: "Franja sin imagen del borde delantero de la plancha, que sujeta la mordaza (regleta) del cilindro portaplancha. En la CD 102 la imagen empieza a 43 mm del borde (52 mm opcional)." },
    { id: "sopladores", t: "Sopladores y succión", d: "Aire del marcador: los sopladores separan el pliego superior de la pila y las ventosas de succión lo levantan y lo llevan a la mesa." },
    { id: "contador", t: "Contador de tiraje", d: "Cuenta los pliegos que pasan por la máquina; separa la maculatura de los pliegos buenos." },
    { id: "registro", t: "Registro", d: "Coincidencia exacta de las cuatro planchas en el pliego. Se corrige en sentido circunferencial (avance) y lateral." },
    { id: "cruz", t: "Cruz de registro", d: "Marca impresa con las cuatro tintas en los bordes del pliego para revisar el registro." },
    { id: "tira", t: "Tira de control", d: "Fila de parches de color en el borde del pliego que se mide para controlar densidad y ganancia de punto." },
    { id: "densidad", t: "Densidad", d: "Medida de cuánta luz absorbe una tinta impresa; indica el grosor de la capa de tinta." },
    { id: "ganancia", t: "Ganancia de punto (TVI)", d: "Aumento del tamaño del punto de trama al imprimir: un parche del 50 % se ve más oscuro." },
    { id: "velo", t: "Velo", d: "Tinta que aparece en zonas sin imagen por falta de agua o por plancha dañada." },
    { id: "mota", t: "Mota (hickey)", d: "Punto con halo blanco causado por una partícula (piel de tinta, polvo de papel) en la plancha o la mantilla." },
    { id: "remosqueo", t: "Remosqueo", d: "Imagen doble o corrida en el sentido de avance del pliego: exceso de presión o mantilla floja." },
    { id: "maculatura", t: "Maculatura", d: "Pliegos que se gastan en la preparación hasta lograr el pliego OK." },
    { id: "pliegook", t: "Pliego OK", d: "Pliego aprobado y firmado que sirve de referencia para todo el tiraje." },
    { id: "sangrado", t: "Sangrado", d: "Excedente de imagen (3 mm o más) fuera de la línea de corte para evitar filetes blancos." },
    { id: "imposicion", t: "Imposición", d: "Distribución de las piezas en el pliego para aprovecharlo al máximo." },
    { id: "cmyk", t: "Cuatricromía (CMYK)", d: "Impresión con cian, magenta, amarillo y negro: una plancha y un cuerpo por color." },
    { id: "secuencia", t: "Secuencia de colores", d: "Orden en que se imprimen las tintas. La habitual en cuatricromía es K, C, M, Y." },
    { id: "presion", t: "Presión de impresión (squeeze)", d: "Compresión entre la mantilla y el cilindro de impresión, en centésimas de milímetro." },
    { id: "prueba", t: "Prueba de color", d: "Impresión de referencia (contractual) que muestra cómo debe verse el trabajo." },
    { id: "marcador", t: "Marcador", d: "Sección que separa los pliegos de la pila y los envía a la máquina." },
    { id: "barniz", t: "Barniz", d: "Capa transparente que protege la tinta y da brillo o mate." }
  ];
  var RIDDLES = [
    { item: "t-p1", ans: 2, txt: "«Donde el pliego empieza su viaje: uno a uno, con aire que sopla y aspira.»", ok: "Es el marcador Preset Plus (parte 2): separa los pliegos con aire preajustado.", hint: "Piensa en la primera sección de la prensa, donde está la pila de papel.", ctx: "El marcador decide si la máquina arranca bien: un pliego doble o torcido arruina todo lo que sigue." },
    { item: "d-p2", ans: 6, txt: "«Cambio la piel de los cilindros con solo pulsar un botón.»", ok: "Es AutoPlate (parte 6), el cambiador semiautomático de planchas.", hint: "La «piel» del cilindro portaplancha es la plancha.", ctx: "Cambiar planchas rápido reduce la preparación entre un trabajo y otro." },
    { item: "c-p3", ans: 8, txt: "«Agua y tinta en equilibrio; sin mí aparecen motas y velo.»", ok: "Es la batería de entintado y el mojado Alcolor (parte 8).", hint: "Busca la parte que reúne los rodillos de tinta y los de agua.", ctx: "El equilibrio agua-tinta es la base del offset: la tinta grasa y el agua se repelen." },
    { item: "g-p4", ans: 9, txt: "«Quinientos pasos por zona y una funda para limpiarme en un minuto.»", ok: "Es el tintero (parte 9): 500 incrementos por zona y funda para cambiar de tinta rápido.", hint: "¿Dónde se carga la tinta antes de que llegue a los rodillos?", ctx: "Cada zona del tintero dosifica la tinta de una franja del pliego." }
  ];
  var DEFS = [
    { id: "b", t: "Sistema de impresión directo en relieve: la plancha flexible entintada presiona el soporte y deja la imagen.", r: ["¿La plancha toca el papel en el ciclo que viste?", "En la animación, entre la plancha y el pliego siempre está la mantilla.", "La impresión directa en relieve con plancha flexible es la flexografía, típica de empaques y etiquetas."] },
    { id: "a", ok: true, t: "Sistema de impresión indirecto y planográfico: la plancha entintada transfiere la imagen a una mantilla de caucho y esta al papel; imagen y zonas sin imagen están al mismo nivel y se separan porque la tinta grasa y el agua se repelen." },
    { id: "d", t: "Impresión sin plancha: el archivo va directo a la máquina y el tóner se fija con calor.", r: ["¿Qué cilindro lleva la imagen grabada en el ciclo?", "El offset necesita una plancha por color (cuatro en cuatricromía).", "Sin plancha y con tóner es la impresión digital, rentable en tirajes cortos."] },
    { id: "c", t: "Sistema en el que la imagen está grabada en celdas hundidas de un cilindro y la tinta líquida se deposita en ellas.", r: ["¿La plancha que viste tiene huecos o es lisa?", "En offset la plancha es plana: imagen y no imagen están al mismo nivel (planográfico).", "Las celdas hundidas corresponden al huecograbado, usado en grandes tirajes."] }
  ];
  var FLIPS = [
    { id: "plancha", t: "Plancha", a: "Lámina de aluminio con la imagen grabada por CTP. La imagen acepta tinta; el resto, agua.", cd: "En la CD 102: 790 × 1030 mm y 0,20–0,30 mm de espesor; se cambia con AutoPlate (6)." },
    { id: "mantilla", t: "Mantilla", a: "Lámina de caucho que recibe la imagen invertida de la plancha y la pasa al pliego. Por ella el offset es indirecto.", cd: "En la CD 102 mide 840 × 1052 mm y 1,95 mm de espesor; su elasticidad copia la imagen con nitidez en papeles con textura y cartulinas." },
    { id: "impresion", t: "Cilindro de impresión", a: "Sujeta el pliego con pinzas y lo presiona contra la mantilla.", cd: "En la CD 102 el pliego viaja entre cuerpos sobre el colchón de aire del AirTransfer (7)." },
    { id: "mojado", t: "Solución de mojado", a: "Agua con aditivos que cubre las zonas sin imagen para que la tinta no se pegue ahí.", cd: "El mojado Alcolor con función Vario estabiliza el equilibrio agua-tinta (8)." }
  ];
  var ORD = ["Tintero: dosifica la tinta por zonas", "Batería de entintado: la reparte en una película fina", "Plancha: la tinta se queda solo en la imagen", "Mantilla: recibe la imagen invertida", "Pliego: la imagen queda al derecho"];
  var ORD_HINTS = [
    ["¿Dónde está la tinta antes de moverse?", "El tintero es el depósito con zonas regulables.", "En la CD 102 tiene 500 incrementos por zona."],
    ["Del tintero la tinta no salta directo a la plancha.", "Los rodillos de la batería la convierten en una película fina.", "Una película pareja da un color parejo."],
    ["¿Qué recibe la tinta de los rodillos entintadores?", "La plancha: la tinta se queda solo en la imagen porque el agua protege lo demás.", "Por eso la plancha se moja antes de entintarse."],
    ["Recuerda por qué se llama offset (indirecto).", "Entre la plancha y el papel siempre está la mantilla.", "La mantilla de caucho se adapta a la textura del papel."],
    ["¿Dónde termina el viaje?", "En el pliego, presionado por el cilindro de impresión.", "La imagen queda otra vez al derecho."]
  ];
  var SEQ = ["Seleccionar el cuerpo e iniciar «Cambio de plancha» en el pupitre", "Abrir la protección del cuerpo impresor", "La máquina posiciona el cilindro y abre la regleta: retirar la plancha usada",
    "Colocar la plancha nueva en la regleta delantera, apoyada en los topes de registro", "El cilindro gira, la plancha se envuelve y la regleta trasera la tensa", "Cerrar la protección y confirmar el cambio"];
  var SEQ_HINTS = [
    ["Todo empieza en el pupitre: la máquina debe saber qué cuerpo vas a cambiar.", "AutoPlate es semiautomático: el maquinista lo inicia desde el pupitre.", "Nunca se abre un cuerpo sin programar el cambio."],
    ["Antes de tocar la plancha hay que llegar al cilindro.", "La protección evita accidentes con los cilindros.", "La seguridad va antes que la velocidad."],
    ["No cabe una plancha nueva si la usada sigue sujeta.", "La regleta se abre con el cilindro en posición.", "La plancha usada se guarda si el trabajo se repetirá."],
    ["La plancha nueva entra por su borde de pinza.", "Los topes de registro fijan su posición exacta.", "Si la plancha no apoya en los topes, el registro saldrá corrido."],
    ["Con la plancha apoyada, ¿qué la fija alrededor del cilindro?", "El giro del cilindro envuelve la plancha y la regleta trasera la tensa.", "Una plancha floja provoca problemas de registro."],
    ["¿Qué falta antes de imprimir?", "Se cierra la protección y se confirma en el pupitre.", "La máquina no arranca con la protección abierta."]
  ];
  var INK_CANS = [
    { id: "K", name: "Negro proceso" }, { id: "C", name: "Cian proceso" }, { id: "M", name: "Magenta proceso" }, { id: "Y", name: "Amarillo proceso" },
    { id: "P485", name: "Pantone 485 C", hex: "#da291c" }, { id: "VAR", name: "Barniz acuoso", hex: "#dfeef3" }
  ];
  var DEFECTS = {
    reg: { n: 1, name: "Fuera de registro", act: "Corregir el registro circunferencial y lateral de los cuerpos corridos", why: "Las cruces de registro no coinciden: el cian y el amarillo están corridos respecto del negro.", fix: "Con el registro central a distancia, el maquinista mueve cada plancha hasta que su cruz coincide con la del negro.", hint: ["Mira la cruz de registro con el cuentahílos: ¿coinciden los cuatro colores?", "Cuando una plancha está desplazada aparecen halos de color en los bordes.", "Se corrige desde el pupitre con el registro central a distancia."] },
    scum: { n: 2, name: "Velo", act: "Subir el mojado del cuerpo del magenta", why: "Hay tinta magenta en una zona sin imagen: a la plancha le faltó agua.", fix: "Más agua vuelve a proteger las zonas sin imagen; si el velo sigue, hay que revisar la plancha.", hint: ["Fíjate en el margen, donde no debería haber tinta.", "Si la zona sin imagen recibe tinta, falló la protección del agua.", "El equilibrio agua-tinta mantiene limpias las zonas sin imagen."] },
    hick: { n: 3, name: "Mota (hickey)", act: "Parar, lavar la mantilla y limpiar la plancha", why: "Un punto oscuro con halo blanco: una partícula pegada a la plancha o a la mantilla.", fix: "La partícula está en la plancha o la mantilla: hay que limpiarlas. El mojado Alcolor con función Vario ayuda a prevenir las motas.", hint: ["Busca un punto pequeño con un anillo blanco en una zona oscura.", "Las motas vienen de partículas: piel de tinta o polvo de papel.", "Si se repite en el mismo lugar en cada pliego, la partícula está en la plancha o la mantilla."] },
    dbl: { n: 4, name: "Remosqueo", act: "Bajar la presión de impresión y revisar la tensión de la mantilla", why: "La imagen se ve doble en el sentido de avance: exceso de presión o mantilla floja.", fix: "Con la presión justa y la mantilla bien tensada, el punto se transfiere una sola vez.", hint: ["Compara los textos de las cuatro copias: ¿alguno se ve doble?", "El remosqueo duplica los bordes en el sentido en que avanza el pliego.", "Se corrige con la presión entre mantilla y cilindro de impresión."] }
  };
  var DEF_LIST = ["reg", "scum", "hick", "dbl"];
  var DEF_NAMES = ["Fuera de registro", "Velo", "Mota (hickey)", "Remosqueo"];
  var ANAGRAMS = [
    { id: "g-a1", w: "MANTILLA", clue: "Lámina de caucho que recibe la imagen de la plancha y la pasa al papel: por ella el offset es indirecto.", def: "Mantilla: recubrimiento de caucho del cilindro portamantilla.", ex: "En el taller, la mantilla recibió la imagen invertida de cada plancha y la imprimió al derecho en tu pliego." },
    { id: "g-a2", w: "TINTERO", clue: "Depósito con zonas regulables que dosifica la tinta; en la CD 102 tiene 500 incrementos por zona.", def: "Tintero: depósito de tinta con zonas regulables a lo ancho del pliego.", ex: "Abriste o cerraste el tintero de cada cuerpo hasta que la densidad entró en tolerancia." },
    { id: "g-a3", w: "REGISTRO", clue: "Coincidencia exacta de las cuatro planchas en el pliego; se revisa con cruces en los bordes.", def: "Registro: coincidencia de los colores, corregida en sentido circunferencial y lateral.", ex: "Moviste el cian, el magenta y el amarillo hasta que sus cruces coincidieron con la del negro." }
  ];
  var TR = [
    { id: "h-tr1", short: "la cartulina de 0,6 mm", q: "Una agencia trae un empaque en cartulina de 0,6 mm de espesor. ¿Puede imprimirse en la CD 102?", opts: [
      { t: "Sí: la CD 102 transporta soportes de 0,03 a 1 mm con el sistema AirTransfer.", ok: true, why: "El catálogo indica un rango de 0,03 a 1 mm; 0,6 mm está dentro. Por eso la CD 102 también imprime empaques." },
      { t: "No: el offset solo imprime papeles de hasta 0,3 mm.", r: ["Revisa el dato del AirTransfer (parte 7).", "El rango de soportes de la CD 102 va de 0,03 a 1 mm.", "Por eso se usa también para empaques y etiquetas."] },
      { t: "Solo si se imprime a 5 000 pliegos por hora.", r: ["¿La velocidad cambia el espesor que acepta la máquina?", "El límite lo da el transporte del pliego: de 0,03 a 1 mm.", "La velocidad se ajusta por calidad, no por espesor."] },
      { t: "Solo con planchas de 0,6 mm de espesor.", r: ["La plancha va en el cilindro: no depende del soporte.", "La plancha de la CD 102 mide de 0,20 a 0,30 mm.", "El espesor del soporte lo maneja el transporte del pliego."] }] },
    { id: "h-tr2", short: "el negro bajo", q: "En un tiraje, el negro mide 1,55 y la meta es 1,80 ± 0,10; agua, presión y registro están bien. ¿Qué haces primero?", opts: [
      { t: "Subir la presión de impresión.", r: ["La presión ya está en rango.", "Más presión aumenta la ganancia de punto y puede causar remosqueo; no corrige la carga de tinta.", "Cambia una variable a la vez: la que está fuera de rango."] },
      { t: "Abrir el tintero del cuerpo del negro y tirar otra prueba.", ok: true, why: "La densidad depende de la cantidad de tinta: si lo demás está en rango, se corrige en el tintero de ese cuerpo." },
      { t: "Bajar el mojado de todos los cuerpos.", r: ["El agua está bien y el problema es solo del negro.", "Bajar el agua sin necesidad puede provocar velo.", "Corrige solo el cuerpo con problema."] },
      { t: "Cambiar la plancha del negro.", r: ["¿La plancha tiene algún defecto?", "Una densidad baja con todo lo demás en rango es falta de tinta.", "Cambiar plancha cuesta tiempo y maculatura."] }] }
  ];
  var PRE_HINT = {
    plate: ["Revisa qué máquina vas a usar: la orden dice CD 102.", "La CD 102 usa planchas de 790 × 1030 mm (ficha técnica).", "Una plancha de otro formato no calza en los cilindros portaplancha."],
    sheet: ["El pliego debe estar entre el mínimo y el máximo de la máquina.", "CD 102: mínimo 34 × 48 cm, máximo 72 × 102 cm.", "La orden pide pliego de 70 × 100 cm."],
    bleed: ["¿Qué pasa si la guillotina se desvía 1 mm?", "Se recomiendan 3 mm de sangrado por lado.", "El sangrado evita filetes blancos en el borde del afiche."],
    fit: ["El arte con sangrado debe caber en el área útil (línea azul).", "Al pliego se le restan la pinza (10 mm), la tira de control y los márgenes de las marcas.", "Revisa el tamaño final: la orden pide A3 (297 × 420 mm)."],
    orient: ["Compara cuántas copias entran en A y en B.", "Girar la pieza 90° a veces aprovecha mejor el pliego.", "Más copias por pliego = menos pliegos y menos costo."],
    ppi: ["La resolución efectiva baja cuando agrandas el arte.", "Para offset se piden 300 ppp al tamaño final.", "Reduce el tamaño final o usa un archivo de mayor resolución."],
    marks: ["¿Cómo sabrá el maquinista si los colores coinciden?", "Las cruces de registro y la tira de control se imprimen fuera del corte.", "Sin tira de control no se puede medir la densidad."]
  };
  var HIP = { tinta: "Tinta y agua", registro: "Montaje y registro", presion: "Presión de impresión", arte: "Arte final" };

  /* ================= ESTADO ================= */
  var state = {
    name: "", score: 0, done: {}, tries: {}, gates: {}, ph: {}, sum: {}, streak: 0, bestStreak: 0, rankIdx: 0,
    student: null, startTs: null, endTs: null, current: 0, answers: {}, historial: [],
    hip: null, clues: [null, null, null, null], parts: {}, funcSeen: false, vchk: {}, defOk: false, flipped: {}, ordOk: false,
    job: { plate: "", tech: "thermal", sheet: "700x1000", bleed: 0, w: 297, h: 420, prop: true, marks: false, orient: null, art: "sample", artName: "", ctp: false },
    seqOk: false, plOrder: null, plateAt: [null, null, null, null], mounted: false,
    canOrder: null, inks: [null, null, null, null], levels: [0, 0, 0, 0], inkOk: false, lvlOk: false,
    ctl: { feed: [30, 30, 30, 30], water: [70, 70, 70, 70], press: 0.06, speed: 8000, cip3: false, reg: { C: [0, 0], M: [0, 0], Y: [0, 0] } },
    seed: null, prints: 0, okSheet: false, okCtl: null, okPrints: 0, lastMeas: null, signed: false, signName: "", dE: null,
    defects: {}, anaMix: [null, null, null], safeOpen: false, r1: "", r2: "", ticket: null, closed: false,
    cnt: { total: 0, mac: 0, good: 0 }, mset: 5000, goalHit: false, okMac: 0, ficha: { area: null, rows: {} }
  };
  var RT = { art: null, sample: null, sep: null, plates: null, L: null, ghost: null, ghostSep: null, okP: null, meas: null, ready: null };
  var V = { ok: false, fb: false, slot: "slot-hero", cur: null };
  var RESTORING = false, saveTimer = null, LS_KEY = "idc-offset-cd102-s06a4-v2", LS_ART = "idc-offset-cd102-arte-v1";

  /* ================= UTILIDADES ================= */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function norm(s) { return String(s || "").normalize("NFD").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function who() { return state.name || "maquinista"; }
  function reduced() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function fmt(n, d) { return Number(n).toFixed(d == null ? 2 : d).replace(".", ","); }
  function sign(v) { return (v > 0.004 ? "+" : v < -0.004 ? "−" : "") + fmt(Math.abs(v)); }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function shuffleNot(arr) { var a; do { a = shuffle(arr); } while (arr.length > 1 && a.join("|") === arr.join("|")); return a; }
  function partById(id) { for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === +id) return PARTS[i]; return null; }
  function canById(id) { for (var i = 0; i < INK_CANS.length; i++) if (INK_CANS[i].id === id) return INK_CANS[i]; return null; }
  function canHex(c) { return c.hex || PS.INKS[c.id].hex; }
  function countParts() { return Object.keys(state.parts).filter(function (k) { return state.parts[k]; }).length; }
  function countFlips() { return Object.keys(state.flipped).length; }
  function anaSolved() { return ANAGRAMS.filter(function (a) { return state.done[a.id] !== undefined; }).length; }
  function speedK() { return M.speed / 8000; }
  function hhmm(ts) { return new Date(ts).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }); }
  function loadScript(src) { return new Promise(function (ok, bad) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
  function cloneCanvas(src, w) { var c = document.createElement("canvas"), k = w / src.width; c.width = w; c.height = Math.round(src.height * k); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); return c; }
  function scrollTo(el, block) { if (el) el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: block || "start" }); }

  function toast(html) {
    if (RESTORING) return;
    var t = $("toast"); t.innerHTML = html; t.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 3400);
  }
  function sparks(ev) {
    if (RESTORING || reduced()) return;
    var x = window.innerWidth / 2, y = window.innerHeight / 2;
    if (ev && ev.clientX) { x = ev.clientX; y = ev.clientY; }
    else if (ev && ev.target && ev.target.getBoundingClientRect) { var r = ev.target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    var cols = ["#f3a100", "#0072b9", "#e6007e", "#00a0e3", "#ffd400"];
    for (var i = 0; i < 14; i++) {
      var s = document.createElement("span"); s.className = "spark";
      s.style.left = x + "px"; s.style.top = y + "px"; s.style.background = cols[i % cols.length];
      var a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
      s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d + "px");
      document.body.appendChild(s);
      (function (n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 950); })(s);
    }
  }

  /* ================= PUNTAJE ================= */
  function points(id) {
    var t = state.tries[id] || 0, m = ITEMS[id];
    if (t === 0) return m;
    if (t === 1) return Math.round(m * 0.6);
    return Math.max(1, Math.round(m * 0.3));
  }
  function logAnswer(id, resp, ok, pts) {
    if (RESTORING) return;
    var info = ITEM_INFO[id] || ["", id];
    var a = state.answers[id] || { estacion: STATION_NAMES[info[0]] || "", item: info[1], intentos: 0, correcto: false, puntos: 0 };
    if (a.correcto) return;
    a.intentos += 1; a.respuesta = resp == null ? "" : String(resp).slice(0, 200); a.t = Date.now();
    if (ok) { a.correcto = true; a.puntos = pts; a.alPrimerIntento = a.intentos === 1; }
    state.answers[id] = a;
    state.historial.push({ t: a.t, item: info[1], respuesta: a.respuesta, correcto: !!ok });
    if (state.historial.length > 400) state.historial.shift();
  }
  function award(id, p, ev, resp, first) {
    state.done[id] = p; state.score += p;
    logAnswer(id, resp, true, p);
    state.streak += 1; if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    updateHud(); sparks(ev);
    var msg = "<b>+" + p + " pts</b> · " + pick(PRAISE) + ", " + esc(who()) + ".";
    if (!first) msg = "<b>+" + p + " pts</b> · Lo lograste insistiendo, " + esc(who()) + ". Eso también es oficio.";
    if (state.streak === 3) msg += " Racha de 3: tienes buen ojo.";
    if (state.streak === 5) msg += " Racha de 5: ritmo de maquinista.";
    if (state.streak === 8) msg += " Racha de 8: nada se te escapa.";
    toast(msg); checkRank();
    return p;
  }
  function addScore(id, ev, resp) { if (state.done[id] !== undefined || !state.student) return 0; return award(id, points(id), ev, resp, !state.tries[id]); }
  function addFixed(id, p, ev, resp) { if (state.done[id] !== undefined || !state.student) return 0; return award(id, Math.min(ITEMS[id], p), ev, resp, true); }
  function miss(id, resp) { if (state.done[id] !== undefined) return; logAnswer(id, resp, false, 0); state.tries[id] = (state.tries[id] || 0) + 1; state.streak = 0; updateHud(); }
  function checkRank() {
    var idx = 0;
    for (var i = 0; i < RANKS.length; i++) if (state.score >= RANKS[i].min) idx = i;
    if (idx > state.rankIdx) {
      state.rankIdx = idx;
      if (!RESTORING) setTimeout(function () { toast("Subiste de rango: <b>" + RANKS[idx].name + "</b>. ¡Felicitaciones, " + esc(who()) + "!"); sparks(null); }, 1600);
    }
    $("rank").textContent = RANKS[state.rankIdx].name;
    var nx = RANKS[state.rankIdx + 1];
    $("nextrank").textContent = nx ? "Siguiente rango a " + nx.min + " pts" : "Rango máximo alcanzado";
  }
  function updateHud() {
    $("score").textContent = "● " + state.score + " pts";
    $("streak").textContent = "Racha: " + state.streak + (state.bestStreak > 2 ? " · mejor " + state.bestStreak : "");
    var g = 0; STATION_ORDER.forEach(function (s) { if (state.gates[s]) g++; });
    $("progbar").style.width = (g / STATION_ORDER.length * 100) + "%";
    var sl = $("slots").children;
    for (var j = 0; j < 4; j++) { var got = state.clues[j] !== null; sl[j].textContent = got ? state.clues[j] : "?"; sl[j].className = got ? "got" : ""; }
    renderKpis(); scheduleSave();
  }
  function renderOk(el, title, why) { el.innerHTML = '<div class="ok"><strong>✓ ' + title + '</strong> ' + why + '</div>'; }
  function renderRetry(el, pista, dato, ctx, extra) {
    el.innerHTML = '<div class="retry"><p class="pausa">Aún no, pero vas por buen camino. Tómate un momento y revisa esto:</p>' +
      (extra ? '<p style="margin:0 0 6px">' + extra + '</p>' : '') +
      '<dl><dt>Pista</dt><dd>' + pista + '</dd><dt>Dato clave</dt><dd>' + dato + '</dd><dt>Contexto</dt><dd>' + ctx + '</dd></dl>' +
      '<p class="re">Vuelve a intentarlo con esa pista en mente. Cada intento te acerca.</p></div>';
  }

  /* ================= ESTACIONES Y FASES ================= */
  function markDone(id) {
    var sec = $(id); sec.classList.add("done");
    var d = $(id + "done"); if (d && state.sum[id]) { d.innerHTML = "<b>Estación superada.</b> " + state.sum[id]; d.classList.add("on"); }
  }
  function completeStation(id, summary) {
    if (state.gates[id]) return;
    state.gates[id] = true; state.sum[id] = summary || "";
    state.current = STATION_ORDER.filter(function (g) { return state.gates[g]; }).length;
    markDone(id);
    var nx = STATION_ORDER[STATION_ORDER.indexOf(id) + 1];
    if (nx) unlock(nx);
    updateHud(); renderFlow();
  }
  function unlock(id) {
    var s = $(id); if (!s || !s.classList.contains("locked")) return;
    s.classList.remove("locked");
    var b = s.querySelector(".st-body"); b.removeAttribute("inert"); b.removeAttribute("aria-hidden");
    onUnlock(id);
    if (!RESTORING) setTimeout(function () { scrollTo(s); }, 900);
  }
  function onUnlock(id) {
    if (id === "sT") { renderParts(); checkTour(); }
    if (id === "s3") RT.ready.then(function () { if (!RT.art) RT.art = RT.sample; refreshJob(); });
  }
  function markPhase(p) { var el = $(p); el.classList.add("done"); $(p + "st").textContent = "✓ Completado"; }
  function phaseUnlock(p) {
    var el = $(p); if (!el.classList.contains("ph-locked")) return;
    el.classList.remove("ph-locked"); $(p + "st").textContent = "En curso";
    if (p === "p5") RT.ready.then(renderReview);
    if (p === "p3") renderInks();
    if (p === "p4") { renderPcRoll(); schedule3D(); }
    if (!RESTORING) setTimeout(function () { scrollTo(el); }, 700);
  }
  function phaseDone(p) {
    if (state.ph[p]) return;
    state.ph[p] = true; markPhase(p);
    var nx = PHASES[PHASES.indexOf(p) + 1];
    if (nx) phaseUnlock(nx);
    else completeStation("s3", "Pliego OK firmado con " + state.okPrints + " mediciones (" + fmtN(state.okMac) + " pliegos de maculatura) y los 4 defectos del pliego de anoche diagnosticados.");
    renderFlow(); scheduleSave();
  }

  /* ================= INICIO Y FICHA ================= */
  function validMail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function initStart() {
    $("mail").addEventListener("input", function () {
      var v = this.value.trim(), m = $("mailMsg");
      if (!v) { m.textContent = ""; m.className = "hint"; this.className = ""; return; }
      if (validMail(v)) { m.textContent = "✓ Correo válido"; m.className = "hint y"; this.className = "val"; }
      else { m.textContent = "Revisa el formato: nombre@dominio.com"; m.className = "hint n"; this.className = "inv"; }
    });
    $("btnStart").addEventListener("click", function (ev) {
      var n = $("nom").value.trim(), ap = $("ape").value.trim(), m = $("mail").value.trim().toLowerCase();
      if (n.length < 2) { $("startMsg").textContent = "Escribe tu nombre para que el taller sepa quién está en la máquina."; $("nom").focus(); return; }
      if (ap.length < 2) { $("startMsg").textContent = "Escribe tus apellidos: aparecerán en tu informe."; $("ape").focus(); return; }
      if (!validMail(m)) { $("startMsg").textContent = "Escribe un correo válido: con él tu docente identifica tu informe."; $("mail").focus(); return; }
      var first = !state.student;
      state.name = n; state.student = { nombres: n, apellidos: ap, email: m };
      if (!state.startTs) state.startTs = Date.now();
      if (!state.seed) state.seed = PS.makeSeed();
      $("startMsg").textContent = "¡Bienvenido al taller, " + n + "!";
      if (first) { toast("Turno iniciado. <b>Bienvenido, " + esc(n) + ".</b> Don Ernesto confía en ti."); sparks(ev); }
      unlock("s1"); renderFlow(); scheduleSave();
    });
  }

  /* ================= VISOR 3D ================= */
  var INFO0 = '<p class="eyebrow">Explora</p><h4>Toca un número o una sección</h4><p>Cada número es una parte del catálogo de la máquina. Usa 🎬 Funcionamiento para seguir el viaje del pliego, o 👁 Transparencia y 💧 Agua y tinta para ver la maquinaria por dentro mientras imprime.</p>';
  function webglOk() { try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch (e) { return false; } }

  function pressSvg() {
    var u = [250, 370, 490, 610], inks = ["#1d1d1b", "#00a0e3", "#e6007e", "#ffd400"];
    var s = '<svg viewBox="0 0 1000 300" class="press-svg" role="img" aria-label="Esquema lateral de la prensa: marcador, mesa, cuatro cuerpos impresores, barniz, secador, salida y pupitre"><defs><marker id="mkp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0072b9"/></marker></defs>';
    s += '<rect x="0" y="282" width="1000" height="18" fill="#e2e0da"/>';
    s += '<rect x="22" y="44" width="96" height="238" fill="none" stroke="#9aa0a6" stroke-width="3"/><rect x="34" y="150" width="72" height="120" fill="#fff" stroke="#555553"/><rect x="40" y="60" width="60" height="16" fill="#0072b9"/><text x="70" y="36" text-anchor="middle" class="t">Marcador</text>';
    s += '<path d="M118 150 L198 172" stroke="#555553" stroke-width="5"/>';
    u.forEach(function (x, i) {
      s += '<rect x="' + (x - 50) + '" y="44" width="100" height="238" rx="6" fill="#f3f4f5" stroke="#b9bfc4" stroke-width="2"/>';
      s += '<rect x="' + (x - 46) + '" y="48" width="92" height="7" fill="' + inks[i] + '"/>';
      s += '<path d="M' + (x - 32) + ' 62 h44 l-8 14 h-28z" fill="#3b4045"/>';
      s += '<circle cx="' + (x - 20) + '" cy="88" r="7" fill="#6d747a"/><circle cx="' + (x + 2) + '" cy="84" r="7" fill="#6d747a"/><circle cx="' + (x + 22) + '" cy="92" r="6" fill="#6d747a"/>';
      s += '<circle cx="' + (x - 4) + '" cy="118" r="20" fill="#c8d0d6" stroke="#555553"/><circle cx="' + (x + 24) + '" cy="132" r="7" fill="#a7b4bf"/><rect x="' + (x + 22) + '" y="140" width="22" height="9" fill="#5fb3e8"/>';
      s += '<circle cx="' + (x - 6) + '" cy="160" r="20" fill="#2b3a4a"/><circle cx="' + x + '" cy="214" r="34" fill="#8f989f"/>';
      s += '<circle cx="' + (x + 60) + '" cy="226" r="22" fill="#7d868e"/><rect x="' + (x + 38) + '" y="256" width="44" height="5" fill="#7fd0ff"/>';
      s += '<text x="' + x + '" y="36" text-anchor="middle" class="t">Cuerpo ' + (i + 1) + '</text>';
    });
    s += '<rect x="670" y="44" width="100" height="238" rx="6" fill="#f3f4f5" stroke="#b9bfc4" stroke-width="2"/><circle cx="720" cy="214" r="34" fill="#8f989f"/><circle cx="714" cy="160" r="20" fill="#6b7f8d"/><circle cx="734" cy="128" r="10" fill="#5a4636"/><rect x="742" y="108" width="14" height="22" fill="#0072b9"/><text x="720" y="36" text-anchor="middle" class="t">Barniz</text>';
    s += '<path d="M770 112 L940 112" stroke="#3b4045" stroke-width="5"/><rect x="772" y="64" width="80" height="22" fill="#d9532c" opacity=".85"/><text x="812" y="58" text-anchor="middle" class="t">Secador</text>';
    s += '<rect x="880" y="218" width="76" height="62" fill="#fff" stroke="#555553"/><text x="918" y="208" text-anchor="middle" class="t">Salida</text>';
    s += '<line x1="830" y1="150" x2="890" y2="150" stroke="#2a7fff" stroke-width="4"/><circle cx="900" cy="175" r="6" fill="#2b3a4a"/>';
    s += '<rect x="964" y="150" width="30" height="40" fill="#3b4045"/><rect x="961" y="120" width="36" height="24" fill="#0072b9"/><text x="979" y="210" text-anchor="middle" class="t">Pupitre</text>';
    s += '<line x1="200" y1="272" x2="700" y2="272" stroke="#f3a100" stroke-width="3" stroke-dasharray="4 4"/>';
    s += '<path class="sheetpath" d="M70 148 L118 148 L198 174 L245 181 Q275 197 305 186 L365 181 Q395 197 425 186 L485 181 Q515 197 545 186 L605 181 Q635 197 665 186 L715 181 L770 112 L870 112 Q905 150 918 216" fill="none" stroke="#0072b9" stroke-width="3" stroke-dasharray="10 8" marker-end="url(#mkp)"/>';
    return s + '</svg>';
  }
  function hotButtons() {
    return PARTS.map(function (p) {
      var h = HOT[p.id];
      return '<button type="button" class="hot' + (state.parts[p.id] ? " seen" : "") + '" data-part="' + p.id + '" style="left:' + h[0] + '%;top:' + h[1] + '%" aria-label="Parte ' + p.id + ': ' + esc(p.name) + '">' + p.id + '</button>';
    }).join("");
  }
  function fbHighlight(ids) { [].forEach.call(document.querySelectorAll(".hot"), function (b) { b.classList.toggle("on", ids.indexOf(+b.getAttribute("data-part")) >= 0); }); }
  function viewerFallback(msg) {
    V.fb = true; $("vLoad").hidden = true;
    var f = $("vFallback"); f.hidden = false;
    f.innerHTML = '<p>' + esc(msg) + '</p><div class="svg-hot">' + pressSvg() + hotButtons() + '</div>';
    ["vZin", "vZout", "vHint", "vXray", "vFlows"].forEach(function (id) { $(id).hidden = true; });
    document.querySelector(".v-zoomr").hidden = true;
  }
  function initViewer() {
    $("vInfo").innerHTML = INFO0;
    $("vSecs").innerHTML = Object.keys(SECTIONS).map(function (k) { return '<button type="button" data-sec="' + k + '">' + SECTIONS[k].ic + " " + SECTIONS[k].name + '</button>'; }).join("");
    $("vSecs").addEventListener("click", function (e) { var b = e.target.closest("[data-sec]"); if (b) showSection(b.getAttribute("data-sec")); });
    $("vFallback").addEventListener("click", function (e) { var b = e.target.closest(".hot"); if (b) showPart(+b.getAttribute("data-part")); });
    $("vInfo").addEventListener("click", function (e) {
      var b = e.target.closest("[data-part]"); if (b) { showPart(+b.getAttribute("data-part")); return; }
      var a = e.target.closest("[data-anat]"); if (a) showAnat(a.getAttribute("data-anat"));
    });
    $("vTour").addEventListener("click", startTour);
    $("vXray").addEventListener("click", function () {
      if (!V.ok) return;
      var on = P3.getXray() === 0;
      setXrayUI(on ? +$("vXrayR").value / 100 : 0);
      $("vInfo").innerHTML = on ? xrayInfo() : INFO0;
    });
    $("vXrayR").addEventListener("input", function () { setXrayUI(+this.value / 100); });
    $("vFlows").addEventListener("click", function () {
      if (!V.ok) return;
      var on = !P3.flowsOn(); P3.setFlows(on); this.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) { if (P3.getXray() < 0.5) setXrayUI(0.8); syncFlows(); P3.focus({ unit: 1 }); $("vInfo").innerHTML = FLOW_INFO; }
      else $("vInfo").innerHTML = INFO0;
    });
    $("vHome").addEventListener("click", function () { if (V.ok) { P3.focus("home"); P3.highlight([]); } else fbHighlight([]); $("vInfo").innerHTML = INFO0; V.cur = null; renderParts(); });
    $("vFull").addEventListener("click", toggleBig);
    document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && !$("viewer").classList.contains("big")) bigLabel(false); if (V.ok) setTimeout(P3.resize, 80); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("viewer").classList.contains("big")) setBig(false); });
    $("vZin").addEventListener("click", function () { if (V.ok) P3.zoom(0.85); });
    $("vZout").addEventListener("click", function () { if (V.ok) P3.zoom(1.18); });
    $("vZoomR").addEventListener("input", function () { V.zDrag = true; if (V.ok) P3.setZoom(+this.value / 100); $("vZoomV").textContent = this.value + " %"; });
    $("vZoomR").addEventListener("change", function () { V.zDrag = false; });
    if (!webglOk()) { viewerFallback("Tu navegador no tiene WebGL: verás el esquema 2D de la prensa, con las mismas partes."); return; }
    var a = window.THREE ? Promise.resolve() : loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
    var b = window.anime ? Promise.resolve() : loadScript("https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js").then(null, function () { return null; });
    Promise.all([a, b]).then(function () {
      return P3.init({ stage: $("vStage"), labels: $("vLabels"), parts: PARTS, anat: ANAT, reduced: reduced(), hooks: { onPart: function (id) { showPart(id); }, onAnat: showAnat, onZoom: onZoomHook, onSheet: function () { if (SOUND.isOn()) SOUND.sheetIn(); } } });
    }).then(function () {
      V.ok = true; $("vLoad").hidden = true; renderParts(); sync3D(); syncMachine();
    }, function () { viewerFallback("No se pudo cargar la vista 3D (revisa tu conexión a internet): verás el esquema 2D de la prensa, con las mismas partes."); });
  }

  function mountViewer(id) {
    if (V.slot === id) return;
    var slot = $(id); if (!slot) return;
    slot.appendChild($("viewer"));
    [].forEach.call(document.querySelectorAll(".v-slot"), function (s) { s.classList.toggle("has-v", s.id === id); });
    V.slot = id; $("viewer").setAttribute("data-mode", slot.getAttribute("data-mode") || "");
    if (V.ok) setTimeout(P3.resize, 40);
  }
  function initSlots() {
    [].forEach.call(document.querySelectorAll("[data-bring]"), function (b) { b.addEventListener("click", function () { mountViewer(b.getAttribute("data-bring")); }); });
    $("simToggle").addEventListener("click", function () {
      var side = $("simSide"), on = !side.classList.contains("collapsed");
      side.classList.toggle("collapsed", on); this.setAttribute("aria-expanded", !on); this.textContent = on ? "Mostrar prensa" : "Ocultar prensa";
    });
    if (!("IntersectionObserver" in window)) return;
    var ratios = {};
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { ratios[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      if (document.fullscreenElement || tour.on || $("viewer").classList.contains("big")) return;
      var best = null, br = 0.3;
      Object.keys(ratios).forEach(function (id) {
        var s = $(id); if (s.closest(".locked") || s.offsetParent === null || s.closest(".collapsed")) return;
        if (ratios[id] > br) { br = ratios[id]; best = id; }
      });
      if (best && best !== V.slot) mountViewer(best);
    }, { threshold: [0, 0.15, 0.3, 0.5, 0.75, 1] });
    [].forEach.call(document.querySelectorAll(".v-slot"), function (s) { io.observe(s); });
  }
  function goViewer() { var s = $(V.slot); if (s) scrollTo(s, "center"); }

  function showPart(id) {
    var p = partById(id); if (!p) return;
    V.cur = id;
    $("vInfo").innerHTML = '<p class="eyebrow">' + SECTIONS[p.sec].ic + " " + SECTIONS[p.sec].name + ' · parte ' + p.id + ' del catálogo</p><h4>' + esc(p.name) + '</h4><p>' + p.d + '</p><p class="why"><b>Por qué importa:</b> ' + p.why + '</p>' + (p.dato ? '<span class="dato">' + p.dato + '</span>' : '');
    if (V.ok) { P3.focus(id); P3.highlight([id]); } else fbHighlight([id]);
    markPart(id);
  }
  function showAnat(id) {
    var a = null; ANAT.forEach(function (x) { if (x.id === id) a = x; });
    if (!a) return;
    $("vInfo").innerHTML = '<p class="eyebrow">Anatomía del cuerpo impresor · ' + a.id + '</p><h4>' + esc(a.name) + '</h4><p>' + a.d + '</p><div class="row" style="margin-top:4px">' + ANAT.map(function (x) { return '<button type="button" class="pchip" data-anat="' + x.id + '"' + (x.id === id ? ' aria-current="true"' : '') + '><b>' + x.id + '</b>' + esc(x.short) + '</button>'; }).join("") + '</div>';
  }
  function showSection(key) {
    var S = SECTIONS[key];
    $("vInfo").innerHTML = '<p class="eyebrow">Sección</p><h4>' + S.ic + " " + S.name + '</h4><p>' + S.d + '</p><div class="row" style="margin-top:4px">' +
      S.parts.map(function (id) { var p = partById(id); return '<button type="button" class="pchip' + (state.parts[id] ? " seen" : "") + '" data-part="' + id + '"><b>' + id + '</b>' + esc(p.short) + '</button>'; }).join("") + '</div>';
    if (V.ok) { P3.focus(S.focus); P3.highlight(S.parts); } else fbHighlight(S.parts);
  }
  function markPart(id) {
    if (state.parts[id]) { renderParts(); return; }
    state.parts[id] = true; renderParts();
    var n = countParts();
    if (state.student && state.gates.s1) {
      if (n === 12) toast("¡<b>12 partes</b> exploradas, " + esc(who()) + "! Ya conoces la máquina por dentro.");
      else if (n === 16) toast("¡Exploraste las <b>16 partes</b> del catálogo! Recorrido completo.");
      else if (n % 4 === 0) toast("Llevas <b>" + n + " de 16</b> partes. ¡Sigue así!");
    }
    checkTour(); scheduleSave();
  }
  function renderParts() {
    var n = countParts();
    $("partsCount").textContent = n + " de 16"; $("partsBar").style.width = (n / 16 * 100) + "%";
    $("funcState").textContent = state.funcSeen ? "✓ visto" : "pendiente";
    var h = "";
    Object.keys(SECTIONS).forEach(function (k) {
      var S = SECTIONS[k];
      h += '<div class="pgroup"><h4>' + S.ic + " " + S.name + '</h4><div class="pchips">' + S.parts.map(function (id) {
        var p = partById(id);
        return '<button type="button" class="pchip' + (state.parts[id] ? " seen" : "") + '" data-part="' + id + '"' + (V.cur === id ? ' aria-current="true"' : '') + '><b>' + id + '</b>' + esc(p.name) + '</button>';
      }).join("") + '</div></div>';
    });
    $("partsGrid").innerHTML = h;
    [].forEach.call(document.querySelectorAll(".v-lbl[data-part], .hot"), function (b) { b.classList.toggle("seen", !!state.parts[+b.getAttribute("data-part")]); });
  }

  var tour = { on: false, i: 0, timer: null, seen: {} };
  function startTour() {
    tour.on = true; tour.i = 0; tour.seen = {};
    showTourStep();
  }
  function showTourStep() {
    var s = TOUR[tour.i], last = tour.i === TOUR.length - 1, cap = $("vCap");
    tour.seen[tour.i] = true;
    cap.hidden = false;
    cap.innerHTML = '<b>' + s.t + '</b> <span class="mono">· ' + (tour.i + 1) + '/' + TOUR.length + '</span><br>' + s.cap +
      '<div class="row"><button type="button" class="v-btn" id="tPrev"' + (tour.i ? '' : ' disabled') + '>◀ Anterior</button><button type="button" class="v-btn" id="tNext">' + (last ? "Terminar ✓" : "Siguiente ▶") + '</button><button type="button" class="v-btn" id="tStop">✕ Salir</button></div>';
    $("tPrev").addEventListener("click", function () { if (tour.i > 0) { tour.i--; showTourStep(); } });
    $("tNext").addEventListener("click", nextTourStep);
    $("tStop").addEventListener("click", function () { endTour(false); });
    if (V.ok) { P3.focus(s.view); P3.highlight(s.parts); P3.setRunning(true, 0.9); P3.setFeeding(true); P3.setImpression(true); } else fbHighlight(s.parts);
    SOUND.update({ run: true, speed: 7200, air: true, feed: true, imp: true });
    clearTimeout(tour.timer);
    if (!reduced()) tour.timer = setTimeout(nextTourStep, 8000);
  }
  function nextTourStep() { if (!tour.on) return; if (tour.i < TOUR.length - 1) { tour.i++; showTourStep(); } else endTour(true); }
  function endTour(completed) {
    clearTimeout(tour.timer); tour.on = false; $("vCap").hidden = true;
    if (V.ok) { P3.highlight([]); P3.focus("home"); } else fbHighlight([]);
    syncMachine();
    if (completed && Object.keys(tour.seen).length === TOUR.length) {
      var first = !state.funcSeen; state.funcSeen = true; renderParts();
      if (first) toast("¡Viste el <b>funcionamiento completo</b>! El pliego ya no tiene secretos para ti.");
      checkTour(); scheduleSave();
    }
  }
  function checkTour() {
    if (!state.gates.s1 || !state.student) return;
    if (countParts() >= 12) addScore("t-parts", null, countParts() + " partes");
    if (state.funcSeen) addScore("t-func", null, "Funcionamiento completo");
    if (countParts() >= 12 && state.funcSeen && state.clues[0] !== null)
      completeStation("sT", "Exploraste " + countParts() + " partes, viste el funcionamiento completo y resolviste la pista 1.");
  }
  function sync3D() {
    if (!V.ok) return;
    if (RT.plates && state.mounted) PS.ORDER.forEach(function (k, i) { P3.setPlate(i, RT.plates[k], k, PS.INKS[k].hex, false); });
    state.inks.forEach(function (id, i) { if (id) P3.setInk(i, PS.INKS[id].hex, state.levels[i], false); });
    if (state.prints && RT.sep) {
      var m = PS.measure(state.okSheet ? state.okCtl : state.ctl, state.seed);
      P3.setPile(PS.composite(RT.sep, PS.paramsFrom(m), { w: 512 }));
      P3.setScreen(screenData(m, state.okSheet));
    }
    syncFlows(); schedule3D();
  }
  function screenData(m, ok) {
    return { status: ok ? "PLIEGO OK ✓" : "Prueba " + state.prints, rows: PS.ORDER.map(function (k) { var r = m.inks[k], ink = PS.INKS[k]; return { k: k, D: r.D, target: ink.target, tol: ink.tol, ok: r.dOk, hex: ink.hex }; }) };
  }

  /* ================= VISOR: TRANSPARENCIA, FLUJOS Y AMPLIAR ================= */
  var FLOW_INFO = '<p class="eyebrow">Circulación de agua y tinta</p><h4>Flechas en los rodillos de cada cuerpo</h4><p><b style="color:#0a7fc4">Gotas celestes:</b> el agua sube de la batea por los mojadores y llega primero a la plancha. <b>Flechas del color de la tinta:</b> la tinta baja del tintero por la batería de rodillos hasta la plancha y, desde ahí, pasa a la mantilla y al pliego. Las flechas crecen con el agua o la tinta que ajustas en el pupitre y circulan más rápido con la máquina en marcha.</p><p class="small">Antes de cargar tintas se muestran los colores de proceso como demostración. El efecto sobre la plancha y la mantilla se ve en el diagrama de la Estación 2 y en el del pupitre.</p>';
  function xrayInfo() {
    return '<p class="eyebrow">Transparencia</p><h4>Mira la maquinaria por dentro</h4><p>Carcasas, laterales y tapas se vuelven transparentes, también mientras imprimes. Ajusta el nivel con el regulador. En el cuerpo 2 aparecen las letras de su anatomía:</p><div class="row" style="margin-top:4px">' +
      ANAT.map(function (a) { return '<button type="button" class="pchip" data-anat="' + a.id + '"><b>' + a.id + '</b>' + esc(a.name) + '</button>'; }).join("") + '</div>';
  }
  function setXrayUI(level) {
    var on = level > 0;
    $("vXray").setAttribute("aria-pressed", on ? "true" : "false"); $("vXrWrap").hidden = !on;
    if (on) { $("vXrayR").value = Math.round(level * 100); $("vXrayV").textContent = Math.round(level * 100) + " %"; }
    if (V.ok) P3.setXray(level);
  }
  function bigLabel(on) { $("vFull").setAttribute("aria-pressed", on ? "true" : "false"); $("vFull").textContent = on ? "✕ Reducir" : "⛶ Ampliar"; }
  /* El visor ampliado se cuelga del body para quedar por encima de la barra superior y de la columna fija del taller. */
  function setBig(on) {
    var v = $("viewer");
    if (on) document.body.appendChild(v); else { var slot = $(V.slot); if (slot) slot.appendChild(v); }
    v.classList.toggle("big", on); document.body.classList.toggle("v-lock", on); bigLabel(on); if (V.ok) setTimeout(P3.resize, 60);
  }
  function toggleBig() {
    var v = $("viewer");
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (v.classList.contains("big")) { setBig(false); return; }
    if (v.requestFullscreen) v.requestFullscreen().then(function () { bigLabel(true); }, function () { setBig(true); });
    else setBig(true);
  }
  function onZoomHook(z) { if (V.zDrag) return; var v = Math.round(z * 100); $("vZoomR").value = Math.max(100, Math.min(800, v)); $("vZoomV").textContent = v + " %"; }
  function syncFlows() {
    if (!V.ok) return;
    PS.ORDER.forEach(function (k, i) {
      var real = !!state.inks[i] && !!state.seed;
      P3.setFlowLevels(i, real ? { inkOn: true, plateOn: !!state.mounted, inkHex: PS.INKS[k].hex, inkRel: state.ctl.feed[i] / state.seed.ideal[k], waterRel: state.ctl.water[i] / 45 }
        : { inkOn: true, plateOn: true, inkHex: PS.INKS[k].hex, inkRel: 1, waterRel: 1 });
    });
  }
  var surfT = 0;
  function schedule3D() { clearTimeout(surfT); surfT = setTimeout(update3DSurfaces, 300); }
  function stagesFor(P) { return [1, 2, 3, 4].map(function (n) { return PS.composite(RT.sep, P, { w: 512, inks: PS.ORDER.slice(0, n) }); }); }
  /* La plancha muestra la tinta y el agua de su cuerpo; la mantilla, la imagen invertida que recibe al imprimir. */
  function update3DSurfaces() {
    syncFlows();
    if (!V.ok || !RT.sep || !state.mounted || !state.seed) return;
    var P = PS.paramsFrom(PS.measure(state.ctl, state.seed)), blanket = state.prints > 0 || printingState();
    PS.ORDER.forEach(function (k, i) {
      if (!state.inks[i]) return;
      P3.setPlateSurface(i, PS.cylSurface(RT.sep, k, P, "plate"));
      if (blanket) P3.setBlanket(i, PS.cylSurface(RT.sep, k, P, "blanket"));
    });
    if (printingState() && state.inkOk) P3.setStages(stagesFor(P));
  }

  /* ================= CONSOLA DE MARCHA ================= */
  /* Secuencia simplificada (didáctica): aviso → marcha → aire → marcador → impresión. Velocidad máx. 15 000 pl/h (catálogo);
     la máquina gira a velocidad de preparación (hasta 5 000 pl/h) hasta que se activa la impresión. */
  var M = { run: false, air: false, feed: false, imp: false, speed: 0, hornAt: 0, estop: false, acc: 0, last: 0, timer: 0, sndAcc: 0 };
  var PREP_MAX = 5000, SPEED_MIN = 3000, SPEED_MAX = 15000;
  function fmtN(n) { return Math.round(n || 0).toLocaleString("es-PE"); }
  function cnMsg(html, kind) { var el = $("cnMsg"); el.innerHTML = html; el.className = "cn-msg" + (kind ? " " + kind : ""); }
  function printingState() { return M.run && M.air && M.feed && M.imp && !M.estop; }
  function inPress() { return !!state.ph.p3 && !$("p4").classList.contains("ph-locked"); }
  function seqError(msg) {
    cnMsg("⚠ " + msg, "warn");
    if (inPress() && state.done["e-start"] === undefined) miss("e-start", msg.replace(/<[^>]+>/g, "").slice(0, 80));
  }
  function openConsole() {
    $("vConsole").classList.remove("collapsed"); $("cnToggle").setAttribute("aria-expanded", "true");
    if ($("simSide").classList.contains("collapsed")) $("simToggle").click();
  }
  function goal() { var n = RT.L && state.job.ctp ? RT.L.chosen.n : 4; return Math.ceil(1000 / Math.max(1, n)); }
  function okNow() { return !!(state.seed && state.mounted && state.inkOk && state.lvlOk) && PS.measure(state.ctl, state.seed).ok; }
  function countSheets(n, printed) {
    var c = state.cnt;
    c.total += n;
    if (printed && okNow()) c.good += n; else c.mac += n;
    if (!V.ok && SOUND.isOn()) { M.sndAcc += n; if (M.sndAcc >= 1) { M.sndAcc = 0; SOUND.sheetIn(); } }
    if (!state.goalHit && c.good >= goal()) { state.goalHit = true; toast("🏁 ¡Tiraje completo! <b>" + fmtN(goal()) + " pliegos buenos</b> = 1 000 afiches."); }
    scheduleSave();
  }
  function startTicker() { if (M.timer) return; M.last = performance.now(); M.timer = setInterval(machTick, 100); }
  function machTick() {
    var now = performance.now(), dt = Math.min(0.3, (now - M.last) / 1000); M.last = now;
    var target = M.run ? (M.imp ? state.mset : Math.min(state.mset, PREP_MAX)) : 0;
    if (M.speed < target) M.speed = Math.min(target, M.speed + 1800 * dt);
    else if (M.speed > target) M.speed = Math.max(target, M.speed - 3200 * dt);
    if (M.run && M.feed && M.speed > 0) { M.acc += M.speed / 3600 * dt; var n = Math.floor(M.acc); if (n > 0) { M.acc -= n; countSheets(n, M.imp); } }
    if (!M.run && M.speed <= 0) { clearInterval(M.timer); M.timer = 0; }
    syncMachine(); renderConsoleLive();
  }
  function syncMachine() {
    if (tour.on) return;
    if (V.ok) { P3.setRunning(M.run || M.speed > 0, M.speed / 8000); P3.setFeeding(M.feed && M.run); P3.setImpression(M.imp); }
    SOUND.update({ run: M.run || M.speed > 0, speed: M.speed, air: M.air, feed: M.feed, imp: M.imp });
  }
  function renderWaste() { if ($("pcWaste")) $("pcWaste").textContent = "Maculatura: " + fmtN(state.cnt.mac) + " pliegos · " + state.prints + (state.prints === 1 ? " medición" : " mediciones"); }
  function renderConsoleLive() {
    var lamp = M.estop ? "estop" : printingState() ? "print" : (M.run && M.feed) ? "feed" : M.run ? "ready" : "";
    if (!M.run && !M.estop && Date.now() - M.hornAt < 1500) lamp = "horn";
    $("cnLamp").className = "lamp " + lamp; $("hudLamp").className = "lamp " + lamp;
    $("cnState").textContent = M.estop ? "Paro de emergencia" : printingState() ? "Imprimiendo" : (M.run && M.feed) ? "Alimentando pliegos sin imprimir" :
      M.run ? (M.speed > 0 ? "En marcha sin papel" : "Arrancando") : M.speed > 0 ? "Deteniéndose" : "Máquina detenida";
    $("cnAct").textContent = fmtN(M.speed);
    var c = state.cnt, g = goal();
    $("cnTotal").textContent = ("000000" + c.total).slice(-6);
    $("cnMac").textContent = fmtN(c.mac); $("cnGood").textContent = fmtN(c.good); $("cnGoal").textContent = fmtN(g);
    $("cnGoodBar").style.width = Math.min(100, c.good / g * 100) + "%";
    [["cnRun", M.run], ["cnAir", M.air], ["cnFeed", M.feed], ["cnImp", M.imp], ["cnEstop", M.estop]].forEach(function (b) { $(b[0]).setAttribute("aria-pressed", b[1] ? "true" : "false"); });
    $("cnEstop").querySelector("span").textContent = M.estop ? "Rearmar" : "Emergencia";
    $("vHud").hidden = !(M.run || M.speed > 0);
    $("hudSpeed").textContent = fmtN(M.speed); $("hudCount").textContent = fmtN(c.total);
    renderWaste();
  }
  function setSpeedSet(v, quiet) {
    v = Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round(v / 500) * 500));
    state.mset = v; state.ctl.speed = v;
    $("cnSpeed").value = v; $("cnSet").textContent = fmtN(v);
    $("pcSpeed").value = v; $("pcSpeedV").textContent = fmtN(v) + " pl/h";
    if (!quiet) {
      if (v > PREP_MAX && M.run && !M.imp) cnMsg("La máquina sigue a velocidad de preparación (hasta " + fmtN(PREP_MAX) + " pl/h) hasta que actives 🖨 Impresión; después sube a la consigna.", "");
      else if (v >= 14000) cnMsg("Estás cerca del máximo de la CD 102 (15 000 pl/h según el catálogo). Con papel estucado está bien; con soportes difíciles conviene bajar.", "");
    }
    scheduleSave();
  }
  function initConsole() {
    setSpeedSet(state.mset || 5000, true);
    $("cnToggle").addEventListener("click", function () { var c = $("vConsole"), on = !c.classList.contains("collapsed"); c.classList.toggle("collapsed", on); this.setAttribute("aria-expanded", on ? "false" : "true"); });
    if (window.innerWidth <= 1100) { $("vConsole").classList.add("collapsed"); $("cnToggle").setAttribute("aria-expanded", "false"); }
    $("cnHorn").addEventListener("click", function () {
      M.hornAt = Date.now();
      var played = SOUND.horn();
      cnMsg("🔔 Aviso de arranque: todos lejos de los cilindros. Tienes 10 segundos para dar ▶ Marcha." + (played ? "" : " (Activa 🔊 Sonido para oír la bocina.)"), "");
      renderConsoleLive(); setTimeout(renderConsoleLive, 1600);
    });
    $("cnRun").addEventListener("click", function () {
      if (M.run) return;
      if (M.estop) { seqError("El paro de emergencia está activo: toca «Rearmar» antes de arrancar."); return; }
      if (Date.now() - M.hornAt > 10000) { seqError("Por seguridad, primero toca 🔔 <b>Aviso</b>: la bocina advierte a quienes están cerca de la máquina."); return; }
      M.run = true; startTicker();
      cnMsg("▶ En marcha a velocidad de preparación. Activa 💨 <b>Aire</b> del marcador.", "ok"); syncMachine(); renderConsoleLive();
    });
    $("cnAir").addEventListener("click", function () {
      if (!M.run && !M.air) { seqError("Primero pon la máquina en ▶ <b>Marcha</b>: los sopladores y la succión trabajan con la máquina girando."); return; }
      M.air = !M.air;
      if (!M.air) { M.feed = false; M.imp = false; }
      cnMsg(M.air ? "💨 Sopladores y succión activos: el aire separa el pliego superior de la pila. Activa 📄 <b>Marcador</b>." : "Aire desactivado: el marcador se detuvo.", M.air ? "ok" : "");
      syncMachine(); renderConsoleLive();
    });
    $("cnFeed").addEventListener("click", function () {
      if (!M.feed && (!M.run || !M.air)) { seqError("El marcador necesita la máquina en ▶ Marcha y el 💨 <b>Aire</b> activo para separar y enviar los pliegos."); return; }
      M.feed = !M.feed;
      if (!M.feed) M.imp = false;
      cnMsg(M.feed ? "📄 Los pliegos entran a la máquina. Cuando lleguen a los cuerpos, activa 🖨 <b>Impresión</b>." : "Marcador detenido: ya no entran pliegos.", M.feed ? "ok" : "");
      syncMachine(); renderConsoleLive();
    });
    $("cnImp").addEventListener("click", function () {
      if (!M.imp && !M.feed) { seqError("Activa la impresión solo cuando el 📄 Marcador ya envía pliegos: sin pliego, la mantilla entintaría el cilindro de impresión."); return; }
      M.imp = !M.imp;
      if (M.imp) {
        cnMsg(state.mounted ? "🖨 Imprimiendo: la mantilla presiona el pliego. Sube la velocidad poco a poco hasta la de producción." : "🖨 Imprimiendo sin planchas montadas: los pliegos salen en blanco (demostración).", "ok");
        if (inPress()) addScore("e-start", null, "Aviso → Marcha → Aire → Marcador → Impresión");
        schedule3D();
      } else cnMsg("Impresión desactivada: los pliegos siguen pasando sin imprimirse (maculatura).", "");
      syncMachine(); renderConsoleLive();
    });
    $("cnStop").addEventListener("click", function () {
      if (!M.run && M.speed <= 0) return;
      M.imp = false; M.feed = false; M.air = false; M.run = false; startTicker();
      cnMsg("⏹ Paro: se desactivan la impresión y el marcador, y la máquina desacelera hasta detenerse.", ""); syncMachine(); renderConsoleLive();
    });
    $("cnEstop").addEventListener("click", function () {
      if (!M.estop) {
        M.estop = true; M.run = M.air = M.feed = M.imp = false; M.speed = 0; SOUND.stopHit();
        cnMsg("🛑 Paro de emergencia: la máquina se detuvo de inmediato. Revisa la causa y toca «Rearmar».", "warn");
      } else { M.estop = false; cnMsg("Rearmada. Para volver a arrancar: 🔔 Aviso → ▶ Marcha.", ""); }
      syncMachine(); renderConsoleLive();
    });
    $("cnSpeed").addEventListener("input", function () { setSpeedSet(+this.value); });
    $("cnMinus").addEventListener("click", function () { setSpeedSet(state.mset - 500); });
    $("cnPlus").addEventListener("click", function () { setSpeedSet(state.mset + 500); });
    $("cnVol").addEventListener("input", function () { SOUND.setVolume(+this.value / 100); });
    var armed = false;
    $("cnReset").addEventListener("click", function () {
      if (!armed) { armed = true; this.textContent = "¿Seguro?"; var self = this; setTimeout(function () { armed = false; self.textContent = "Poner a cero"; }, 3000); return; }
      armed = false; this.textContent = "Poner a cero"; state.cnt = { total: 0, mac: 0, good: 0 }; state.goalHit = false; renderConsoleLive(); scheduleSave();
    });
    $("vSound").addEventListener("click", function () {
      if (!SOUND.supported()) { cnMsg("Este navegador no permite sonido sintetizado.", "warn"); return; }
      var on = SOUND.setEnabled(!SOUND.isOn());
      this.setAttribute("aria-pressed", on ? "true" : "false"); this.textContent = on ? "🔊 Sonido" : "🔇 Sonido";
      SOUND.setVolume(+$("cnVol").value / 100); syncMachine();
    });
    renderConsoleLive();
  }

  /* ================= LANDING ================= */
  function initLanding() {
    $("secCards").innerHTML = Object.keys(SECTIONS).map(function (k) {
      var S = SECTIONS[k];
      return '<button type="button" class="sec-card" data-sec="' + k + '"><span class="ic" aria-hidden="true">' + S.ic + '</span><b>' + S.name + '</b><span class="nums">Partes ' + S.parts.join(" · ") + '</span><span>' + S.d + '</span></button>';
    }).join("");
    $("secCards").addEventListener("click", function (e) {
      var b = e.target.closest("[data-sec]"); if (!b) return;
      mountViewer("slot-hero"); scrollTo($("slot-hero"), "center"); showSection(b.getAttribute("data-sec"));
    });
    $("heroExplore").addEventListener("click", function () { mountViewer("slot-hero"); scrollTo($("slot-hero"), "center"); startTour(); });
  }

  /* ================= ESTACIÓN 1 ================= */
  function initS1() {
    $("rid1Txt").textContent = RIDDLES[0].txt;
    $("hipOpts").addEventListener("click", function (ev) {
      var b = ev.target.closest(".opt"); if (!b) return;
      state.hip = b.getAttribute("data-h"); renderHip();
      addScore("e1-hip", ev, HIP[state.hip]);
      renderOk($("hipFb"), "Hipótesis registrada: «" + HIP[state.hip] + "».", "Formular una explicación antes de tocar la máquina es lo que hace un buen maquinista: ahora sabes qué buscar. En el taller (Estación 3) la pondrás a prueba con mediciones y, al final, diagnosticarás este mismo pliego.");
      completeStation("s1", "Tu hipótesis: <b>" + HIP[state.hip] + "</b>. Ya tienes la pista 1: búscala en el recorrido 3D.");
    });
  }
  function renderHip() {
    [].forEach.call($("hipOpts").querySelectorAll(".opt"), function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-h") === state.hip ? "true" : "false"); });
    $("rid1Box").hidden = !state.hip;
  }

  /* ================= ACERTIJOS ================= */
  function initRiddles() {
    [].forEach.call(document.querySelectorAll(".riddle[data-rid]"), function (box) {
      var i = +box.getAttribute("data-rid"), R = RIDDLES[i];
      box.innerHTML = '<span class="pistas-badge">PISTA ' + (i + 1) + '</span><p class="rq">' + R.txt + '</p>' +
        '<div class="ans"><div><label class="lb" for="rin' + i + '">Número de la parte en el catálogo</label><input type="number" id="rin' + i + '" min="1" max="16" inputmode="numeric"></div>' +
        '<button class="btn btn-primary" type="button" id="rbtn' + i + '">Comprobar</button></div><div class="fb" id="rfb' + i + '" aria-live="polite"></div>';
      $("rbtn" + i).addEventListener("click", function (ev) { checkRiddle(i, ev); });
      $("rin" + i).addEventListener("keydown", function (e) { if (e.key === "Enter") checkRiddle(i, e); });
    });
  }
  function riddleVisible(i) { return i === 0 ? true : i === 1 ? (state.defOk && countFlips() === 4 && state.ordOk) : i === 2 ? state.lvlOk : anaSolved() === 3; }
  function renderRiddles() {
    [].forEach.call(document.querySelectorAll(".riddle[data-rid]"), function (box) {
      var i = +box.getAttribute("data-rid"), solved = state.clues[i] !== null;
      box.hidden = !riddleVisible(i);
      box.classList.toggle("solved", solved);
      if (solved) { $("rin" + i).value = RIDDLES[i].ans; $("rin" + i).disabled = true; $("rbtn" + i).disabled = true; if (!$("rfb" + i).innerHTML) renderOk($("rfb" + i), "Pista " + (i + 1) + " resuelta.", RIDDLES[i].ok); }
    });
  }
  function showRiddle(i) {
    var box = document.querySelector('.riddle[data-rid="' + i + '"]'); if (!box || !box.hidden) return;
    box.hidden = false;
    if (!RESTORING) { toast("🔑 Apareció la <b>pista " + (i + 1) + "</b>. ¡Un dígito más para el pupitre!"); setTimeout(function () { scrollTo(box, "center"); }, 500); }
  }
  function checkRiddle(i, ev) {
    var R = RIDDLES[i], v = parseInt($("rin" + i).value, 10);
    if (state.clues[i] !== null) return;
    if (v === R.ans) {
      state.clues[i] = CODE[i];
      addScore(R.item, ev, v);
      renderOk($("rfb" + i), "¡Pista " + (i + 1) + " resuelta!", R.ok + " El dígito <b>" + CODE[i] + "</b> ya está en tu libreta, en la barra azul.");
      renderRiddles(); updateHud();
      [checkTour, checkS2, function () { phaseDone("p3"); }, checkS4][i]();
    } else {
      miss(R.item, isNaN(v) ? "" : v);
      var p = partById(R.ans), t = state.tries[R.item] || 0, other = partById(v);
      renderRetry($("rfb" + i), R.hint, t >= 2 ? "Está en la sección <b>" + SECTIONS[p.sec].name + "</b>: «" + p.d + "»" : "Cada número de la prensa 3D corresponde a una parte del catálogo; toca los números para leer qué hace cada una.", R.ctx,
        isNaN(v) ? "Escribe un número del 1 al 16." : other ? "La parte " + v + " es «" + esc(other.name) + "»: no encaja con el acertijo." : "Los números van del 1 al 16.");
    }
  }

  /* ================= ESTACIÓN B ================= */
  function initSV() {
    $("vChk").addEventListener("change", function (e) {
      var c = e.target; if (!c.dataset.v) return;
      state.vchk[c.dataset.v] = c.checked; renderVchk(); scheduleSave();
    });
    $("vGo").addEventListener("click", function (ev) {
      this.disabled = true;
      addScore("v-chk", ev, "3 de 3");
      completeStation("sV", "Lista de verificación completa: sabes qué entregarás y qué pide la orden.");
    });
  }
  function renderVchk() {
    var n = 0;
    [].forEach.call($("vChk").querySelectorAll("input"), function (c) { c.checked = !!state.vchk[c.dataset.v]; if (c.checked) n++; });
    $("vGo").disabled = n < 3 || !!state.gates.sV;
  }

  /* ================= ESTACIÓN 2 ================= */
  var ordSeq = null, seqSeq = null;
  function makeSeq(cfg) {
    var picked = [], order = shuffleNot(cfg.items.map(function (_, i) { return i; }));
    function render() {
      if (cfg.solved()) {
        $(cfg.out).innerHTML = cfg.items.map(function (t) { return '<li class="ok">✓ ' + esc(t) + '</li>'; }).join("");
        $(cfg.bank).innerHTML = ""; $(cfg.check).disabled = true; $(cfg.reset).disabled = true; return;
      }
      $(cfg.bank).innerHTML = order.filter(function (i) { return picked.indexOf(i) < 0; }).map(function (i) { return '<button type="button" class="seq-b" data-i="' + i + '">' + esc(cfg.items[i]) + '</button>'; }).join("");
      $(cfg.out).innerHTML = picked.length ? picked.map(function (i, n) { return '<li><button type="button" class="seq-o" data-n="' + n + '" aria-label="Quitar: ' + esc(cfg.items[i]) + '">' + esc(cfg.items[i]) + ' <span aria-hidden="true">✕</span></button></li>'; }).join("") : '<li class="ph">Toca los pasos en orden…</li>';
      $(cfg.check).disabled = picked.length !== cfg.items.length;
    }
    $(cfg.bank).addEventListener("click", function (e) { var b = e.target.closest(".seq-b"); if (!b) return; picked.push(+b.getAttribute("data-i")); render(); });
    $(cfg.out).addEventListener("click", function (e) { var b = e.target.closest(".seq-o"); if (!b) return; picked.splice(+b.getAttribute("data-n"), 1); render(); });
    $(cfg.reset).addEventListener("click", function () { picked = []; $(cfg.fb).innerHTML = ""; render(); });
    $(cfg.check).addEventListener("click", function (ev) {
      var wrong = -1;
      for (var n = 0; n < picked.length; n++) if (picked[n] !== n) { wrong = n; break; }
      if (wrong < 0) { cfg.onOk(ev); render(); return; }
      miss(cfg.item, picked.map(function (i) { return i + 1; }).join("-"));
      var h = cfg.hints[wrong];
      renderRetry($(cfg.fb), h[0], h[1], h[2], wrong ? "✓ Los primeros " + wrong + (wrong === 1 ? " paso está" : " pasos están") + " en orden. Revisa desde el paso " + (wrong + 1) + "." : "Revisa desde el primer paso.");
      picked = picked.slice(0, wrong); render();
    });
    return { render: render };
  }
  function initS2() {
    ROLLERS.create($("s2Roll"), { controls: true, ink: 1, water: 45, press: 0.12, hex: PS.INKS.K.hex, label: "Laboratorio agua-tinta: mueve los reguladores" });
    $("defOpts").innerHTML = DEFS.map(function (d) { return '<button type="button" class="opt" data-d="' + d.id + '">' + d.t + '</button>'; }).join("");
    $("defOpts").addEventListener("click", function (ev) {
      var b = ev.target.closest(".opt"); if (!b || state.defOk) return;
      var d = null; DEFS.forEach(function (x) { if (x.id === b.getAttribute("data-d")) d = x; });
      if (d.ok) {
        state.defOk = true; addScore("d-def", ev, "indirecto y planográfico");
        renderOk($("defFb"), "¡Exacto!", "Reconociste las dos claves que viste en el ciclo: la mantilla entre plancha y papel (indirecto) y la plancha lisa que separa tinta y agua (planográfico).");
        renderDefs(); checkS2();
      } else {
        miss("d-def", stripTags(d.t).slice(0, 60)); b.classList.add("shake"); setTimeout(function () { b.classList.remove("shake"); }, 400);
        renderRetry($("defFb"), d.r[0], d.r[1], d.r[2]);
      }
    });
    $("flips").innerHTML = FLIPS.map(function (f) {
      return '<button type="button" class="flip" data-f="' + f.id + '" aria-pressed="false"><span class="in"><span class="fa"><small>Toca para girar</small><b>' + f.t + '</b><small>¿Qué hace?</small></span><span class="fb2"><span class="tag">' + f.t + '</span>' + f.a + '<b>' + f.cd + '</b></span></span></button>';
    }).join("");
    $("flips").addEventListener("click", function (ev) {
      var b = ev.target.closest(".flip"); if (!b) return;
      var on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on);
      var id = b.getAttribute("data-f");
      if (!state.flipped[id]) {
        state.flipped[id] = true; renderFlipProg();
        if (countFlips() === 4) { addScore("d-flip", ev, "4 tarjetas"); checkS2(); }
        else toast("Descubriste: <b>" + FLIPS.filter(function (f) { return f.id === id; })[0].t + "</b>. Van " + countFlips() + " de 4.");
        scheduleSave();
      }
    });
    ordSeq = makeSeq({ bank: "ordBank", out: "ordOut", check: "ordCheck", reset: "ordReset", fb: "ordFb", items: ORD, hints: ORD_HINTS, item: "d-ord",
      solved: function () { return state.ordOk; },
      onOk: function (ev) { state.ordOk = true; addScore("d-ord", ev, "Tintero → batería → plancha → mantilla → pliego"); renderOk($("ordFb"), "¡Viaje completo!", "Tintero → batería → plancha → mantilla → pliego. Ese es el camino de la tinta en cada uno de los cuatro cuerpos."); checkS2(); } });
    ordSeq.render();
  }
  function stripTags(s) { return String(s).replace(/<[^>]+>/g, ""); }
  function renderDefs() {
    [].forEach.call($("defOpts").querySelectorAll(".opt"), function (b) {
      var ok = b.getAttribute("data-d") === "a";
      b.classList.toggle("right", state.defOk && ok); b.disabled = state.defOk;
    });
    $("defCard").hidden = !state.defOk;
  }
  function renderFlipProg() {
    var n = countFlips();
    $("flipCount").textContent = n + " de 4"; $("flipBar").style.width = (n / 4 * 100) + "%";
  }
  function checkS2() {
    if (state.defOk && countFlips() === 4 && state.ordOk) showRiddle(1);
    if (state.defOk && countFlips() === 4 && state.ordOk && state.clues[1] !== null)
      completeStation("s2", "Definiste el offset como impresión indirecta y planográfica, conoces sus cuatro piezas y el viaje de la tinta.");
  }

  /* ================= ESTACIÓN C · FICHA DE CÁLCULO ================= */
  /* Pliego de referencia 100 × 70 cm con pinza declarada de 10 mm en un lado largo; piezas al corte, sin sangrado ni calles. */
  var FREF = { w: 1000, h: 700, grip: 10 };
  var FPIECES = [
    { id: "a2", item: "i-a2", name: "Afiche", fmt: "A2", size: "420 × 594 mm", s: 420, l: 594 },
    { id: "a4", item: "i-a4", name: "Portada de revista", fmt: "A4", size: "210 × 297 mm", s: 210, l: 297 },
    { id: "a5", item: "i-a5", name: "Volantes", fmt: "A5", size: "148 × 210 mm", s: 148, l: 210 },
    { id: "mini", item: "i-mini", name: "Publicidad en miniatura", fmt: "", size: "9,5 × 5,5 cm de acabado final (95 × 55 mm)", s: 55, l: 95 }
  ];
  function numIn(v) { var x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : NaN; }
  function fv(v) { return v == null || v === "" || isNaN(v) ? "?" : v; }
  function fUseful() { return { w: FREF.w, h: FREF.h - FREF.grip }; }
  function fCalc(p) {
    var u = fUseful(), A = { c: Math.floor(u.w / p.s), r: Math.floor(u.h / p.l) }, B = { c: Math.floor(u.w / p.l), r: Math.floor(u.h / p.s) };
    A.n = A.c * A.r; B.n = B.c * B.r;
    var best = B.n > A.n ? "B" : "A", n = Math.max(A.n, B.n);
    return { A: A, B: B, best: best, n: n, pct: Math.round(n * p.s * p.l / (FREF.w * FREF.h) * 100) };
  }
  function fp(id) { for (var i = 0; i < FPIECES.length; i++) if (FPIECES[i].id === id) return FPIECES[i]; return null; }
  function fRow(id) { if (!state.ficha.rows) state.ficha.rows = {}; return state.ficha.rows[id] || (state.ficha.rows[id] = {}); }
  function initFicha() {
    $("fichaCalc").innerHTML = FPIECES.map(function (p) {
      function ori(o, t, sub) {
        return '<div class="fori"><b>' + t + '</b><small>' + sub + '</small><div class="fcalc">' +
          '<label>Columnas<input type="number" min="0" max="40" inputmode="numeric" data-f="' + p.id + ':' + o + 'c" aria-label="' + p.name + ', orientación ' + o + ': columnas"></label><span>×</span>' +
          '<label>Filas<input type="number" min="0" max="40" inputmode="numeric" data-f="' + p.id + ':' + o + 'r" aria-label="' + p.name + ', orientación ' + o + ': filas"></label><span>=</span>' +
          '<output id="fo-' + p.id + '-' + o + '" aria-label="Piezas por pliego en la orientación ' + o + '">—</output></div></div>';
      }
      return '<article class="frow" id="fr-' + p.id + '"><header><b>' + p.name + '</b><span class="mono">' + (p.fmt ? p.fmt + ' · ' : '') + p.size + '</span><span class="fst" id="fst-' + p.id + '">Pendiente</span></header>' +
        '<div class="fgrid">' + ori("A", "Orientación A · vertical", "Lado corto (" + p.s + " mm) a lo ancho del pliego") + ori("B", "Orientación B · girada 90°", "Lado largo (" + p.l + " mm) a lo ancho del pliego") + '</div>' +
        '<div class="fpick"><span class="lb">¿Qué orientación conviene?</span><div class="seg" role="group" aria-label="Orientación que conviene para ' + p.name + '" data-fpick="' + p.id + '"><button type="button" data-o="A" aria-pressed="false">A</button><button type="button" data-o="B" aria-pressed="false">B</button></div>' +
        '<button class="btn btn-primary btn-sm" type="button" data-fcheck="' + p.id + '">✍ Registrar en la ficha</button></div>' +
        '<div class="fb" id="ffb-' + p.id + '" aria-live="polite"></div>' +
        '<div class="fviz" id="fviz-' + p.id + '" hidden><figure id="fvA-' + p.id + '"><canvas width="300" height="220"></canvas><figcaption></figcaption></figure><figure id="fvB-' + p.id + '"><canvas width="300" height="220"></canvas><figcaption></figcaption></figure></div></article>';
    }).join("");
    $("fichaCalc").addEventListener("input", function (e) {
      var t = e.target, f = t.getAttribute("data-f"); if (!f) return;
      var q = f.split(":"), r = fRow(q[0]); if (r.ok) return;
      r[q[1]] = t.value === "" ? "" : numIn(t.value);
      renderFichaRow(q[0]); scheduleSave();
    });
    $("fichaCalc").addEventListener("click", function (e) {
      var b = e.target.closest("[data-fpick] button"), c = e.target.closest("[data-fcheck]");
      if (b) { var id = b.parentNode.getAttribute("data-fpick"), r = fRow(id); if (r.ok) return; r.pick = b.getAttribute("data-o"); renderFichaRow(id); scheduleSave(); }
      if (c) checkFichaRow(c.getAttribute("data-fcheck"), e);
    });
    $("fArea").addEventListener("click", checkArea);
    ["fAw", "fAh"].forEach(function (id) { $(id).addEventListener("keydown", function (e) { if (e.key === "Enter") checkArea(e); }); });
    $("fCsv").addEventListener("click", downloadFichaCsv);
  }
  function checkArea(ev) {
    if (state.ficha.area && state.ficha.area.ok) return;
    var w = numIn($("fAw").value), h = numIn($("fAh").value), u = fUseful();
    state.ficha.area = { w: w, h: h, ok: false };
    if (w === u.w && h === u.h) {
      state.ficha.area.ok = true; addScore("i-area", ev, w + " × " + h + " mm");
      renderOk($("fAfb"), "Área útil: " + u.w + " × " + u.h + " mm.", "Restaste los " + FREF.grip + " mm de pinza al lado de 70 cm: esa franja la sujetan las pinzas y no recibe tinta. El lado de 100 cm queda completo.");
      renderFicha(); scheduleSave(); return;
    }
    miss("i-area", fv(w) + " × " + fv(h));
    var pista = (w === 100 && (h === 69 || h === 70)) ? "Escribe en milímetros: 100 cm = 1000 mm y 70 cm = 700 mm." :
      (w === u.h && h === u.w) ? "Invertiste los lados: el ancho es el lado de 100 cm y la pinza se resta al de 70 cm." :
        (h === FREF.h) ? "Todavía no restaste la pinza al alto: " + FREF.h + " − " + FREF.grip + "." :
          (w !== u.w) ? "La pinza es una franja a lo largo del lado de 100 cm: achica el otro lado; el ancho no cambia." : "Revisa la resta de la pinza: " + FREF.h + " − " + FREF.grip + ".";
    renderRetry($("fAfb"), pista, "Pliego de referencia 1000 × 700 mm; margen de pinza declarado: " + FREF.grip + " mm en un lado largo.", "El área útil es la parte del pliego donde sí se puede imprimir: si la ignoras, la última fila de piezas quedaría bajo las pinzas.");
  }
  function checkFichaRow(id, ev) {
    var p = fp(id), r = fRow(id), c = fCalc(p), fb = $("ffb-" + id);
    if (r.ok) return;
    if (!state.ficha.area || !state.ficha.area.ok) { fb.innerHTML = '<div class="info">Primero calcula el área útil del pliego (paso 1): de ella salen las divisiones.</div>'; $("fAw").focus(); return; }
    var errs = [];
    ["A", "B"].forEach(function (o) { if (r[o + "c"] !== c[o].c) errs.push([o, "c"]); if (r[o + "r"] !== c[o].r) errs.push([o, "r"]); });
    if (!errs.length && r.pick === c.best) {
      r.ok = true;
      addScore(p.item, ev, "A " + c.A.c + "×" + c.A.r + "=" + c.A.n + " · B " + c.B.c + "×" + c.B.r + "=" + c.B.n + " · conviene " + c.best);
      var other = c.best === "A" ? c.B.n : c.A.n;
      renderOk(fb, "Registrado: conviene la orientación " + c.best + ".", "Da " + c.n + " piezas por pliego frente a " + other + " de la otra (" + (c.n - other) + " más por pliego). Aprovechamiento del pliego: " + c.pct + " %.");
      renderFicha(); checkFicha(); scheduleSave(); return;
    }
    miss(p.item, "A " + fv(r.Ac) + "×" + fv(r.Ar) + " · B " + fv(r.Bc) + "×" + fv(r.Br) + " · " + (r.pick || "sin elegir"));
    var t = state.tries[p.item] || 0, u = fUseful();
    if (errs.length) {
      var e = errs[0], o = e[0], k = e[1], side = k === "c" ? u.w : u.h, piece = (o === "A") === (k === "c") ? p.s : p.l, dv = side / piece, okN = 4 - errs.length;
      renderRetry(fb, "Revisa las " + (k === "c" ? "columnas" : "filas") + " de la orientación " + o + ": divide " + (k === "c" ? "el ancho útil (" + u.w + " mm)" : "el alto útil (" + u.h + " mm)") + " entre el lado de la pieza que va en esa dirección (" + piece + " mm).",
        t >= 2 ? side + " ÷ " + piece + " = " + fmt(dv) + " → caben " + Math.floor(dv) + "." : "En la orientación " + o + " va " + (piece === p.s ? "el lado corto" : "el lado largo") + " " + (k === "c" ? "a lo ancho" : "a lo alto") + ". Quédate solo con la parte entera de la división.",
        "Una pieza que no entra completa no se imprime: por eso se redondea siempre hacia abajo.", okN ? "✓ " + okN + " de 4 valores ya están bien." : "");
      if (t >= 2) { $("fviz-" + id).hidden = false; drawFichaViz(p); }
    } else {
      renderRetry(fb, "Tus columnas y filas están bien; ahora compara los totales.", "A da " + c.A.n + " piezas y B da " + c.B.n + ".", "Conviene la orientación que da más piezas por pliego: menos pliegos, menos papel y menos tiempo de máquina.", "✓ Los 4 valores están bien.");
    }
  }
  function fichaDone() { return !!(state.ficha.area && state.ficha.area.ok) && FPIECES.every(function (p) { return fRow(p.id).ok; }); }
  function checkFicha() {
    if (!fichaDone()) return;
    completeStation("sI", "Ficha de cálculo completa: " + FPIECES.map(function (p) { var c = fCalc(p); return p.name.toLowerCase() + ", " + c.n + " por pliego (" + c.best + ")"; }).join(" · ") + ".");
  }
  function drawFichaViz(p) {
    var c = fCalc(p), ok = !!fRow(p.id).ok;
    ["A", "B"].forEach(function (o) {
      var fig = $("fv" + o + "-" + p.id), cv = fig.querySelector("canvas"), g = cv.getContext("2d"), W = cv.width, H = cv.height, f = c[o];
      var k = Math.min((W - 16) / FREF.w, (H - 16) / FREF.h), ox = (W - FREF.w * k) / 2, oy = (H - FREF.h * k) / 2;
      var pw = o === "A" ? p.s : p.l, ph = o === "A" ? p.l : p.s;
      g.clearRect(0, 0, W, H);
      g.fillStyle = "#fff"; g.fillRect(ox, oy, FREF.w * k, FREF.h * k);
      g.fillStyle = "rgba(243,161,0,.6)"; g.fillRect(ox, oy + (FREF.h - FREF.grip) * k, FREF.w * k, FREF.grip * k);
      for (var rr = 0; rr < f.r; rr++) for (var cc = 0; cc < f.c; cc++) { g.fillStyle = (rr + cc) % 2 ? "#5aa7d8" : "#0072b9"; g.fillRect(ox + cc * pw * k + 0.5, oy + rr * ph * k + 0.5, pw * k - 1, ph * k - 1); }
      g.strokeStyle = "#555553"; g.strokeRect(ox + 0.5, oy + 0.5, FREF.w * k - 1, FREF.h * k - 1);
      fig.querySelector("figcaption").textContent = "Orientación " + o + ": " + f.c + " × " + f.r + " = " + f.n + " piezas" + (ok && o === c.best ? " ✓ conviene" : "");
      fig.classList.toggle("best", ok && o === c.best);
    });
  }
  function renderFichaRow(id) {
    var p = fp(id), r = fRow(id), c = fCalc(p), el = $("fr-" + id);
    ["Ac", "Ar", "Bc", "Br"].forEach(function (k) {
      var inp = el.querySelector('[data-f="' + id + ':' + k + '"]');
      if (document.activeElement !== inp) inp.value = r[k] == null || r[k] === "" || isNaN(r[k]) ? "" : r[k];
      inp.disabled = !!r.ok;
    });
    ["A", "B"].forEach(function (o) {
      var a = r[o + "c"], b = r[o + "r"];
      $("fo-" + id + "-" + o).textContent = typeof a === "number" && typeof b === "number" && !isNaN(a) && !isNaN(b) ? a * b : "—";
    });
    [].forEach.call(el.querySelectorAll("[data-fpick] button"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-o") === r.pick ? "true" : "false"); b.disabled = !!r.ok; });
    el.querySelector("[data-fcheck]").disabled = !!r.ok;
    el.classList.toggle("done", !!r.ok);
    $("fst-" + id).textContent = r.ok ? "✓ Registrada · " + c.n + " por pliego" : "Pendiente";
    if (r.ok) {
      $("fviz-" + id).hidden = false; drawFichaViz(p);
      if (!$("ffb-" + id).innerHTML) renderOk($("ffb-" + id), "Registrado: conviene la orientación " + c.best + ".", c.n + " piezas por pliego · aprovechamiento " + c.pct + " %.");
    }
  }
  function fichaArea() { var a = state.ficha.area, u = fUseful(); return a && a.ok ? u.w + " × " + u.h + " mm" : "pendiente"; }
  function fichaRows() {
    return FPIECES.map(function (p) {
      var r = fRow(p.id), c = fCalc(p);
      function cell(o) { return r.ok ? c[o].c + " × " + c[o].r + " = " + c[o].n : (r[o + "c"] != null && r[o + "c"] !== "" ? fv(r[o + "c"]) + " × " + fv(r[o + "r"]) : "—"); }
      return [p.name + (p.fmt ? " " + p.fmt : ""), p.size, cell("A"), cell("B"), r.ok ? c.best : (r.pick || "—"), r.ok ? c.pct + " %" : "—", r.ok ? "Registrada" : "Pendiente"];
    });
  }
  function renderFicha() {
    var a = state.ficha.area;
    if (a) { if (a.w != null && !isNaN(a.w)) $("fAw").value = a.w; if (a.h != null && !isNaN(a.h)) $("fAh").value = a.h; }
    var aok = !!(a && a.ok);
    $("fAw").disabled = aok; $("fAh").disabled = aok; $("fArea").disabled = aok;
    if (aok && !$("fAfb").innerHTML) renderOk($("fAfb"), "Área útil: " + fichaArea() + ".", "La pinza (" + FREF.grip + " mm) se resta al lado de 70 cm.");
    FPIECES.forEach(function (p) { renderFichaRow(p.id); });
    $("fichaRows").innerHTML = fichaRows().map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i >= 2 && i <= 5 ? ' class="num"' : '') + '>' + esc(c) + '</td>'; }).join("") + '</tr>'; }).join("");
  }
  function downloadFichaCsv() {
    var head = ["Pieza", "Medida final", "Orientación A", "Orientación B", "Conviene", "Aprovechamiento", "Estado"];
    var lines = [["Ficha de cálculo de imposición · S06 · Actividad 4"], ["Estudiante", state.student ? state.student.nombres + " " + state.student.apellidos : ""],
      ["Pliego de referencia", "1000 × 700 mm"], ["Margen de pinza declarado", FREF.grip + " mm"], ["Área útil", fichaArea()], [], head].concat(fichaRows());
    var csv = lines.map(function (r) { return r.map(function (c) { c = String(c == null ? "" : c); return /[";\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(";"); }).join("\r\n");
    saveFile("FichaCalculo_S06_A4_" + fileWho() + ".csv", "﻿" + csv, "text/csv;charset=utf-8", $("fCsvMsg"));
  }

  /* ================= ESTACIÓN 3 · 3.1 ARTE Y PLANCHA ================= */
  function initP1() {
    $("jPlate").innerHTML = '<option value="">Elige un formato…</option>' + PS.PLATES.map(function (p) { return '<option value="' + p.id + '">' + p.w + ' × ' + p.h + ' mm · ' + p.press + (p.ref ? ' (referencia)' : '') + '</option>'; }).join("");
    $("jTech").innerHTML = PS.TECH.map(function (t) { return '<option value="' + t.id + '">' + t.name + '</option>'; }).join("");
    $("jSheet").innerHTML = PS.SHEETS.map(function (s) { return '<option value="' + s.id + '">' + s.label + '</option>'; }).join("");
    ["jPlate", "jTech", "jSheet", "jBleed", "jMarks", "jProp"].forEach(function (id) { $(id).addEventListener("change", onJobChange); });
    $("jW").addEventListener("input", function () { onSize("w"); });
    $("jH").addEventListener("input", function () { onSize("h"); });
    $("jOriA").addEventListener("click", function () { setOrient("A"); });
    $("jOriB").addEventListener("click", function () { setOrient("B"); });
    $("artFile").addEventListener("change", function () { if (this.files && this.files[0]) useFile(this.files[0]); this.value = ""; });
    $("artFileLbl").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!$("artFile").disabled) $("artFile").click(); } });
    var drop = $("artDrop");
    drop.addEventListener("dragover", function (e) { if (state.job.ctp) return; e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", function () { drop.classList.remove("over"); });
    drop.addEventListener("drop", function (e) { e.preventDefault(); drop.classList.remove("over"); if (!state.job.ctp && e.dataTransfer.files && e.dataTransfer.files[0]) useFile(e.dataTransfer.files[0]); });
    $("artSample").addEventListener("click", useSample);
    $("jVerify").addEventListener("click", verifyJob);
    $("dimSeg").addEventListener("click", function (e) {
      var b = e.target.closest("[data-m]"); if (!b) return;
      dimMode = b.getAttribute("data-m");
      [].forEach.call(this.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      renderDims();
    });
    var rt = null;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (RT.L && RT.art && !$("s3").classList.contains("locked")) PS.drawPreview($("jSheetCv"), RT.L, RT.art); }, 200); });
  }
  function renderJobForm() {
    var j = state.job;
    $("jPlate").value = j.plate; $("jTech").value = j.tech; $("jSheet").value = j.sheet; $("jBleed").value = String(j.bleed);
    $("jW").value = j.w; $("jH").value = j.h; $("jProp").checked = j.prop; $("jMarks").checked = j.marks;
    lockJob(j.ctp);
  }
  function lockJob(on) {
    ["jPlate", "jTech", "jSheet", "jBleed", "jW", "jH", "jProp", "jMarks", "artFile", "artSample", "jVerify", "jOriA", "jOriB"].forEach(function (id) { $(id).disabled = on; });
    $("artFileLbl").style.display = on ? "none" : "";
  }
  function onJobChange() {
    if (state.job.ctp) return;
    var j = state.job;
    j.plate = $("jPlate").value; j.tech = $("jTech").value; j.sheet = $("jSheet").value; j.bleed = +$("jBleed").value; j.marks = $("jMarks").checked; j.prop = $("jProp").checked;
    $("jFb").innerHTML = ""; $("jChecks").innerHTML = "";
    refreshJob(); scheduleSave();
  }
  function aspect() { return RT.art && RT.art.canvas ? RT.art.canvas.height / RT.art.canvas.width : 420 / 297; }
  function onSize(which) {
    if (state.job.ctp) return;
    var j = state.job, w = parseFloat($("jW").value), h = parseFloat($("jH").value);
    if (which === "w" && isFinite(w) && w > 0) { j.w = w; if (j.prop) { j.h = Math.round(w * aspect()); $("jH").value = j.h; } }
    if (which === "h" && isFinite(h) && h > 0) { j.h = h; if (j.prop) { j.w = Math.round(h / aspect()); $("jW").value = j.w; } }
    $("jFb").innerHTML = ""; $("jChecks").innerHTML = "";
    refreshJob(); scheduleSave();
  }
  function setOrient(o) { if (state.job.ctp) return; state.job.orient = o; $("jFb").innerHTML = ""; refreshJob(); scheduleSave(); }
  function useFile(file) {
    $("artMsg").textContent = "Leyendo el archivo…";
    PS.loadArtFile(file).then(function (art) {
      RT.art = art; var j = state.job; j.art = "file"; j.artName = art.name;
      if (!art.vector) {
        var wmm = Math.round(art.pxW / 300 * 25.4), hmm = Math.round(art.pxH / 300 * 25.4), k = Math.min(1, 700 / Math.max(wmm, hmm));
        j.w = Math.max(20, Math.round(wmm * k)); j.h = Math.max(20, Math.round(hmm * k));
      } else j.h = Math.round(j.w * aspect());
      $("jW").value = j.w; $("jH").value = j.h;
      var saved = saveArt(art);
      $("artMsg").textContent = "✓ " + art.name + (art.vector ? " · vectorial" : " · " + art.pxW + " × " + art.pxH + " px") + ". Tamaño inicial: el de tu archivo a 300 ppp; ajústalo a la orden." + (saved ? "" : " (Es grande: si recargas la página tendrás que volver a subirlo.)");
      $("jFb").innerHTML = ""; $("jChecks").innerHTML = "";
      refreshJob(); scheduleSave();
      toast("Arte cargado: <b>" + esc(art.name) + "</b>. Buen comienzo, " + esc(who()) + ".");
    }, function (e) {
      $("artMsg").textContent = e && e.message === "tipo" ? "Ese formato no se puede leer aquí. Usa PNG, JPG, WebP o SVG (exporta tu PDF como imagen)." : "No se pudo leer el archivo. Prueba con otro PNG o JPG.";
    });
  }
  function useSample() {
    if (state.job.ctp) return;
    RT.art = RT.sample; var j = state.job; j.art = "sample"; j.artName = ""; j.w = 297; j.h = 420;
    $("jW").value = 297; $("jH").value = 420;
    try { localStorage.removeItem(LS_ART); } catch (e) { }
    $("artMsg").textContent = "Usando el afiche de muestra (A3, vectorial).";
    $("jFb").innerHTML = ""; $("jChecks").innerHTML = "";
    refreshJob(); scheduleSave();
  }
  var dimMode = "both";
  function renderDims() {
    var j = state.job, pl = PS.byId(PS.PLATES, j.plate) || PS.PLATES[0], sh = PS.byId(PS.SHEETS, j.sheet) || PS.SHEETS[0];
    $("dimFig").innerHTML = PS.dimSvg(pl.id, sh.id, dimMode);
    var tail = pl.lead ? Math.round((pl.h - pl.lead - pl.print[1]) * 10) / 10 : null;
    function n(v) { return String(v).replace(".", ","); }
    function it(t, v, sm) { return '<div><dt>' + t + '</dt><dd>' + v + (sm ? '<small>' + sm + '</small>' : '') + '</dd></div>'; }
    $("dimData").innerHTML = (j.plate ? "" : '<div style="grid-column:1/-1"><dt>Ejemplo</dt><dd><small>Aún no eliges plancha: se muestra la de la CD 102.</small></dd></div>') +
      it("Plancha", pl.w + " × " + pl.h + " mm", "ancho × largo · espesor " + pl.thick) +
      it("Blanco de mordaza", pl.lead ? n(pl.lead) + " mm" : "—", pl.lead ? "del borde delantero de la plancha al inicio de impresión" + (pl.leadOpt ? " (" + pl.leadOpt + " mm opcional)" : "") : "sin dato oficial") +
      it("Blanco de cola", tail != null ? n(tail) + " mm" : "—", tail != null ? "deducido: " + pl.h + " − " + n(pl.lead) + " − " + pl.print[1] : "") +
      it("Pinza del pliego", PS.GRIP + " mm", "ficha de la máquina: " + (pl.grip || "—")) +
      it("Área máx. de impresión", pl.print[0] + " × " + pl.print[1] + " mm") +
      it("Mantilla", pl.blanket || "—") + it("Pliego elegido", sh.label);
  }
  function refreshJob() {
    if (!RT.art) return;
    var j = state.job;
    RT.L = PS.layout(j);
    PS.drawPreview($("jSheetCv"), RT.L, RT.art);
    PS.drawOrient($("jOriACv"), RT.L, "A"); PS.drawOrient($("jOriBCv"), RT.L, "B");
    function lbl(f) { return f.n + (f.n === 1 ? " copia" : " copias") + " por pliego (" + f.cols + " × " + f.rows + ")"; }
    $("jOriAn").textContent = lbl(RT.L.A); $("jOriBn").textContent = lbl(RT.L.B);
    $("jOriA").setAttribute("aria-pressed", j.orient === "A" ? "true" : "false"); $("jOriB").setAttribute("aria-pressed", j.orient === "B" ? "true" : "false");
    var ppi = PS.effPpi(RT.art, j.w, j.h), o = $("jPpi");
    if (ppi === Infinity) { o.textContent = "Vectorial ✓"; o.className = "out y"; }
    else { o.textContent = Math.round(ppi) + " ppp " + (ppi >= 300 ? "✓" : ppi >= 200 ? "⚠" : "✗"); o.className = "out " + (ppi >= 300 ? "y" : ppi >= 200 ? "w" : "n"); }
    var c = $("artPrev"), a = RT.art.canvas, k = Math.min(170 / a.width, 240 / a.height);
    c.width = Math.max(1, Math.round(a.width * k)); c.height = Math.max(1, Math.round(a.height * k)); c.getContext("2d").drawImage(a, 0, 0, c.width, c.height);
    $("artCap").textContent = RT.art.sample ? "Afiche de muestra" : RT.art.name;
    var pl = PS.byId(PS.PLATES, j.plate);
    $("jPlateInfo").textContent = pl ? "Espesor " + pl.thick + " · " + pl.src : "";
    renderDims();
  }
  function renderChecks(checks) {
    $("jChecks").innerHTML = checks.map(function (c) {
      var k = c.ok === true ? "y" : c.ok === "warn" ? "w" : "n";
      return '<li class="' + k + '"><i aria-hidden="true">' + (k === "y" ? "✓" : k === "w" ? "⚠" : "✗") + '</i><div><b>' + c.label + '<span class="sr"> · ' + (k === "y" ? "cumple" : k === "w" ? "advertencia" : "no cumple") + '</span></b><span>' + c.detail + '</span></div></li>';
    }).join("");
  }
  function verifyJob(ev) {
    if (state.job.ctp || !RT.art) return;
    RT.L = PS.layout(state.job);
    var checks = PS.preflight(state.job, RT.art, RT.L);
    renderChecks(checks);
    if (checks[0].ok) addScore("a-fmt", ev, "Plancha CD 102 · 790 × 1030 mm"); else miss("a-fmt", state.job.plate || "sin elegir");
    var fails = checks.filter(function (c) { return c.ok === false; });
    if (!fails.length) { generatePlates(true, ev); return; }
    miss("a-pre", fails.map(function (c) { return c.id; }).join(", "));
    var h = PRE_HINT[fails[0].id], okN = checks.length - fails.length;
    renderRetry($("jFb"), h[0], h[1], h[2], "✓ " + okN + " de " + checks.length + " requisitos ya cumplen. Falta: " + fails.map(function (c) { return c.label.toLowerCase(); }).join(" · ") + ".");
  }
  function generatePlates(fresh, ev) {
    RT.L = PS.layout(state.job);
    RT.sep = PS.separate(PS.buildSheet(RT.art, RT.L), RT.L);
    var job = "OT-0426 " + (((state.student && state.student.apellidos) || "").split(" ")[0] || "");
    RT.plates = {};
    PS.ORDER.forEach(function (k) { RT.plates[k] = PS.plateCanvas(RT.sep, k, state.job.tech, job); });
    RT.okP = null;
    state.job.ctp = true;
    if (!state.plOrder) state.plOrder = shuffleNot(PS.ORDER);
    if (!state.canOrder) state.canOrder = shuffle(INK_CANS.map(function (c) { return c.id; }));
    renderPlatesOut(); lockJob(true); renderPlBank();
    if (fresh) {
      var tech = PS.byId(PS.TECH, state.job.tech);
      addScore("a-pre", ev, RT.L.chosen.n + " copias · " + state.job.sheet + " · " + tech.name);
      renderOk($("jFb"), "Preimpresión aprobada y planchas grabadas.", "Tu pliego lleva " + RT.L.chosen.n + " copias y el CTP grabó cuatro planchas (" + tech.name + "): K, C, M y Y. Fíjate en que se leen al derecho: la mantilla invertirá la imagen y el pliego la recibirá otra vez al derecho.");
      phaseDone("p1");
    }
    scheduleSave();
  }
  function renderPlatesOut() {
    var box = $("jPlates"); if (!RT.plates) { box.hidden = true; return; }
    box.hidden = false; box.innerHTML = "";
    PS.ORDER.forEach(function (k) {
      var d = document.createElement("div"); d.className = "plate-card";
      d.appendChild(cloneCanvas(RT.plates[k], 300));
      d.insertAdjacentHTML("beforeend", '<b><span class="dot" style="background:' + PS.INKS[k].hex + '"></span>Plancha ' + PS.INKS[k].name + ' (' + k + ')</b>');
      box.appendChild(d);
    });
  }

  /* ================= 3.2 MONTAJE ================= */
  var plSel = null;
  function initP2() {
    seqSeq = makeSeq({ bank: "seqBank", out: "seqOut", check: "seqCheck", reset: "seqReset", fb: "seqFb", items: SEQ, hints: SEQ_HINTS, item: "b-seq",
      solved: function () { return state.seqOk; },
      onOk: function (ev) { state.seqOk = true; addScore("b-seq", ev, "secuencia AutoPlate"); renderOk($("seqFb"), "Secuencia correcta.", "Programar, abrir, retirar, colocar en los topes, tensar y cerrar: así AutoPlate cambia cada plancha con precisión de registro."); $("plPart").hidden = false; scheduleSave(); } });
    seqSeq.render();
    $("plBank").addEventListener("click", function (e) {
      var b = e.target.closest(".pl-chip"); if (!b || state.mounted) return;
      var k = b.getAttribute("data-k"); plSel = plSel === k ? null : k; renderPlBank();
    });
    $("plUnits").addEventListener("click", function (e) {
      var b = e.target.closest(".uslot"); if (!b || state.mounted) return;
      var u = +b.getAttribute("data-u");
      if (plSel) { state.plateAt[u] = plSel; plSel = null; }
      else if (state.plateAt[u]) state.plateAt[u] = null;
      else { $("plFb").innerHTML = '<div class="info">Primero toca una plancha de la fila de arriba.</div>'; return; }
      $("plFb").innerHTML = ""; renderPlBank(); scheduleSave();
    });
    $("plClear").addEventListener("click", function () { if (state.mounted) return; state.plateAt = [null, null, null, null]; plSel = null; $("plFb").innerHTML = ""; renderPlBank(); scheduleSave(); });
    $("plMount").addEventListener("click", mountPlates);
  }
  function thumb(cv, k) { var src = RT.plates[k]; cv.getContext("2d").drawImage(src, 0, 0, cv.width, cv.height); }
  function renderPlBank() {
    if (!RT.plates) return;
    var used = state.plateAt.filter(Boolean), order = state.plOrder || PS.ORDER;
    var free = order.filter(function (k) { return used.indexOf(k) < 0; });
    $("plBank").innerHTML = free.length ? free.map(function (k) {
      return '<button type="button" class="pl-chip" data-k="' + k + '" aria-pressed="' + (plSel === k) + '" aria-label="Plancha ' + PS.INKS[k].name + '"><canvas data-th="' + k + '" width="86" height="66"></canvas>Plancha ' + k + '</button>';
    }).join("") : '<span class="small">' + (state.mounted ? "Planchas montadas en la máquina." : "Todas las planchas están en un cuerpo. Revisa el orden y móntalas.") + '</span>';
    $("plUnits").innerHTML = [0, 1, 2, 3].map(function (u) {
      var k = state.plateAt[u];
      return '<button type="button" class="uslot' + (k ? " full" : "") + (state.mounted ? " ok" : "") + '" data-u="' + u + '"' + (state.mounted ? " disabled" : "") + ' aria-label="Cuerpo ' + (u + 1) + (k ? ": plancha " + PS.INKS[k].name : ": vacío") + '"><b>Cuerpo ' + (u + 1) + '</b>' +
        (k ? '<canvas data-th="' + k + '" width="80" height="62"></canvas><span><span class="dot" style="background:' + PS.INKS[k].hex + '"></span> ' + PS.INKS[k].name + '</span>' : '<span class="small">Vacío</span>') +
        (u === 0 ? '<span class="in1">↓ entra el pliego</span>' : u === 3 ? '<span class="in1">sale al barniz →</span>' : '<span class="in1">&nbsp;</span>') + '</button>';
    }).join("");
    [].forEach.call(document.querySelectorAll("#plBank canvas[data-th], #plUnits canvas[data-th]"), function (cv) { thumb(cv, cv.getAttribute("data-th")); });
    $("plMount").disabled = state.mounted || used.length < 4;
    $("plClear").disabled = state.mounted;
  }
  function mountPlates(ev) {
    if (state.mounted) return;
    var a = state.plateAt, ok = true;
    for (var i = 0; i < 4; i++) if (a[i] !== PS.ORDER[i]) ok = false;
    if (!ok) {
      miss("b-ord", a.join("-"));
      var pista = a[3] !== "Y" ? "¿Qué tinta es la más clara y transparente? Esa suele ir al final." : a[0] !== "K" ? "El cuerpo 1 suele llevar el negro: sirve de referencia para registrar los demás colores." : "Entre cian y magenta, ¿cuál va antes en la secuencia habitual?";
      renderRetry($("plFb"), pista, "La secuencia habitual en cuatricromía es negro, cian, magenta y amarillo (K-C-M-Y): las tintas se ordenan de mayor a menor tiro (tack) para que cada una se asiente sobre la anterior aún húmeda; el amarillo, la más transparente, va al final.",
        "La secuencia puede variar según el trabajo y el fabricante de tintas; en este taller se trabaja K-C-M-Y.", "Tu orden: " + a.join(" → ") + ".");
      return;
    }
    $("plMount").disabled = true;
    addScore("b-ord", ev, "K-C-M-Y");
    renderOk($("plFb"), "Orden correcto: K → C → M → Y.", "Negro primero como referencia de registro y amarillo al final por ser la tinta más transparente." + (V.ok ? " Mira la prensa: AutoPlate está montando las planchas…" : ""));
    state.mounted = true; scheduleSave();
    var chain = Promise.resolve();
    if (V.ok) PS.ORDER.forEach(function (k, i) { chain = chain.then(function () { return P3.setPlate(i, RT.plates[k], k, PS.INKS[k].hex, true); }); });
    chain.then(function () {
      renderPlBank(); if (V.ok) P3.focus("units");
      toast("Las cuatro planchas están montadas. <b>¡Trabajo limpio, " + esc(who()) + "!</b>");
      phaseDone("p2");
    });
  }

  /* ================= 3.3 TINTAS ================= */
  var canSel = null;
  function initP3() {
    $("inkCans").addEventListener("click", function (e) {
      var b = e.target.closest(".can"); if (!b || b.disabled) return;
      var id = b.getAttribute("data-c"); canSel = canSel === id ? null : id; renderInks();
    });
    $("inkFts").addEventListener("click", function (e) {
      var b = e.target.closest(".ft-drop"); if (!b || b.disabled) return;
      var u = +b.getAttribute("data-u");
      if (!canSel) { $("inkFb").innerHTML = '<div class="info">Primero toca un tarro de tinta; después, el tintero.</div>'; return; }
      loadInk(u, canSel, e, b);
    });
    $("inkFts").addEventListener("input", function (e) {
      var t = e.target; if (t.type !== "range") return;
      var u = +t.getAttribute("data-u"), v = +t.value; state.levels[u] = v;
      t.nextElementSibling.textContent = v + " %";
      var tr = t.closest(".ft").querySelector(".trough i"); if (tr) tr.style.height = Math.max(3, v * 0.22) + "px";
      if (V.ok && state.inks[u]) P3.setInk(u, PS.INKS[state.inks[u]].hex, v, false);
      scheduleSave();
    });
    $("inkCheck").addEventListener("click", checkLevels);
  }
  function renderInks() {
    var order = state.canOrder || INK_CANS.map(function (c) { return c.id; });
    $("inkCans").innerHTML = order.map(function (id) {
      var c = canById(id), used = state.inks.indexOf(id) >= 0;
      return '<button type="button" class="can' + (used ? " used" : "") + '" data-c="' + id + '" aria-pressed="' + (canSel === id) + '"' + (used || state.inkOk ? " disabled" : "") + '><span class="tin" style="background:' + canHex(c) + '"></span>' + esc(c.name) + '</button>';
    }).join("");
    $("inkFts").innerHTML = [0, 1, 2, 3].map(function (u) {
      var k = state.plateAt[u] || PS.ORDER[u], ink = state.inks[u], c = ink ? canById(ink) : null, lv = state.levels[u];
      return '<div class="ft' + (ink ? " full" : "") + '"><button type="button" class="ft-drop" data-u="' + u + '"' + (ink ? " disabled" : "") + '><span class="trough"><i style="height:' + (ink ? Math.max(3, lv * 0.22) : 0) + 'px;background:' + (c ? canHex(c) : "transparent") + '"></i></span><span><b>Cuerpo ' + (u + 1) + '</b><br><span class="small">Plancha ' + PS.INKS[k].name + ' (' + k + ')</span><br>' +
        (ink ? '✓ ' + esc(c.name) : '<span class="small">Tintero vacío: toca para cargar</span>') + '</span></button>' +
        '<label class="lb" for="lvl' + u + '" style="margin-top:8px">Nivel del tintero</label><div class="rng"><input type="range" id="lvl' + u + '" data-u="' + u + '" min="0" max="100" step="5" value="' + lv + '"' + (ink && !state.lvlOk ? "" : " disabled") + '><output>' + lv + ' %</output></div></div>';
    }).join("");
    $("inkCheck").disabled = !state.inkOk || state.lvlOk;
    renderRiddles();
  }
  function loadInk(u, id, ev, btn) {
    var need = state.plateAt[u], c = canById(id);
    if (id === need) {
      state.inks[u] = id; canSel = null;
      if (V.ok) { P3.focus({ unit: u }); P3.setInk(u, PS.INKS[id].hex, state.levels[u], true); }
      schedule3D();
      var n = state.inks.filter(Boolean).length;
      if (n === 4) { state.inkOk = true; addScore("c-ink", ev, "4 tintas en su tintero"); renderOk($("inkFb"), "Las cuatro tintas están en sus tinteros.", "Cada tintero alimenta la plancha de su color. Ahora sube el nivel de cada tintero y confírmalo."); }
      else renderOk($("inkFb"), esc(c.name) + " en el cuerpo " + (u + 1) + ".", "Coincide con su plancha (" + PS.INKS[need].name + "). Llevas " + n + " de 4.");
      renderInks(); scheduleSave();
      return;
    }
    miss("c-ink", id + " → cuerpo " + (u + 1));
    btn.classList.add("shake"); setTimeout(function () { btn.classList.remove("shake"); }, 400);
    var r = id === "VAR" ? ["El barniz no va en el tintero de un cuerpo impresor.", "El barniz se aplica en la unidad de barniz (parte 10), con rasqueta de cámara.", "Si cargas barniz en un tintero habría que lavar toda la batería."] :
      id === "P485" ? ["¿Este trabajo usa tintas directas?", "La orden es 4/0 en cuatricromía: solo C, M, Y y K. El Pantone 485 C es una tinta directa (un rojo).", "Una tinta directa necesita su propia plancha y un cuerpo adicional."] :
        ["Mira qué plancha está montada en el cuerpo " + (u + 1) + ".", "El cuerpo " + (u + 1) + " lleva la plancha " + PS.INKS[need].name + " (" + need + "): necesita " + canById(need).name.toLowerCase() + ".", "Una tinta equivocada contamina la batería y obliga a lavarla: cuesta tiempo y maculatura."];
    renderRetry($("inkFb"), r[0], r[1], r[2]);
  }
  function checkLevels(ev) {
    var bad = [];
    state.levels.forEach(function (v, u) { if (v < 40 || v > 70) bad.push(u); });
    if (!bad.length) {
      state.lvlOk = true; addScore("c-lvl", ev, state.levels.join(" / ") + " %");
      renderOk($("inkFb"), "Niveles correctos.", "Entre 40 y 70 %: el rodillo del tintero queda cubierto sin desbordar. Un nivel estable da un color estable.");
      renderInks(); showRiddle(2); scheduleSave(); return;
    }
    miss("c-lvl", state.levels.join(" / "));
    var v = state.levels[bad[0]];
    renderRetry($("inkFb"), v < 40 ? "Con poca tinta, el rodillo del tintero no queda cubierto y el color cae durante el tiraje." : "Con demasiada tinta, el tintero se desborda y ensucia la máquina.",
      "Nivel de trabajo de referencia: 40–70 % (didáctico). Revisa: " + bad.map(function (x) { return "cuerpo " + (x + 1) + " (" + state.levels[x] + " %)"; }).join(", ") + ".",
      "Carga poco y a menudo: así la tinta se mantiene fresca y el color, estable.");
  }

  /* ================= 3.4 PUPITRE ================= */
  function regRow(k, ax, lbl) {
    function b(d, t) { return '<button type="button" data-reg="' + k + ':' + ax + ':' + d + '" aria-label="' + lbl + ' del ' + PS.INKS[k].name.toLowerCase() + ' ' + t + ' mm">' + t + '</button>'; }
    return '<div class="regc"><span class="lb">' + lbl + '</span>' + b(-0.1, "−0,1") + b(-0.01, "−0,01") + '<output id="rg' + k + ax + '">0,00</output>' + b(0.01, "+0,01") + b(0.1, "+0,1") + '</div>';
  }
  var pcRoll = null, pcRollU = 0;
  function renderPcRoll() {
    if (!pcRoll || !state.seed) return;
    var k = PS.ORDER[pcRollU], loaded = !!state.inks[pcRollU];
    pcRoll.set({ ink: loaded ? state.ctl.feed[pcRollU] / state.seed.ideal[k] : 0, water: state.ctl.water[pcRollU], press: state.ctl.press, hex: PS.INKS[k].hex,
      label: "Cuerpo " + (pcRollU + 1) + " · " + PS.INKS[k].name + (loaded ? " · tintero " + state.ctl.feed[pcRollU] + " % · mojado " + state.ctl.water[pcRollU] + " %" : " (sin tinta cargada)") });
  }
  function initP4() {
    $("pcUnits").innerHTML = PS.ORDER.map(function (k, i) {
      var ink = PS.INKS[k];
      var h = '<div class="pc-unit"><h4><span class="dot" style="background:' + ink.hex + '"></span>Cuerpo ' + (i + 1) + ' · ' + ink.name + ' (' + k + ')</h4>' +
        '<label class="lb" for="pcF' + i + '">Tintero · apertura de zonas</label><div class="rng"><input type="range" id="pcF' + i + '" data-f="' + i + '" min="0" max="100" step="1"><output id="pcF' + i + 'v"></output></div>' +
        '<label class="lb" for="pcW' + i + '">Mojado Alcolor</label><div class="rng"><input type="range" id="pcW' + i + '" data-w="' + i + '" min="0" max="100" step="1"><output id="pcW' + i + 'v"></output></div>';
      h += k !== "K" ? regRow(k, 0, "Circunf.") + regRow(k, 1, "Lateral") : '<p class="small" style="margin:6px 0 0">Registro: el negro es la referencia de los demás colores.</p>';
      return h + '</div>';
    }).join("");
    $("pcUnits").addEventListener("input", function (e) {
      var t = e.target;
      if (t.getAttribute("data-f") != null) state.ctl.feed[+t.getAttribute("data-f")] = +t.value;
      else if (t.getAttribute("data-w") != null) state.ctl.water[+t.getAttribute("data-w")] = +t.value;
      else return;
      renderPcVals(); schedule3D(); scheduleSave();
    });
    $("pcUnits").addEventListener("click", function (e) {
      var b = e.target.closest("[data-reg]"); if (!b) return;
      var p = b.getAttribute("data-reg").split(":"), k = p[0], ax = +p[1], d = +p[2];
      state.ctl.reg[k][ax] = Math.max(-1.5, Math.min(1.5, Math.round((state.ctl.reg[k][ax] + d) * 100) / 100));
      renderPcVals(); scheduleSave();
    });
    $("pcPress").addEventListener("input", function () { state.ctl.press = Math.round(+this.value * 100) / 100; renderPcVals(); schedule3D(); scheduleSave(); });
    $("pcSpeed").addEventListener("input", function () { setSpeedSet(+this.value); });
    $("pcCip3").addEventListener("change", function () { state.ctl.cip3 = this.checked; scheduleSave(); });
    $("pcPrint").addEventListener("click", testPrint);
    pcRoll = ROLLERS.create($("pcRoll"), { hex: PS.INKS.K.hex });
    $("pcRollTabs").addEventListener("click", function (e) {
      var b = e.target.closest("[data-u]"); if (!b) return;
      pcRollU = +b.getAttribute("data-u");
      [].forEach.call(this.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      renderPcRoll();
    });
  }
  function renderPcVals() {
    var c = state.ctl;
    $("pcPress").value = c.press; $("pcPressV").textContent = fmt(c.press) + " mm";
    $("pcSpeed").value = state.mset; $("pcSpeedV").textContent = fmtN(state.mset) + " pl/h";
    $("pcCip3").checked = c.cip3;
    for (var i = 0; i < 4; i++) {
      $("pcF" + i).value = c.feed[i]; $("pcF" + i + "v").textContent = c.feed[i] + " % · " + c.feed[i] * 5 + " incr.";
      $("pcW" + i).value = c.water[i]; $("pcW" + i + "v").textContent = c.water[i] + " %";
    }
    ["C", "M", "Y"].forEach(function (k) { $("rg" + k + "0").textContent = sign(c.reg[k][0]); $("rg" + k + "1").textContent = sign(c.reg[k][1]); });
    renderWaste();
    $("pcOk").classList.toggle("on", !!state.okSheet);
    renderPcRoll();
  }
  function regsOf(m) { return { K: [0, 0], C: m.inks.C.reg, M: m.inks.M.reg, Y: m.inks.Y.reg }; }
  function summarize(m) {
    var o = { press: m.press, ok: m.ok, inks: {} };
    PS.ORDER.forEach(function (k) { var r = m.inks[k]; o.inks[k] = { D: r.D, Dmin: r.Dmin, Dmax: r.Dmax, tvi: r.tvi, water: r.water, feed: r.feed, reg: r.reg, ok: r.ok }; });
    return o;
  }
  function drawPrint(m) {
    var P = PS.paramsFrom(m); RT.meas = m;
    PS.composite(RT.sep, P, { w: 900, exag: 6, canvas: $("pcSheet") });
    PS.regLoupe($("pcReg"), regsOf(m), { ppm: 18 });
    renderReadings(m);
    return P;
  }
  function testPrint(ev) {
    if (!RT.sep) return;
    if (!printingState()) {
      var falta = [];
      if (M.estop) falta.push("rearmar el paro de emergencia");
      if (!M.run) falta.push("🔔 Aviso y ▶ Marcha");
      if (!M.air) falta.push("💨 Aire");
      if (!M.feed) falta.push("📄 Marcador");
      if (!M.imp) falta.push("🖨 Impresión");
      renderRetry($("pcFb"), "La prensa todavía no está imprimiendo: falta " + falta.join(", ") + ".", "Secuencia de arranque en la consola de marcha (debajo de la prensa 3D): 🔔 Aviso → ▶ Marcha → 💨 Aire → 📄 Marcador → 🖨 Impresión.",
        "Arrancar en orden protege a las personas y a la máquina: la impresión se activa solo cuando ya entran pliegos.");
      openConsole(); return;
    }
    if (inPress()) addScore("e-start", null, "Aviso → Marcha → Aire → Marcador → Impresión");
    state.prints++;
    var m = PS.measure(state.ctl, state.seed), P = drawPrint(m);
    state.lastMeas = summarize(m);
    if (V.ok) {
      if (state.prints === 1) P3.focus("units");
      P3.setStages(stagesFor(P));
      P3.setScreen(screenData(m, m.ok || state.okSheet));
    }
    schedule3D();
    if (m.ok && !state.okSheet) reachedOk(ev);
    else if (!m.ok) printFeedback(m);
    else renderOk($("pcFb"), "Sigue en OK.", "Este pliego también está en tolerancia: así se mantiene el tiraje estable.");
    if (M.speed > 10000) $("pcFb").insertAdjacentHTML("beforeend", '<div class="info" style="margin-top:8px">Referencia del taller: los pliegos de ajuste suelen tirarse a velocidad moderada (6 000–8 000 pl/h); la velocidad de producción se sube cuando el pliego ya está en OK.</div>');
    renderPcVals(); scheduleSave();
  }
  function renderReadings(m) {
    function cell(ok, v, sub) { return '<td class="' + (ok ? "y" : "n") + '"><span class="v">' + (ok ? "✓ " : "⚠ ") + v + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</td>'; }
    $("pcRows").innerHTML = PS.ORDER.map(function (k, i) {
      var r = m.inks[k], ink = PS.INKS[k];
      return '<tr><td><span class="dot" style="background:' + ink.hex + '"></span> ' + (i + 1) + ' · ' + k + '</td>' +
        cell(r.dOk, fmt(r.D), "meta " + fmt(ink.target) + " ± " + fmt(ink.tol)) +
        cell(r.uOk, fmt(r.Dmin) + "–" + fmt(r.Dmax), r.uOk ? "pareja en todo el ancho" : "desigual entre zonas") +
        cell(r.tOk, r.tvi + " %", "meta 11–17 %") +
        cell(r.wOk, r.water + " %", r.scum ? "velo en zonas sin imagen" : r.wash ? "imagen lavada, moteada" : "ventana 35–55 %") +
        (k === "K" ? '<td class="y"><span class="v">referencia</span></td>' : cell(r.rOk, sign(r.reg[0]) + " / " + sign(r.reg[1]) + " mm", "tolerancia ± 0,05")) + '</tr>';
    }).join("") + '<tr><td>Presión</td><td colspan="5" class="' + (m.pressOk ? "y" : "n") + '"><span class="v">' + (m.pressOk ? "✓ " : "⚠ ") + fmt(m.press) + ' mm</span><small>' +
      (m.mottle ? "insuficiente: transferencia incompleta (moteado)" : m.gain ? "excesiva: más ganancia de punto" + (m.dbl ? " y remosqueo" : "") : "ventana 0,10–0,15 mm") + '</small></td></tr>';
  }
  function okCount(m) {
    var n = m.pressOk ? 1 : 0;
    PS.ORDER.forEach(function (k) { var r = m.inks[k]; n += (r.dOk ? 1 : 0) + (r.uOk ? 1 : 0) + (r.tOk ? 1 : 0) + (r.wOk ? 1 : 0) + (k === "K" || r.rOk ? 1 : 0); });
    return n;
  }
  function issuesOf(m) {
    var L = [];
    if (!m.pressOk) L.push({ p: m.press < 0.1 ? "Sube la presión: la mantilla no transfiere toda la tinta y el pliego sale moteado." : "Baja la presión: sube la ganancia de punto" + (m.dbl ? " y aparece remosqueo." : "."), d: "Presión actual " + fmt(m.press) + " mm; ventana 0,10–0,15 mm.", c: "Primero se fija la presión: si cambia, todas las densidades cambian con ella." });
    PS.ORDER.forEach(function (k, i) {
      var r = m.inks[k];
      if (!r.wOk) L.push({ p: r.water < 35 ? "Sube el mojado del cuerpo " + (i + 1) + " (" + k + "): hay velo en zonas sin imagen." : "Baja el mojado del cuerpo " + (i + 1) + " (" + k + "): el exceso de agua lava la imagen.", d: "Mojado " + r.water + " %; ventana de referencia 35–55 %.", c: "El equilibrio agua-tinta va antes que la densidad: con el agua mal, la densidad no se estabiliza." });
    });
    if (!state.ctl.cip3 && PS.ORDER.some(function (k) { return !m.inks[k].uOk; }))
      L.push({ p: "Activa el preajuste de zonas (CIP3/CIP4): la densidad cambia de una zona a otra del pliego.", d: "Cada zona del tintero debe abrirse según cuánta imagen tiene su franja del pliego.", c: "La preimpresión calcula la cobertura de cada zona desde las planchas y la envía a la prensa." });
    PS.ORDER.forEach(function (k, i) {
      var r = m.inks[k], ink = PS.INKS[k];
      if (!r.dOk) L.push({ p: (r.D < ink.target ? "Abre" : "Cierra") + " el tintero del cuerpo " + (i + 1) + " (" + k + "): densidad " + fmt(r.D) + ".", d: "Meta " + fmt(ink.target) + " ± " + fmt(ink.tol) + ".", c: "Más apertura = capa de tinta más gruesa = más densidad. Muévelo en pasos de 3 a 5 %." });
    });
    PS.ORDER.forEach(function (k, i) {
      var r = m.inks[k];
      if (r.dOk && r.wOk && !r.tOk) L.push({ p: "La ganancia del cuerpo " + (i + 1) + " está fuera de rango (" + r.tvi + " %).", d: "Meta 11–17 % en el parche del 50 %.", c: "La ganancia sube con el exceso de tinta o de presión." });
    });
    ["C", "M", "Y"].forEach(function (k) {
      var r = m.inks[k], a = Math.abs(r.reg[0]) > 0.05, b = Math.abs(r.reg[1]) > 0.05;
      if (a || b) L.push({ p: "Corrige el registro del " + PS.INKS[k].name.toLowerCase() + ": " + (a ? "circunferencial " + sign(-r.reg[0]) + " mm" : "") + (a && b ? " y " : "") + (b ? "lateral " + sign(-r.reg[1]) + " mm" : "") + ".", d: "Desvío medido: " + sign(r.reg[0]) + " / " + sign(r.reg[1]) + " mm; tolerancia ± 0,05 mm.", c: "Mueve un cuerpo a la vez y compara su cruz con la del negro en el cuentahílos." });
    });
    return L;
  }
  function printFeedback(m) {
    var L = issuesOf(m), f = L[0] || { p: "Revisa la tabla de medición.", d: "", c: "" };
    $("pcFb").innerHTML = '<div class="retry"><p class="pausa">Aún no es el pliego OK, pero vas bien: ' + okCount(m) + ' de 21 controles ya están en rango.</p><dl><dt>Pista</dt><dd>' + f.p + '</dd><dt>Dato clave</dt><dd>' + f.d + '</dd><dt>Contexto</dt><dd>' + f.c + '</dd></dl>' +
      (L.length > 1 ? '<p style="margin:8px 0 0"><b>También revisa:</b></p><ul style="margin:4px 0 0;padding-left:20px">' + L.slice(1, 7).map(function (x) { return '<li>' + x.p + '</li>'; }).join("") + '</ul>' : '') +
      '<p class="re">Ajusta, saca otro pliego y vuelve a medir: cada medición te acerca.</p></div>';
  }
  function reachedOk(ev) {
    state.okSheet = true; state.okCtl = JSON.parse(JSON.stringify(state.ctl)); state.okPrints = state.prints; state.okMac = state.cnt.mac;
    addScore("e-ok", ev, state.prints + " mediciones");
    var pts = state.prints <= 6 ? 10 : state.prints <= 10 ? 6 : 3;
    addFixed("e-eff", pts, null, state.prints + " mediciones · " + fmtN(state.cnt.mac) + " pliegos de maculatura");
    renderOk($("pcFb"), "¡Pliego OK!", "Densidades, ganancia, agua, presión y registro en tolerancia con " + state.prints + (state.prints === 1 ? " medición" : " mediciones") + " (" + fmtN(state.cnt.mac) + " pliegos de maculatura en el contador). Desde ahora, cada pliego impreso suma a los buenos. " +
      (pts === 10 ? "Eficiencia de maquinista con experiencia." : pts === 6 ? "Buena eficiencia: con práctica bajarás aún más la maculatura." : "Lo lograste. La próxima vez corrige primero presión y agua para ahorrar pliegos."));
    phaseDone("p4");
  }

  /* ================= 3.5 REVISIÓN ================= */
  var curDef = null;
  function initP5() {
    bindLoupe("rvProof", "rvLoupeP", function () { return RT.sep && state.okSheet ? { sep: RT.sep, P: PS.idealParams() } : null; });
    bindLoupe("rvMine", "rvLoupe", function () { return RT.sep && RT.okP ? { sep: RT.sep, P: RT.okP } : null; });
    bindLoupe("rvGhost", "rvGLoupe", function () { return RT.ghostSep ? { sep: RT.ghostSep, P: RT.ghost.P, exag: 3 } : null; });
    $("rvSign").addEventListener("click", function (ev) {
      var n = $("rvName").value.trim();
      if (n.length < 5) { $("rvFb").innerHTML = '<div class="info">Escribe tu nombre completo para firmar el pliego OK.</div>'; $("rvName").focus(); return; }
      state.signed = true; state.signName = n;
      addScore("f-sign", ev, n);
      renderOk($("rvFb"), "Pliego OK firmado por " + esc(n) + ".", "Este pliego, junto con la prueba de color, es la referencia de todo el tiraje: el maquinista lo compara con los pliegos de producción cada cierto tiempo.");
      renderSign(); checkP5(); scheduleSave();
    });
    $("rvPng").addEventListener("click", downloadSheetPng);
    $("rvGhost").addEventListener("click", function (e) {
      if (!RT.ghostSep) return;
      var L = RT.ghostSep.L, r = this.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * L.sheet.w, my = (e.clientY - r.top) / r.height * L.sheet.h, hit = null;
      RT.ghost.zones.forEach(function (z) { if (hit) return; if (z.rect ? (mx >= z.rect[0] && mx <= z.rect[2] && my >= z.rect[1] && my <= z.rect[3]) : (mx - z.x) * (mx - z.x) + (my - z.y) * (my - z.y) <= z.r * z.r) hit = z; });
      if (!hit) { $("dfFb").innerHTML = '<div class="info">Aquí el pliego está bien. Usa el cuentahílos y compara con tu pliego OK: busca colores corridos, tinta donde no hay imagen, puntos extraños e imágenes dobles.</div>'; return; }
      var st = state.defects[hit.id] || {};
      if (st.fixed) { renderOk($("dfFb"), "Ya diagnosticaste este defecto:", DEFECTS[hit.id].name + "."); return; }
      openDefect(hit.id);
    });
    $("defPanel").addEventListener("click", function (e) {
      var b = e.target.closest(".opt"); if (!b || !curDef) return;
      var D = DEFECTS[curDef], st = state.defects[curDef] = state.defects[curDef] || {}, n = D.n;
      if (b.hasAttribute("data-dn")) {
        var v = b.getAttribute("data-dn");
        if (v === D.name) {
          st.named = true; addScore("f-d" + n, e, v);
          renderOk($("dfFb"), "¡Bien visto! Es " + D.name.toLowerCase() + ".", D.why);
          renderDefects(); openDefect(curDef); scheduleSave();
        } else {
          miss("f-d" + n, v); b.classList.add("shake"); setTimeout(function () { b.classList.remove("shake"); }, 400);
          renderRetry($("defQFb"), D.hint[0], D.hint[1], D.hint[2], "«" + esc(v) + "» no explica lo que se ve en esta zona.");
        }
      } else {
        var a = b.getAttribute("data-da");
        if (a === D.act) {
          st.fixed = true; addScore("f-c" + n, e, a);
          $("defPanel").hidden = true; curDef = null;
          renderOk($("dfFb"), "Corrección correcta.", D.fix);
          renderDefects(); checkP5(); scheduleSave();
        } else {
          miss("f-c" + n, a);
          renderRetry($("defQFb"), "¿Qué control actúa sobre la causa del defecto?", D.why, "Corrige la causa, no el síntoma: así el defecto no vuelve en el tiraje.");
        }
      }
    });
  }
  function bindLoupe(cvId, loupeId, getter) {
    var cv = $(cvId), lp = $(loupeId), pending = 0, last = null;
    function at(e) {
      var src = getter(); if (!src) return;
      var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (x < 0 || y < 0 || x > 1 || y > 1) { lp.classList.remove("on"); return; }
      var host = cv.parentNode.getBoundingClientRect(), off = x > 0.65 ? -190 : 20;
      lp.style.left = (e.clientX - host.left + off) + "px"; lp.style.top = Math.max(0, e.clientY - host.top - 85) + "px";
      lp.classList.add("on");
      last = { x: x * src.sep.L.sheet.w, y: y * src.sep.L.sheet.h, src: src };
      if (pending) return;
      pending = requestAnimationFrame(function () { pending = 0; PS.loupe(lp, last.src.sep, last.src.P, last.x, last.y, { ppm: 40, exag: last.src.exag || 1 }); });
    }
    cv.addEventListener("pointermove", at);
    cv.addEventListener("pointerdown", at);
    cv.addEventListener("pointerleave", function () { lp.classList.remove("on"); });
  }
  function renderReview() {
    if (!state.okSheet || !RT.sep) return;
    var okM = PS.measure(state.okCtl, state.seed); RT.okP = PS.paramsFrom(okM);
    PS.composite(RT.sep, PS.idealParams(), { w: 600, canvas: $("rvProof") });
    PS.composite(RT.sep, RT.okP, { w: 600, canvas: $("rvMine") });
    state.dE = Math.round(PS.deltaE($("rvProof"), $("rvMine")) * 10) / 10;
    var maxReg = 0;
    ["C", "M", "Y"].forEach(function (k) { maxReg = Math.max(maxReg, Math.abs(okM.inks[k].reg[0]), Math.abs(okM.inks[k].reg[1])); });
    function kpi(t, v) { return '<div><dt>' + t + '</dt><dd>' + v + '</dd></div>'; }
    $("rvKpis").innerHTML = kpi("Densidad K · C · M · Y", '<span style="font-size:15px">' + PS.ORDER.map(function (k) { return fmt(okM.inks[k].D); }).join(" · ") + '</span>') +
      kpi("ΔE medio vs. prueba", fmt(state.dE, 1) + '<span class="small" style="display:block;font-weight:500">aproximado (simulación)</span>') + kpi("Registro máximo", fmt(maxReg) + " mm") + kpi("Maculatura al OK", fmtN(state.okMac) + " pliegos");
    if (!$("rvName").value) $("rvName").value = state.signName || (state.student ? state.student.nombres + " " + state.student.apellidos : "");
    renderSign();
    if (RT.ghostSep) PS.composite(RT.ghostSep, RT.ghost.P, { w: 900, exag: 3, canvas: $("rvGhost") });
    renderDefects();
  }
  function renderSign() {
    $("rvSign").disabled = !!state.signed; $("rvName").disabled = !!state.signed;
    if (state.signed && !$("rvFb").innerHTML) renderOk($("rvFb"), "Pliego OK firmado por " + esc(state.signName) + ".", "Es la referencia de todo el tiraje.");
  }
  function openDefect(id) {
    curDef = id;
    var D = DEFECTS[id], st = state.defects[id] || {}, p = $("defPanel");
    p.hidden = false;
    if (!st.named) p.innerHTML = '<h4>🔎 Encontraste algo. ¿Qué defecto es?</h4><div class="opts">' + DEF_NAMES.map(function (n) { return '<button type="button" class="opt" data-dn="' + esc(n) + '">' + esc(n) + '</button>'; }).join("") + '</div><div class="fb" id="defQFb" aria-live="polite"></div>';
    else p.innerHTML = '<h4>🛠 ' + esc(D.name) + ': ¿qué corrección aplicarías?</h4><div class="opts">' + shuffle(DEF_LIST.map(function (k) { return DEFECTS[k].act; })).map(function (a) { return '<button type="button" class="opt" data-da="' + esc(a) + '">' + esc(a) + '</button>'; }).join("") + '</div><div class="fb" id="defQFb" aria-live="polite"></div>';
    scrollTo(p, "nearest");
  }
  function renderDefects() {
    $("defList").innerHTML = DEF_LIST.map(function (id) {
      var D = DEFECTS[id], st = state.defects[id] || {};
      return '<li class="' + (st.fixed ? "y" : "n") + '">' + (st.named ? esc(D.name) : "Defecto " + D.n + " · por encontrar") + (st.fixed ? " → " + esc(D.act) : st.named ? " → elige la corrección" : "") + '</li>';
    }).join("");
    if (!RT.ghostSep) return;
    var L = RT.ghostSep.L;
    $("rvMarks").innerHTML = RT.ghost.zones.filter(function (z) { var st = state.defects[z.id]; return st && st.named; }).map(function (z) {
      var fx = z.x / L.sheet.w; return '<div class="gmark' + (fx > 0.85 ? ' r' : fx < 0.15 ? ' l' : '') + '" style="left:' + (fx * 100) + '%;top:' + (z.y / L.sheet.h * 100) + '%;width:' + (z.r * 2 / L.sheet.w * 100) + '%;aspect-ratio:1"><span>' + esc(DEFECTS[z.id].name) + '</span></div>';
    }).join("");
  }
  function checkP5() {
    var fixed = DEF_LIST.filter(function (k) { return state.defects[k] && state.defects[k].fixed; }).length;
    if (fixed === 4 && !state.signed) $("dfFb").insertAdjacentHTML("beforeend", '<div class="info" style="margin-top:8px">¡Los cuatro defectos diagnosticados! Solo falta firmar tu pliego OK (parte A).</div>');
    if (state.signed && fixed === 4) {
      if (!RESTORING && !state.ph.p5) toast("Diagnóstico completo: <b>tu hipótesis de la Estación 1 ya tiene respuesta</b>. ¡Gran trabajo, " + esc(who()) + "!");
      phaseDone("p5");
    }
  }
  function downloadSheetPng() {
    if (!RT.sep || !RT.okP) { $("rvFb").innerHTML = '<div class="info">Primero consigue el pliego OK en el paso 3.4.</div>'; return; }
    var cv = PS.composite(RT.sep, RT.okP, { w: 1600 }), g = cv.getContext("2d"), k = cv.width / RT.sep.L.sheet.w;
    g.fillStyle = "rgba(29,29,27,.85)"; g.font = "600 " + Math.round(5 * k) + "px 'JetBrains Mono', Consolas, monospace";
    g.fillText("PLIEGO OK · " + (state.signName || who()) + " · " + new Date().toLocaleDateString("es-PE") + " · Speedmaster CD 102 (simulación)", 12 * k, cv.height - 3 * k);
    cv.toBlob(function (blob) { if (blob) saveFile("PliegoOK_" + fileWho() + ".png", blob, "image/png", $("rvFb")); }, "image/png");
  }

  /* ================= ESTACIÓN 4 ================= */
  function initS4() {
    $("anas").innerHTML = ANAGRAMS.map(function (a, i) {
      return '<div class="ana" id="ana' + i + '"><div class="tiles" id="anaT' + i + '" aria-label="Letras mezcladas"></div><p class="clue">' + a.clue + '</p>' +
        '<label class="lb" for="anaIn' + i + '">Tu respuesta</label><input type="text" id="anaIn' + i + '" autocomplete="off" autocapitalize="characters" spellcheck="false">' +
        '<div class="row"><button class="btn btn-primary btn-sm" type="button" data-ac="' + i + '">Comprobar</button><button class="btn btn-outline btn-sm" type="button" data-am="' + i + '">Volver a mezclar</button></div><div class="fb" id="anaFb' + i + '" aria-live="polite"></div></div>';
    }).join("");
    $("anas").addEventListener("click", function (e) {
      var c = e.target.closest("[data-ac]"), m = e.target.closest("[data-am]");
      if (c) checkAna(+c.getAttribute("data-ac"), e);
      if (m) { mix(+m.getAttribute("data-am")); scheduleSave(); }
    });
    $("anas").addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.id && e.target.id.indexOf("anaIn") === 0) checkAna(+e.target.id.slice(5), e); });
  }
  function mix(i) { var w = ANAGRAMS[i].w; state.anaMix[i] = shuffleNot(w.split("")).join(""); renderAna(i); }
  function renderAna(i) {
    var a = ANAGRAMS[i], solved = state.done[a.id] !== undefined;
    if (!state.anaMix[i]) state.anaMix[i] = shuffleNot(a.w.split("")).join("");
    $("anaT" + i).innerHTML = (solved ? a.w : state.anaMix[i]).split("").map(function (c) { return "<span>" + c + "</span>"; }).join("");
    $("ana" + i).classList.toggle("done", solved);
    if (solved) {
      $("anaIn" + i).value = a.w; $("anaIn" + i).disabled = true;
      [].forEach.call($("ana" + i).querySelectorAll("button"), function (b) { b.disabled = true; });
      if (!$("anaFb" + i).innerHTML) renderOk($("anaFb" + i), a.w + ".", a.def + " <i>" + a.ex + "</i>");
    }
  }
  function renderAnas() { ANAGRAMS.forEach(function (_, i) { renderAna(i); }); }
  function checkAna(i, ev) {
    var a = ANAGRAMS[i];
    if (state.done[a.id] !== undefined) return;
    var v = norm($("anaIn" + i).value);
    if (v === norm(a.w)) {
      addScore(a.id, ev, a.w);
      renderOk($("anaFb" + i), "¡" + a.w + "!", a.def + " <i>" + a.ex + "</i>");
      renderAna(i); checkS4(); scheduleSave(); return;
    }
    miss(a.id, v);
    var t = state.tries[a.id] || 0;
    renderRetry($("anaFb" + i), t >= 2 ? "Empieza con «" + a.w[0] + "»." : "Tiene " + a.w.length + " letras.", a.clue, "Es una palabra que usaste en el taller.", v ? "«" + esc(v) + "» todavía no es la palabra." : "Escribe tu respuesta.");
  }
  function checkS4() {
    if (anaSolved() === 3) showRiddle(3);
    if (anaSolved() === 3 && state.clues[3] !== null) completeStation("s4", "Resolviste MANTILLA, TINTERO y REGISTRO, y la última pista del código.");
  }

  /* ================= ESTACIÓN 5 ================= */
  function initS5() {
    var ins = $("dial").querySelectorAll("input");
    [].forEach.call(ins, function (inp, i) {
      inp.addEventListener("input", function () { this.value = this.value.replace(/\D/g, "").slice(0, 1); this.className = ""; if (this.value && ins[i + 1]) ins[i + 1].focus(); });
      inp.addEventListener("keydown", function (e) { if (e.key === "Backspace" && !this.value && ins[i - 1]) ins[i - 1].focus(); if (e.key === "Enter") checkSafe(e); });
    });
    $("safeBtn").addEventListener("click", checkSafe);
    TR.forEach(function (q) {
      $(q.id === "h-tr1" ? "tr1" : "tr2").innerHTML = '<p class="qt">' + q.q + '</p><div class="opts">' + q.opts.map(function (o, i) { return '<button type="button" class="opt" data-q="' + q.id + '" data-i="' + i + '">' + o.t + '</button>'; }).join("") + '</div><div class="fb" id="fb-' + q.id + '" aria-live="polite"></div>';
    });
    ["tr1", "tr2"].forEach(function (id) {
      $(id).addEventListener("click", function (ev) {
        var b = ev.target.closest(".opt"); if (!b) return;
        var q = TR.filter(function (x) { return x.id === b.getAttribute("data-q"); })[0], o = q.opts[+b.getAttribute("data-i")];
        if (state.done[q.id] !== undefined) return;
        if (o.ok) { addScore(q.id, ev, o.t); renderOk($("fb-" + q.id), "Decisión correcta.", o.why); renderTr(); scheduleSave(); }
        else { miss(q.id, o.t); b.classList.add("shake"); setTimeout(function () { b.classList.remove("shake"); }, 400); renderRetry($("fb-" + q.id), o.r[0], o.r[1], o.r[2]); }
      });
    });
    ["r1", "r2"].forEach(function (id) {
      $(id).addEventListener("input", function () { state[id] = this.value; renderCount(id); scheduleSave(); });
    });
    $("tick").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-t]"); if (!b) return;
      state.ticket = +b.getAttribute("data-t"); renderTick();
      addScore("h-tick", ev, state.ticket + " / 4"); scheduleSave();
    });
    $("closeBtn").addEventListener("click", tryClose);
    $("printBtn").addEventListener("click", function () { fillConst(); window.print(); });
  }
  function checkSafe(ev) {
    if (state.safeOpen) return;
    var ins = $("dial").querySelectorAll("input"), v = [], right = 0;
    for (var i = 0; i < 4; i++) { var d = parseInt(ins[i].value, 10); v.push(isNaN(d) ? "?" : d); var g = d === CODE[i]; if (g) right++; ins[i].className = isNaN(d) ? "" : g ? "g" : "b"; }
    if (right === 4) {
      state.safeOpen = true; addScore("h-safe", ev, v.join(""));
      renderSafe();
      renderOk($("safeFb"), "¡Pupitre desbloqueado!", "Reuniste las cuatro pistas: marcador (2), AutoPlate (6), entintado y mojado (8) y tintero (9). Es el camino del pliego y de la tinta.");
      sparks(ev); scheduleSave(); return;
    }
    miss("h-safe", v.join(""));
    renderRetry($("safeFb"), "Los dígitos son los números de las partes de tus cuatro pistas, en orden.", "Tienes " + right + " de 4 dígitos en su lugar (marcados en verde).", "Tus pistas resueltas aparecen en la barra azul de arriba. Si te falta alguna, vuelve a su estación.");
  }
  function renderSafe() {
    var ins = $("dial").querySelectorAll("input");
    if (state.safeOpen) { [].forEach.call(ins, function (inp, i) { inp.value = CODE[i]; inp.className = "g"; inp.disabled = true; }); $("safeBtn").disabled = true; $("safeReveal").classList.add("on"); }
  }
  function renderTr() {
    TR.forEach(function (q) {
      var done = state.done[q.id] !== undefined;
      [].forEach.call(document.querySelectorAll('[data-q="' + q.id + '"]'), function (b) { var o = q.opts[+b.getAttribute("data-i")]; b.disabled = done; b.classList.toggle("right", done && !!o.ok); });
      if (done && !$("fb-" + q.id).innerHTML) renderOk($("fb-" + q.id), "Decisión correcta.", q.opts.filter(function (o) { return o.ok; })[0].why);
    });
  }
  function renderCount(id) { var n = (state[id] || "").trim().length; $(id + "c").textContent = n + " / mínimo 60 caracteres" + (n >= 60 ? " ✓" : ""); }
  function renderTick() { [].forEach.call($("tick").querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", +b.getAttribute("data-t") === state.ticket ? "true" : "false"); }); }
  function renderClose() {
    $("r1").value = state.r1 || ""; $("r2").value = state.r2 || ""; renderCount("r1"); renderCount("r2"); renderTick();
    if (state.closed) { $("closeBtn").disabled = true; $("closeMsg").textContent = "✓ Cierre registrado."; fillConst(); }
  }
  function tryClose(ev) {
    if (state.closed) return;
    var falta = [];
    if (!state.safeOpen) falta.push("abrir el pupitre");
    TR.forEach(function (q) { if (state.done[q.id] === undefined) falta.push("decidir sobre " + q.short); });
    if ((state.r1 || "").trim().length < 60) falta.push("escribir la reflexión 1 (60 caracteres)");
    if ((state.r2 || "").trim().length < 60) falta.push("escribir la reflexión 2 (60 caracteres)");
    if (!state.ticket) falta.push("elegir tu ticket de salida");
    if (falta.length) { $("closeMsg").textContent = "Ya casi lo tienes. Falta " + falta.join(", ") + "."; return; }
    addScore("h-ref", ev, state.r1.trim().length + " + " + state.r2.trim().length + " caracteres");
    state.closed = true; state.endTs = Date.now();
    $("closeBtn").disabled = true;
    $("closeMsg").textContent = "✓ Cierre registrado. ¡Felicitaciones, " + who() + "!";
    completeStation("s5", "Turno cerrado con " + state.score + " de " + MAX + " puntos. Descarga tu informe y tu pliego OK.");
    fillConst(); renderKpis();
    toast("🏁 <b>Turno cerrado.</b> La CD 102 quedó en buenas manos. ¡Bien hecho, " + esc(who()) + "!");
    sparks(ev); setTimeout(function () { sparks(null); }, 500);
    scrollTo($("constancia"), "center");
  }
  function fillConst() {
    var st = state.student || {};
    $("cName").textContent = (st.nombres || "") + " " + (st.apellidos || ""); $("cMail").textContent = st.email || "—";
    $("cDate").textContent = new Date(state.endTs || Date.now()).toLocaleString("es-PE");
    $("cScore").textContent = state.score + " / " + MAX + " pts"; $("cRank").textContent = RANKS[state.rankIdx].name;
    $("cOk").textContent = state.okSheet ? "Sí · " + state.okPrints + " pruebas · firmado por " + (state.signName || "—") : "Pendiente";
    $("constancia").classList.toggle("on", !!state.closed);
  }

  /* ================= MODALES ================= */
  var openId = null, lastFocus = null;
  function openModal(name) {
    var bg = $("m-" + name); if (!bg) return;
    if (name === "ayuda") renderAyuda();
    if (name === "mapa") { $("mapSvg").innerHTML = '<div class="svg-hot">' + pressSvg() + hotButtons() + '</div>'; renderFlow(); }
    if (name === "glosario") renderGlossary($("glSearch").value);
    lastFocus = document.activeElement; bg.classList.add("on"); openId = name;
    var x = bg.querySelector(".x"); if (x) x.focus();
  }
  function closeModal() {
    if (!openId) return;
    var bg = $("m-" + openId); bg.classList.remove("on");
    if (openId === "mapa") { bg.querySelector(".modal").classList.remove("max"); $("mapMax").setAttribute("aria-pressed", "false"); $("mapMax").textContent = "Ampliar diagrama"; }
    openId = null; if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function initModals() {
    [].forEach.call(document.querySelectorAll("[data-open]"), function (b) { b.addEventListener("click", function () { openModal(b.getAttribute("data-open")); }); });
    $("btnMapa").addEventListener("click", function () { openModal("mapa"); });
    [].forEach.call(document.querySelectorAll(".modal-bg"), function (bg) {
      bg.addEventListener("click", function (e) { if (e.target === bg) closeModal(); });
      bg.querySelector("[data-close]").addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", function (e) {
      if (!openId) return;
      if (e.key === "Escape") { closeModal(); return; }
      if (e.key === "Tab") {
        var f = $("m-" + openId).querySelectorAll('button:not([disabled]), [href], input, select, textarea');
        if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    $("mapMax").addEventListener("click", function () {
      var m = $("m-mapa").querySelector(".modal"), on = !m.classList.contains("max");
      m.classList.toggle("max", on); this.setAttribute("aria-pressed", on); this.textContent = on ? "Reducir diagrama" : "Ampliar diagrama";
    });
    $("mapSvg").addEventListener("click", function (e) { var b = e.target.closest(".hot"); if (!b) return; var id = +b.getAttribute("data-part"); closeModal(); goViewer(); showPart(id); });
    $("glSearch").addEventListener("input", function () { renderGlossary(this.value); });
    document.addEventListener("click", function (e) { var g = e.target.closest(".gl"); if (g) { $("glSearch").value = ""; openModal("glosario"); hlTerm(g.getAttribute("data-term")); } });
    $("partsGrid").addEventListener("click", function (e) { var b = e.target.closest("[data-part]"); if (b) { if (V.slot !== "slot-tour") mountViewer("slot-tour"); showPart(+b.getAttribute("data-part")); } });
  }
  function renderGlossary(q) {
    var n = norm(q);
    $("glList").innerHTML = GLOSSARY.filter(function (g) { return !n || norm(g.t + " " + g.d).indexOf(n) >= 0; }).map(function (g) { return '<li id="gl-' + g.id + '"><b>' + esc(g.t) + '</b><br>' + esc(g.d) + '</li>'; }).join("") || '<li>No hay términos con esa búsqueda. Prueba con otra palabra.</li>';
  }
  function hlTerm(id) { var li = $("gl-" + id); if (!li) return; li.classList.add("hl"); li.scrollIntoView({ block: "center" }); setTimeout(function () { li.classList.remove("hl"); }, 2600); }
  function renderFlow() {
    var h = "";
    STATION_ORDER.forEach(function (g, i) {
      var done = !!state.gates[g], cur = !done && (i === 0 ? !!state.student : !!state.gates[STATION_ORDER[i - 1]]), nm = STATION_NAMES[g].split(" · ");
      h += (i ? '<span class="flow-arrow" aria-hidden="true">→</span>' : '') + '<div class="flow-step' + (done ? " dn" : "") + (cur ? " cur" : "") + '"><b>' + (done ? "✓ " : "") + nm[0] + '</b><span>' + nm[1] + '</span></div>';
    });
    $("flow").innerHTML = h;
  }
  function renderAyuda() {
    $("ayScore").textContent = state.score + " de " + MAX + " puntos · rango " + RANKS[state.rankIdx].name + " · mejor racha " + state.bestStreak;
    $("ayList").innerHTML = STATION_ORDER.map(function (g, i) {
      var done = !!state.gates[g], open = i === 0 ? !!state.student : !!state.gates[STATION_ORDER[i - 1]];
      return '<li>' + (done ? "✓ " : open ? "▶ " : "🔒 ") + '<a href="#' + g + '">' + STATION_NAMES[g] + '</a> · ' + (done ? "superada" : open ? "en curso" : "bloqueada") + '</li>';
    }).join("");
    $("ayTip").textContent = pick(TIPS);
  }

  /* ================= GUARDADO ================= */
  /* Guarda como máximo cada 450 ms; no se reprograma en cada llamada, para que el contador de la prensa no aplace el guardado. */
  function scheduleSave() { if (RESTORING || !state.student || saveTimer) return; saveTimer = setTimeout(function () { saveTimer = null; saveNow(); }, 450); }
  function saveNow() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ v: 1, savedAt: Date.now(), state: state })); $("saveState").textContent = "✓ Avance guardado en este navegador · " + hhmm(Date.now()); }
    catch (e) { $("saveState").textContent = "Este navegador no permite guardar. Descarga tu informe antes de cerrar."; }
  }
  function readSave() { try { var o = JSON.parse(localStorage.getItem(LS_KEY) || "null"); return o && o.state && o.state.student ? o : null; } catch (e) { return null; } }
  function saveArt(art) {
    try {
      if (art.dataURL && art.dataURL.length < 1600000) { localStorage.setItem(LS_ART, JSON.stringify({ name: art.name, url: art.dataURL, vector: art.vector })); return true; }
      localStorage.removeItem(LS_ART);
    } catch (e) { }
    return false;
  }
  function loadSavedArt() {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(LS_ART) || "null"); } catch (e) { o = null; }
    if (!o || !o.url) return Promise.resolve(null);
    return PS.artFromDataURL(o.url, o.name, o.vector).then(null, function () { return null; });
  }
  function offerResume() {
    var sv = readSave(); if (!sv) return;
    var st = sv.state;
    $("resumeTxt").innerHTML = "Encontramos el turno de <b>" + esc(st.student.nombres + " " + st.student.apellidos) + "</b> (" + esc(st.student.email) + "), guardado el " +
      new Date(sv.savedAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + ": " + st.score + " pts y " + (st.current || 0) + " de " + STATION_ORDER.length + " estaciones.";
    $("resume").hidden = false;
    $("resumeYes").addEventListener("click", function () { restore(sv); });
    $("resumeNo").addEventListener("click", function () { try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_ART); } catch (e) { } $("resume").hidden = true; $("nom").focus(); });
  }
  function restore(sv) {
    RESTORING = true;
    var s = sv.state;
    Object.keys(s).forEach(function (k) { state[k] = s[k]; });
    $("nom").value = state.student.nombres; $("ape").value = state.student.apellidos; $("mail").value = state.student.email;
    STATION_ORDER.forEach(function (g, i) { if (i === 0 || state.gates[STATION_ORDER[i - 1]]) unlock(g); if (state.gates[g]) markDone(g); });
    PHASES.forEach(function (p, i) { if (i === 0 || state.ph[PHASES[i - 1]]) phaseUnlock(p); if (state.ph[p]) markPhase(p); });
    renderAll();
    RESTORING = false;
    $("resume").hidden = true;
    RT.ready.then(rebuildJob);
    toast("Bienvenido de vuelta, <b>" + esc(state.name) + "</b>. Tu turno sigue donde lo dejaste.");
    var next = null; STATION_ORDER.forEach(function (g) { if (!next && !state.gates[g]) next = g; });
    setTimeout(function () { scrollTo($(next || "s5")); }, 300);
  }
  function renderAll() {
    renderHip(); renderRiddles(); renderParts(); renderVchk(); renderDefs(); renderFlipProg();
    [].forEach.call($("flips").querySelectorAll(".flip"), function (b) { if (state.flipped[b.getAttribute("data-f")]) b.setAttribute("aria-pressed", "true"); });
    ordSeq.render(); renderJobForm(); seqSeq.render(); $("plPart").hidden = !state.seqOk;
    renderInks(); renderPcVals(); renderDefects(); renderAnas(); renderSafe(); renderTr(); renderClose(); renderFicha(); renderDims();
    setSpeedSet(state.mset || 5000, true); renderConsoleLive();
    updateHud(); checkRank(); renderFlow();
  }
  function rebuildJob() {
    var j = state.job;
    var p = j.art === "file" ? loadSavedArt() : Promise.resolve(null);
    return p.then(function (art) {
      if (j.art === "file" && !art) { j.art = "sample"; $("artMsg").textContent = "Tu archivo era muy grande para guardarlo en el navegador: se usa el afiche de muestra."; }
      RT.art = art || RT.sample;
      RT.L = PS.layout(j);
      if (!$("s3").classList.contains("locked")) refreshJob();
      if (j.ctp) generatePlates(false);
      renderPlBank(); renderInks();
      if (state.prints && RT.sep) { drawPrint(PS.measure(state.ctl, state.seed)); }
      if (state.okSheet) renderReview();
      sync3D();
    });
  }

  /* ================= INFORME ================= */
  function reportData() {
    var est = STATION_ORDER.map(function (g) {
      var got = 0, pos = 0;
      Object.keys(ITEMS).forEach(function (k) { if (ITEM_INFO[k][0] === g) { pos += ITEMS[k]; got += state.done[k] || 0; } });
      return { id: g, nombre: STATION_NAMES[g], estado: state.gates[g] ? "Superada" : ($(g).classList.contains("locked") ? "Bloqueada" : "En curso"), got: got, pos: pos };
    });
    var items = Object.keys(ITEMS).map(function (k) {
      var a = state.answers[k];
      return { id: k, est: STATION_NAMES[ITEM_INFO[k][0]], item: ITEM_INFO[k][1], intentos: a ? a.intentos : 0, ok: !!(a && a.correcto), primer: !!(a && a.alPrimerIntento), pts: state.done[k] || 0, max: ITEMS[k], resp: a ? a.respuesta : "" };
    });
    var pct = Math.round(state.score / MAX * 100);
    var nivel = pct >= 85 ? "Desempeño destacado" : pct >= 65 ? "Buen desempeño" : pct >= 40 ? "Desempeño en progreso" : "Desempeño inicial";
    var fuertes = [];
    est.forEach(function (e) {
      var its = items.filter(function (i) { return ITEM_INFO[i.id][0] === e.id; });
      if (its.length && its.every(function (i) { return i.primer; })) fuertes.push("Dominio completo en " + e.nombre + ": todo al primer intento.");
    });
    var primeros = items.filter(function (i) { return i.primer; }).length;
    if (primeros) fuertes.push(primeros + " de " + items.length + " retos resueltos al primer intento.");
    if (state.bestStreak >= 3) fuertes.push("Mejor racha de " + state.bestStreak + " aciertos seguidos.");
    if (state.okSheet) fuertes.push("Llegó al pliego OK con " + state.okPrints + " mediciones (" + fmtN(state.okMac) + " pliegos de maculatura).");
    if (state.gates.sI) fuertes.push("Completó la ficha de cálculo: área útil y orientación conveniente de las cuatro piezas.");
    if (state.closed) fuertes.push("Cerró el turno completo y desbloqueó el pupitre.");
    var reforzar = items.filter(function (i) { return i.intentos >= 2 || (!i.ok && i.intentos > 0); }).map(function (i) { return i.item + " (" + i.intentos + " intentos" + (i.ok ? ", resuelto" : ", pendiente") + ")"; });
    var fin = state.endTs || Date.now();
    return { est: est, items: items, pct: pct, nivel: nivel, fuertes: fuertes, reforzar: reforzar,
      minutos: state.startTs ? Math.max(1, Math.round((fin - state.startTs) / 60000)) : null,
      pistas: state.clues.map(function (c) { return c === null ? "?" : c; }).join(" "),
      superadas: est.filter(function (e) { return e.estado === "Superada"; }).length };
  }
  function fileWho() {
    var st = state.student || { apellidos: "estudiante", nombres: "" };
    return (st.apellidos + "_" + st.nombres).normalize("NFD").replace(/[^A-Za-z0-9_ ]/g, "").trim().replace(/\s+/g, "_");
  }
  function fileBase() {
    var d = new Date(), f = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    return "Informe_S06_A4_SimuladorOffset_" + fileWho() + "_" + f;
  }
  function tallerRows() {
    var j = state.job, pl = PS.byId(PS.PLATES, j.plate), sh = PS.byId(PS.SHEETS, j.sheet), tech = PS.byId(PS.TECH, j.tech), rows = [];
    rows.push(["Arte final", j.art === "file" ? (j.artName || "archivo propio") : "Afiche de muestra"]);
    rows.push(["Tamaño final", j.w + " × " + j.h + " mm · sangrado " + j.bleed + " mm"]);
    rows.push(["Plancha", pl ? pl.w + " × " + pl.h + " mm · " + (tech ? tech.name : "") : "—"]);
    rows.push(["Pliego", sh ? sh.label : "—"]);
    rows.push(["Imposición", RT.L && j.ctp ? RT.L.chosen.n + " copias (" + RT.L.chosen.cols + " × " + RT.L.chosen.rows + "), orientación " + (j.orient || "—") : "—"]);
    rows.push(["Montaje", state.mounted ? "K → C → M → Y con AutoPlate" : "Pendiente"]);
    rows.push(["Mediciones de la tira", state.prints + (state.prints === 1 ? " pliego medido" : " pliegos medidos")]);
    rows.push(["Contador de tiraje", fmtN(state.cnt.total) + " pliegos · maculatura " + fmtN(state.cnt.mac) + " · buenos " + fmtN(state.cnt.good)]);
    rows.push(["Secuencia de arranque", state.done["e-start"] !== undefined ? "Correcta" : "Pendiente"]);
    var m = state.okSheet ? PS.measure(state.okCtl, state.seed) : state.lastMeas;
    if (m && m.inks) {
      rows.push(["Densidades K · C · M · Y", PS.ORDER.map(function (k) { return fmt(m.inks[k].D); }).join(" · ")]);
      rows.push(["Registro C · M · Y (mm)", ["C", "M", "Y"].map(function (k) { return sign(m.inks[k].reg[0]) + "/" + sign(m.inks[k].reg[1]); }).join(" · ")]);
      rows.push(["Presión", fmt(m.press) + " mm"]);
    }
    rows.push(["Pliego OK", state.okSheet ? "Sí · con " + state.okPrints + " pruebas" : "Pendiente"]);
    rows.push(["ΔE medio vs. prueba", state.dE != null ? fmt(state.dE, 1) + " (aproximado)" : "—"]);
    rows.push(["Firma", state.signed ? state.signName : "Pendiente"]);
    rows.push(["Defectos diagnosticados", DEF_LIST.filter(function (k) { return state.defects[k] && state.defects[k].fixed; }).length + " de 4"]);
    return rows;
  }
  function buildMD() {
    var D = reportData(), st = state.student || {}, L = [];
    L.push("# Informe de desempeño · S06 · Actividad 4 · Simulador 3D de impresión offset (Speedmaster CD 102)", "");
    L.push("**Instituto Superior Tecnológico Diseño y Comunicación** · UD Producción y Publicación de Piezas Gráficas · Mg. Mario Quiroz Martínez", "");
    L.push("| Dato | Valor |", "|---|---|");
    L.push("| Estudiante | " + (st.nombres || "") + " " + (st.apellidos || "") + " |");
    L.push("| Correo | " + (st.email || "") + " |");
    L.push("| Fecha | " + new Date().toLocaleString("es-PE") + " |");
    L.push("| Tiempo en la actividad | " + (D.minutos != null ? D.minutos + " min" : "—") + " |");
    L.push("| Puntaje | " + state.score + " / " + MAX + " (" + D.pct + " %) |");
    L.push("| Nivel | " + D.nivel + " |");
    L.push("| Rango | " + RANKS[state.rankIdx].name + " |");
    L.push("| Estaciones superadas | " + D.superadas + " de " + STATION_ORDER.length + " |");
    L.push("| Mejor racha | " + state.bestStreak + " |");
    L.push("| Pistas del código | " + D.pistas + " |");
    L.push("| Hipótesis inicial | " + (state.hip ? HIP[state.hip] : "—") + " |");
    L.push("| Partes exploradas | " + countParts() + " de 16 |");
    L.push("| Turno cerrado | " + (state.closed ? "Sí" : "No") + " |", "");
    L.push("## Fortalezas", "");
    (D.fuertes.length ? D.fuertes : ["Inició el turno: el primer paso ya está dado."]).forEach(function (f) { L.push("- " + f); });
    L.push("", "## Para seguir practicando", "");
    (D.reforzar.length ? D.reforzar : ["Nada pendiente: resolvió todo con pocos intentos."]).forEach(function (f) { L.push("- " + f); });
    L.push("", "## Ficha de cálculo de imposición", "", "Pliego de referencia 1000 × 700 mm · margen de pinza declarado " + FREF.grip + " mm · área útil " + fichaArea() + ".", "",
      "| Pieza | Medida final | Orientación A | Orientación B | Conviene | Aprovechamiento | Estado |", "|---|---|---|---|---|---|---|");
    fichaRows().forEach(function (r) { L.push("| " + r.join(" | ") + " |"); });
    L.push("", "## Taller de prensa", "", "| Dato | Valor |", "|---|---|");
    tallerRows().forEach(function (r) { L.push("| " + r[0] + " | " + String(r[1]).replace(/\|/g, "/") + " |"); });
    L.push("", "## Estaciones", "", "| Estación | Estado | Puntos |", "|---|---|---|");
    D.est.forEach(function (e) { L.push("| " + e.nombre + " | " + e.estado + " | " + e.got + " / " + e.pos + " |"); });
    L.push("", "## Detalle por reto", "", "| Reto | Estación | Intentos | Primer intento | Puntos | Última respuesta |", "|---|---|---|---|---|---|");
    D.items.forEach(function (i) { L.push("| " + i.item + " | " + i.est + " | " + i.intentos + " | " + (i.primer ? "Sí" : (i.intentos ? "No" : "—")) + " | " + i.pts + " / " + i.max + " | " + String(i.resp || "").replace(/\|/g, "/") + " |"); });
    L.push("", "## Reflexiones", "");
    L.push("**¿En qué encargo real lo aplicaría?**", "", state.r1 || "_Pendiente_", "");
    L.push("**Dos hallazgos y una duda**", "", state.r2 || "_Pendiente_", "");
    L.push("**Ticket de salida:** " + (state.ticket ? state.ticket + " / 4" : "—"), "");
    L.push("## Historial de respuestas", "", "| Hora | Reto | Respuesta | Resultado |", "|---|---|---|---|");
    state.historial.forEach(function (h) { L.push("| " + hhmm(h.t) + " | " + h.item + " | " + String(h.respuesta).replace(/\|/g, "/") + " | " + (h.correcto ? "Correcto" : "Reintento") + " |"); });
    L.push("");
    return L.join("\n");
  }
  function saveFile(name, data, mime, msgEl) {
    var msg = msgEl || $("dlMsg");
    function show(t) { if (msg.classList && msg.classList.contains("fb")) msg.innerHTML = '<div class="ok"><strong>' + esc(t) + '</strong></div>'; else msg.textContent = t; }
    function local() {
      try {
        var blob = data instanceof Blob ? data : new Blob([data], { type: mime });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1500);
        show("✓ Descargado: " + name);
        toast("Archivo listo. <b>¡Buen trabajo, " + esc(who()) + "!</b>");
      } catch (e) { show("No se pudo descargar el archivo en esta vista."); }
    }
    if (window.claude && typeof window.claude.use === "function") {
      window.claude.use("downloads").then(function (dl) {
        if (!dl) return local();
        dl.save({ filename: name, data: data }).then(function () { show("✓ Guardado: " + name); }, function (e) { show(e && e.code === "declined" ? "Descarga cancelada. Puedes intentarlo cuando quieras." : "No se pudo guardar el archivo en esta vista."); });
      }, local);
    } else local();
  }
  function downloadMD() {
    if (!state.student) { $("dlMsg").textContent = "Primero completa tu ficha del maquinista."; return; }
    saveFile(fileBase() + ".md", buildMD(), "text/markdown;charset=utf-8");
  }
  function downloadPDF() {
    if (!state.student) { $("dlMsg").textContent = "Primero completa tu ficha del maquinista."; return; }
    if (!window.jspdf) { $("dlMsg").textContent = "No se pudo cargar el generador de PDF (revisa tu conexión). Descarga el informe Markdown."; return; }
    var D = reportData(), st = state.student, J = window.jspdf.jsPDF, doc = new J({ unit: "mm", format: "a4", compress: true });
    var W = 210, M = 15, y = 0, AZ = [0, 114, 185], AM = [243, 161, 0], GR = [85, 85, 83];
    doc.setFillColor(AZ[0], AZ[1], AZ[2]); doc.rect(0, 0, W, 30, "F");
    try { var lg = document.querySelector(".nav-logo img").src; doc.setFillColor(255, 255, 255); doc.roundedRect(M - 2, 7, 44, 17, 2, 2, "F"); doc.addImage(lg, "JPEG", M, 8.5, 40, 15); } catch (e) { }
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("Informe de desempeño", M + 50, 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text("S06 · Actividad 4 · Simulador 3D de impresión offset · CD 102", M + 50, 21);
    y = 40; doc.setTextColor(43, 43, 42); doc.setFontSize(11);
    doc.setFont("helvetica", "bold"); doc.text(st.nombres + " " + st.apellidos, M, y);
    doc.setFont("helvetica", "normal"); doc.text(st.email + "  ·  " + new Date().toLocaleString("es-PE"), M, y + 6);
    y += 14;
    var kp = [["Puntaje", state.score + " / " + MAX], ["Logro", D.pct + " %"], ["Estaciones", D.superadas + " / " + STATION_ORDER.length], ["Tiempo", D.minutos != null ? D.minutos + " min" : "—"]];
    var bw = (W - 2 * M - 9) / 4;
    kp.forEach(function (k, i) {
      var x = M + i * (bw + 3);
      doc.setFillColor(238, 245, 251); doc.roundedRect(x, y, bw, 18, 2, 2, "F");
      doc.setFontSize(8); doc.setTextColor(GR[0], GR[1], GR[2]); doc.text(k[0].toUpperCase(), x + 3, y + 6);
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 81, 127); doc.text(String(k[1]), x + 3, y + 14);
      doc.setFont("helvetica", "normal");
    });
    y += 24;
    var fixed = DEF_LIST.filter(function (k) { return state.defects[k] && state.defects[k].fixed; }).length;
    var full = state.closed && D.superadas === STATION_ORDER.length && state.okSheet && state.signed && fixed === 4;
    if (full) { doc.setFillColor(234, 246, 238); doc.setDrawColor(28, 122, 77); } else { doc.setFillColor(255, 244, 224); doc.setDrawColor(AM[0], AM[1], AM[2]); }
    doc.setLineWidth(0.6); doc.roundedRect(M, y, W - 2 * M, 14, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
    if (full) { doc.setTextColor(28, 122, 77); doc.text("CUMPLE CON TODOS LOS PROCEDIMIENTOS · " + D.nivel.toUpperCase() + " · " + RANKS[state.rankIdx].name.toUpperCase(), M + 4, y + 9); }
    else {
      var causa = !state.okSheet ? "falta lograr el pliego OK" : !state.signed ? "falta firmar el pliego OK" : fixed < 4 ? "faltan " + (4 - fixed) + " defectos por diagnosticar" : !state.closed ? "falta registrar el cierre" : "faltan estaciones por superar";
      doc.setTextColor(138, 90, 0); doc.text("EN PROGRESO · " + causa + " · " + D.nivel, M + 4, y + 9);
    }
    y += 20;
    function section(t) {
      if (y > 262) { doc.addPage(); y = 18; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0, 81, 127); doc.text(t, M, y); y += 2;
      doc.setFont("helvetica", "normal"); doc.setTextColor(43, 43, 42);
    }
    function bullets(arr) {
      doc.setFontSize(10);
      arr.forEach(function (b) { var ln = doc.splitTextToSize("• " + b, W - 2 * M); if (y + ln.length * 5 > 285) { doc.addPage(); y = 18; } doc.text(ln, M, y + 5); y += ln.length * 5; });
      y += 5;
    }
    var hasTable = typeof doc.autoTable === "function";
    function table(head, body) {
      if (hasTable) {
        doc.autoTable({ startY: y + 2, head: [head], body: body, margin: { left: M, right: M }, styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: { fillColor: AZ }, alternateRowStyles: { fillColor: [246, 245, 242] } });
        y = doc.lastAutoTable.finalY + 8;
      } else bullets(body.map(function (r) { return r.join(" · "); }));
    }
    section("Fortalezas"); bullets(D.fuertes.length ? D.fuertes : ["Inició el turno: el primer paso ya está dado."]);
    section("Para seguir practicando"); bullets(D.reforzar.length ? D.reforzar : ["Nada pendiente: resolvió todo con pocos intentos."]);
    section("Ficha de cálculo de imposición (área útil " + fichaArea() + ")"); table(["Pieza", "Medida final", "Orient. A", "Orient. B", "Conviene", "Aprov.", "Estado"], fichaRows());
    section("Taller de prensa"); table(["Dato", "Valor"], tallerRows());
    if (RT.sep && RT.okP) {
      try {
        var img = PS.composite(RT.sep, RT.okP, { w: 900 }).toDataURL("image/jpeg", 0.85), ih = (W - 2 * M) * RT.sep.h / RT.sep.w;
        if (y + ih + 10 > 285) { doc.addPage(); y = 18; }
        doc.setFontSize(9); doc.setTextColor(GR[0], GR[1], GR[2]); doc.text("Pliego OK simulado (" + (state.signed ? "firmado por " + state.signName : "sin firmar") + ")", M, y + 3);
        doc.addImage(img, "JPEG", M, y + 5, W - 2 * M, ih); y += ih + 12;
      } catch (e) { }
    }
    section("Estaciones"); table(["Estación", "Estado", "Puntos"], D.est.map(function (e) { return [e.nombre, e.estado, e.got + " / " + e.pos]; }));
    section("Detalle por reto"); table(["Reto", "Estación", "Intentos", "1.er intento", "Puntos"], D.items.map(function (i) { return [i.item, i.est, String(i.intentos), i.primer ? "Sí" : (i.intentos ? "No" : "—"), i.pts + " / " + i.max]; }));
    section("Reflexiones");
    doc.setFontSize(10);
    [["¿En qué encargo real lo aplicaría?", state.r1], ["Dos hallazgos y una duda", state.r2]].forEach(function (r) {
      if (y > 258) { doc.addPage(); y = 18; }
      doc.setFont("helvetica", "bold"); doc.text(r[0], M, y + 5); y += 5; doc.setFont("helvetica", "normal");
      var ln = doc.splitTextToSize(r[1] || "Pendiente", W - 2 * M); if (y + ln.length * 5 > 285) { doc.addPage(); y = 18; } doc.text(ln, M, y + 5); y += ln.length * 5 + 4;
    });
    doc.text("Ticket de salida: " + (state.ticket ? state.ticket + " / 4" : "—"), M, y + 4);
    var pages = doc.getNumberOfPages();
    for (var pg = 1; pg <= pages; pg++) {
      doc.setPage(pg); doc.setFontSize(8); doc.setTextColor(134, 134, 134);
      doc.text("Mg. Mario Quiroz Martínez · Docente · UD Producción y publicación de piezas gráficas · Semana 6 · Actividad 4", M, 290);
      doc.text("Página " + pg + " de " + pages, W - M, 290, { align: "right" });
    }
    saveFile(fileBase() + ".pdf", doc.output("blob"), "application/pdf");
  }
  function renderKpis() {
    var k = $("kpis"); if (!k) return;
    var D = reportData();
    k.innerHTML = "<div><dt>Puntaje</dt><dd>" + state.score + " / " + MAX + "</dd></div><div><dt>Logro</dt><dd>" + D.pct + " %</dd></div>" +
      "<div><dt>Estaciones</dt><dd>" + D.superadas + " / " + STATION_ORDER.length + "</dd></div><div><dt>Nivel</dt><dd style='font-size:15px'>" + D.nivel + "</dd></div>";
  }
  function initReport() {
    $("pdfBtn").addEventListener("click", function () { window.downloadPDF(); });
    $("mdBtn").addEventListener("click", function () { window.downloadMD(); });
    $("pdfBtn2").addEventListener("click", function () { window.downloadPDF(); });
    $("mdBtn2").addEventListener("click", function () { window.downloadMD(); });
    var armed = false;
    $("clearSave").addEventListener("click", function () {
      if (!armed) { armed = true; this.textContent = "¿Seguro? Toca otra vez para borrar"; var self = this; setTimeout(function () { armed = false; self.textContent = "Borrar guardado"; }, 4000); return; }
      try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_ART); } catch (e) { }
      location.reload();
    });
    var sv = readSave(); if (sv) $("saveState").textContent = "Hay un avance guardado en este navegador (" + hhmm(sv.savedAt) + ").";
  }

  /* ================= MUESTRA Y PLIEGO DE ANOCHE ================= */
  function buildSample() {
    return new Promise(function (ok) {
      var logo = document.querySelector(".nav-logo img");
      function go() {
        try {
          RT.sample = PS.sampleArt(logo);
          var L = PS.layout({ plate: "cd102", sheet: "700x1000", w: 297, h: 420, bleed: 3, marks: true, orient: "B" });
          RT.ghostSep = PS.separate(PS.buildSheet(RT.sample, L), L);
          RT.ghost = PS.ghost(RT.ghostSep);
          PS.composite(RT.ghostSep, RT.ghost.P, { w: 900, exag: 3, canvas: $("s1Ghost") });
        } catch (e) { if (window.console) console.error(e); }
        if (!RT.art) RT.art = RT.sample;
        ok();
      }
      var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      var logoReady = new Promise(function (r) { if (!logo || logo.complete) r(); else { logo.addEventListener("load", r); logo.addEventListener("error", r); } });
      var timeout = new Promise(function (r) { setTimeout(r, 2500); });
      Promise.race([Promise.all([fontsReady, logoReady]), timeout]).then(function () { setTimeout(go, 30); });
    });
  }

  /* ================= INIT ================= */
  function init() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    [].forEach.call(document.querySelectorAll("section.st.locked .st-body"), function (b) { b.setAttribute("inert", ""); b.setAttribute("aria-hidden", "true"); });
    RT.ready = buildSample();
    initStart(); initViewer(); initSlots(); initLanding(); initS1(); initRiddles(); initSV(); initS2();
    initFicha(); initP1(); initP2(); initP3(); initP4(); initP5(); initS4(); initS5(); initModals(); initReport(); initConsole();
    renderJobForm(); renderParts(); renderRiddles(); renderInks(); renderPcVals(); renderAnas(); renderDefects(); renderClose(); renderFlipProg(); renderFicha(); renderDims();
    offerResume(); updateHud(); checkRank(); renderFlow();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.state = state; window.buildMD = buildMD; window.downloadMD = downloadMD; window.downloadPDF = downloadPDF;
  return { state: state, MAX: MAX, ITEMS: ITEMS };
})();
