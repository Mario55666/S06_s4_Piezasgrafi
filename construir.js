/* Arma la Actividad 4 de la Semana 6: simulador 3D de impresión offset (Speedmaster CD 102) en un solo HTML.
   Uso (desde esta carpeta):  node construir.js
   Escribe:  simulador-offset-cd102.html                                   → copia local (doble clic)
             ../servidor-nas/tareas/tarea-06/Actividad_4/index.html         → actividad en el NAS, con envío al docente
   Lee:      src/index.src.html (marcadores __IDC_LOGO__ y <!--__SCRIPTS__-->), src/*.js
             ../Actividad 3/img/logo-b64.js (logo IDC en base64)
   El envío usa data-sub="actividad-4" para no compartir identificador con la Actividad 1 de la misma tarea
   (requiere la versión de envio-resultados.js que lee data-sub). */
var fs = require("fs");
var path = require("path");
var dir = __dirname;

function leer(p) { return fs.readFileSync(path.join(dir, p), "utf8"); }

var html = leer("src/index.src.html");
var logo = fs.readFileSync(path.join(dir, "..", "Actividad 3", "img", "logo-b64.js"), "utf8").match(/src:"([^"]+)"/);
if (!logo) throw new Error("No se encontró el logo en Actividad 3/img/logo-b64.js");

var scripts = ["src/print.js", "src/sound.js", "src/press3d.js", "src/rollers.js", "src/app.js"].map(function (f) {
  var js = leer(f);
  if (js.indexOf("</script") >= 0) throw new Error(f + " contiene </script>: rompería el HTML.");
  return "<script>\n" + js + "\n</script>";
}).join("\n");

var out = html.split("__IDC_LOGO__").join(logo[1]).split("<!--__SCRIPTS__-->").join(scripts);
fs.writeFileSync(path.join(dir, "simulador-offset-cd102.html"), out);
console.log("Listo: simulador-offset-cd102.html (" + Math.round(out.length / 1024) + " KB)");

var destino = path.join(dir, "..", "servidor-nas", "tareas", "tarea-06", "Actividad_4");
fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(path.join(destino, "index.html"), out.replace("</body>", '<script src="/envio-resultados.js" data-sub="actividad-4"></script>\n</body>'));
console.log("Listo: servidor-nas/tareas/tarea-06/Actividad_4/index.html");
console.log("Copia la carpeta tarea-06 completa (y envio-resultados.js actualizado) al NAS: \\\\192.168.0.101\\docker\\idc-servidor\\tareas\\");
