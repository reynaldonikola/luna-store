// Compone la plantilla sobre la escena y deja el PNG en assets/publicaciones.
// Los datos llegan por variables de entorno, nunca por la línea de comandos,
// para que nada de lo que manda n8n pueda acabar interpretado por el shell.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const SKU = process.env.SKU || '';
const NOMBRE = process.env.NOMBRE || '';
const PRECIO = process.env.PRECIO || '';
const DETALLE = process.env.DETALLE || '';
const ESCENA = process.env.ESCENA || '';

// Se repiten aquí las validaciones del workflow: este script también se puede
// ejecutar a mano y no debe fiarse de que alguien ya haya comprobado nada.
if (!/^[A-Za-z0-9._-]{1,64}$/.test(SKU)) {
  throw new Error('SKU no permitido');
}
if (!/^[A-Za-z0-9._-]{1,80}\.(png|jpg|jpeg|webp)$/i.test(ESCENA)) {
  throw new Error('Nombre de escena no permitido');
}

const raiz = path.resolve(__dirname, '..');
const rutaEscena = path.join(raiz, 'assets', 'escenas', ESCENA);
const salidaDir = path.join(raiz, 'assets', 'publicaciones');
const salida = path.join(salidaDir, `${SKU}.png`);

if (!fs.existsSync(rutaEscena)) {
  throw new Error(`No existe la escena: ${rutaEscena}`);
}
fs.mkdirSync(salidaDir, { recursive: true });

(async () => {
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1,
  });

  const params = new URLSearchParams({
    nombre: NOMBRE,
    detalle: DETALLE,
    precio: PRECIO,
    escena: 'file://' + rutaEscena,
  });

  const url = 'file://' + path.join(raiz, 'plantilla', 'post.html') + '?' + params.toString();
  await pagina.goto(url, { waitUntil: 'networkidle' });

  // Las tipografías vienen de Google Fonts: si no han cargado, el texto sale
  // con la fuente del sistema y la imagen queda mal.
  await pagina.waitForFunction(() => document.fonts.status === 'loaded', { timeout: 20000 });
  await pagina.waitForFunction(() => window.listo === true, { timeout: 20000 });

  await pagina.locator('#lienzo').screenshot({ path: salida, type: 'png' });
  await navegador.close();

  const kb = Math.round(fs.statSync(salida).size / 1024);
  console.log(`Compuesta ${SKU}.png (${kb} KB) — ${NOMBRE} · $${PRECIO}`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
