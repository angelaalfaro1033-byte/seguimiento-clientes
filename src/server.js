require('dotenv').config();

const path = require('path');
const express = require('express');
const {
  REDIRECT_URI,
  SENDER_EMAIL,
  getOAuthSetupStatus,
  crearUrlAutorizacion,
  completarAutorizacion,
  validarOAuthToken,
  enviarCorreo
} = require('./gmail');
const { analyzeMeeting, analyzePatterns } = require('./analyzer');
const { generarCampana, WHATSAPP_URL } = require('./campaign');
const {
  guardarAnalisis,
  obtenerAnalisis,
  eliminarAnalisis,
  eliminarAnalisisMultiples
} = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;

function esPeticionLocal(req) {
  const host = (req.hostname || '').toLowerCase();
  const ip = req.socket.remoteAddress || '';
  return host === 'localhost' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
}

app.use(express.json({ limit: '17mb' }));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/auth/google', (req, res) => {
  if (!esPeticionLocal(req)) return res.status(403).send('La autorización inicial solo está disponible desde este equipo.');
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return res.status(503).send('Configura GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET en .env antes de autorizar Gmail.');
  }
  try {
    res.redirect(crearUrlAutorizacion());
  } catch (error) {
    console.error('OAuth Gmail: no se pudo iniciar el flujo; tipo:', error.name || 'error');
    res.status(500).send('No se pudo iniciar la autorización de Gmail. Revisa la configuración OAuth local.');
  }
});

app.get('/oauth2callback', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!esPeticionLocal(req)) return res.status(403).send('El callback OAuth solo está disponible desde este equipo.');
  if (`${req.protocol}://${req.get('host')}/oauth2callback` !== REDIRECT_URI) {
    return res.status(400).send('La URI recibida no coincide con la URI de retorno OAuth configurada.');
  }
  const result = await completarAutorizacion({
    code: req.query.code,
    state: req.query.state,
    error: req.query.error
  });
  if (!result.ok) return res.status(result.status).send(result.message);
  res.status(200).send('Cuenta de Gmail autorizada correctamente. El refresh token se guardó en el .env local. Puedes cerrar esta ventana.');
});

app.get('/api/mail/config', async (req, res) => {
  const setup = getOAuthSetupStatus();
  if (!setup.ready) {
    const needsClient = setup.missing.includes('GOOGLE_OAUTH_CLIENT_ID') || setup.missing.includes('GOOGLE_OAUTH_CLIENT_SECRET');
    return res.json({
      configured: false,
      senders: [],
      message: needsClient
        ? 'Faltan las credenciales OAuth de Google en .env.'
        : setup.missing.includes('GMAIL_SENDER_EMAIL=contacto@drakiontech.com')
          ? 'Configura GMAIL_SENDER_EMAIL=contacto@drakiontech.com en .env.'
          : 'Autoriza contacto@drakiontech.com desde http://localhost:3000/auth/google para habilitar el envío.'
    });
  }
  try {
    await validarOAuthToken();
  } catch (error) {
    const status = error.response?.status || error.code || error.name || 'error';
    console.error('OAuth Gmail: no se pudo renovar el acceso; código:', status);
    const connectionError = ['EACCES', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'].includes(error.code);
    return res.json({
      configured: false,
      senders: [],
      message: connectionError
        ? 'No se pudo conectar con Google para validar Gmail. Revisa la conexión a Internet e inténtalo de nuevo.'
        : 'No se pudo validar la autorización de Gmail. Vuelve a autorizar la cuenta desde http://localhost:3000/auth/google.'
    });
  }
  res.json({ configured: true, senders: [SENDER_EMAIL], message: 'Cuenta Gmail autorizada para el envío.' });
});

app.post('/api/campaign/generate', async (req, res) => {
  const { analisisId, asunto } = req.body || {};
  const id = Number(analisisId);
  if (!Number.isInteger(id) || id <= 0 || typeof asunto !== 'string' || !asunto.trim()) {
    return res.status(400).json({ error: 'Selecciona un análisis y un asunto.' });
  }
  try {
    const analisis = obtenerAnalisis().find((item) => item.id === id);
    if (!analisis) return res.status(404).json({ error: 'No se encontró el análisis seleccionado.' });
    const campana = await generarCampana(analisis, asunto.trim());
    res.json({ ok: true, campana });
  } catch (error) {
    console.error('Error al generar campaña:', error);
    res.status(500).json({ error: error.message || 'No se pudo generar la campaña.' });
  }
});

app.post('/api/mail/send', async (req, res) => {
  const { to, from, subject, html, text } = req.body || {};
  const setup = getOAuthSetupStatus();
  if (!setup.ready) return res.status(503).json({ error: 'El envío no está configurado. Completa las variables OAuth de Gmail y autoriza la cuenta.' });
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof to !== 'string' || !emailPattern.test(to.trim())) return res.status(400).json({ error: 'Ingresa un correo destinatario válido.' });
  if (typeof from !== 'string' || from.trim().toLowerCase() !== SENDER_EMAIL.trim().toLowerCase()) {
    return res.status(400).json({ error: 'El remitente debe ser contacto@drakiontech.com.' });
  }
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 250 || /[\r\n]/.test(subject)) return res.status(400).json({ error: 'Ingresa un asunto válido (máximo 250 caracteres).' });
  if (typeof html !== 'string' || !html.trim() || html.length > 500000) return res.status(400).json({ error: 'El HTML está vacío o supera el máximo permitido.' });
  if (/<\s*(script|form|iframe)\b/i.test(html)) return res.status(400).json({ error: 'El HTML no puede incluir scripts, formularios ni iframes.' });
  if (!html.includes(WHATSAPP_URL)) return res.status(400).json({ error: 'El HTML debe conservar el enlace oficial de WhatsApp en el CTA.' });
  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  for (const imageTag of imageTags) {
    const src = imageTag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src || !/^https:\/\//i.test(src) || !/\balt=["'][^"']*["']/i.test(imageTag)) {
      return res.status(400).json({ error: 'Cada imagen debe usar una URL HTTPS accesible y tener texto alternativo.' });
    }
  }
  try {
    const result = await enviarCorreo({
      to: to.trim(),
      subject: subject.trim(),
      html,
      text: typeof text === 'string' ? text.slice(0, 100000) : ''
    });
    if (!result || typeof result.id !== 'string' || !result.id.trim()) {
      console.error('Gmail API: respuesta sin identificador de mensaje aceptado.');
      return res.status(502).json({ error: 'Gmail no confirmó la recepción del mensaje. No se puede confirmar el envío.' });
    }
    res.json({ ok: true, messageId: result.id, accepted: [to.trim()], rejected: [], response: 'Gmail API aceptó el mensaje.' });
  } catch (error) {
    if (error.message === 'GMAIL_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'El envío no está configurado. Autoriza la cuenta Gmail para habilitarlo.' });
    }
    const status = error.response?.status || error.code || error.name || 'error';
    console.error('Gmail API: no se pudo enviar el mensaje; código:', status);
    const errorMessage = error.response?.status === 401 || error.response?.data?.error === 'invalid_grant'
      ? 'La autorización de Gmail expiró o fue revocada. Vuelve a autorizar la cuenta.'
      : error.response?.status === 403
        ? 'Gmail rechazó el envío. Verifica que la cuenta autorizada sea contacto@drakiontech.com y que Gmail API esté habilitada en Google Cloud.'
        : error.response?.status === 429
          ? 'Gmail recibió demasiadas solicitudes. Espera un momento y vuelve a intentarlo.'
          : ['EACCES', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'].includes(error.code)
            ? 'No se pudo conectar con Google. Revisa la conexión y vuelve a intentarlo.'
        : 'Gmail API no pudo enviar el mensaje. Inténtalo de nuevo y revisa el estado del servicio en Google Cloud.';
    res.status(502).json({ error: errorMessage });
  }
});

app.post('/api/analyze', async (req, res) => {
  const { nombreArchivo, contenido, codificacion } = req.body || {};
  const extension = typeof nombreArchivo === 'string'
    ? path.extname(nombreArchivo).toLowerCase()
    : '';

  if (!['.txt', '.pdf', '.docx'].includes(extension)) {
    return res.status(400).json({
      error: 'Solo se aceptan archivos .txt, .pdf y .docx.'
    });
  }

  if (typeof contenido !== 'string' || contenido.trim() === '') {
    return res.status(400).json({
      error: 'El archivo está vacío.'
    });
  }

  if (Buffer.byteLength(contenido, 'utf8') > 12 * 1024 * 1024 && extension === '.txt') {
    return res.status(413).json({ error: 'El archivo supera el límite de 12 MB.' });
  }

  let textoReunion = contenido;
  if (extension !== '.txt') {
    if (codificacion !== 'base64' || !/^[A-Za-z0-9+/]*={0,2}$/.test(contenido)) {
      return res.status(400).json({ error: 'No se pudo leer el archivo enviado.' });
    }
    const archivoBuffer = Buffer.from(contenido, 'base64');
    if (archivoBuffer.length > 12 * 1024 * 1024) {
      return res.status(413).json({ error: 'El archivo supera el límite de 12 MB.' });
    }
    try {
      if (extension === '.pdf') {
        const pdf = require('pdf-parse');
        textoReunion = (await pdf(archivoBuffer)).text;
      } else {
        const mammoth = require('mammoth');
        textoReunion = (await mammoth.extractRawText({ buffer: archivoBuffer })).value;
      }
    } catch (error) {
      console.error('Error al extraer texto del documento:', error);
      return res.status(400).json({
        error: extension === '.pdf'
          ? 'No se pudo extraer texto del PDF. Si es un documento escaneado, conviértelo a PDF con texto seleccionable.'
          : 'No se pudo leer el documento Word. Guarda el archivo como .docx e inténtalo de nuevo.'
      });
    }
  }

  if (typeof textoReunion !== 'string' || textoReunion.trim() === '') {
    return res.status(400).json({
      error: 'El documento no contiene texto extraíble para analizar.'
    });
  }

  try {
    const resultado = await analyzeMeeting(textoReunion);

    const guardado = guardarAnalisis(nombreArchivo, resultado);

    res.json({
      ok: true,
      mensaje: 'Análisis completado y guardado correctamente.',
      archivo: nombreArchivo,
      caracteres: textoReunion.length,
      analisisId: guardado.id,
      fecha: guardado.fecha,
      resultado
    });
  } catch (error) {
    console.error('Error al analizar la reunión:', error);

    res.status(500).json({
      error: error.message || 'Ocurrió un error al analizar la reunión.'
    });
  }
});

app.get('/api/analisis', (req, res) => {
  try {
    const analisis = obtenerAnalisis();

    res.json({
      ok: true,
      analisis
    });
  } catch (error) {
    console.error('Error al obtener los análisis:', error);

    res.status(500).json({
      error: 'No se pudieron obtener los análisis.'
    });
  }
});
app.post('/api/patrones', async (req, res) => {
  const { analisisIds } = req.body || {};

  if (!Array.isArray(analisisIds) || analisisIds.length < 2) {
    return res.status(400).json({
      error: 'Selecciona al menos 2 análisis para detectar patrones.'
    });
  }

  try {
    const todosLosAnalisis = obtenerAnalisis();

    const ids = analisisIds.map(Number);

    const analisisSeleccionados = todosLosAnalisis.filter(
      (analisis) => ids.includes(analisis.id)
    );

    if (analisisSeleccionados.length < 2) {
      return res.status(400).json({
        error: 'No se encontraron suficientes análisis seleccionados.'
      });
    }

    const patrones = await analyzePatterns(
      analisisSeleccionados
    );

    res.json({
      ok: true,
      cantidadAnalisis: analisisSeleccionados.length,
      patrones
    });

  } catch (error) {
    console.error('Error al detectar patrones:', error);

    res.status(500).json({
      error: error.message || 'No se pudieron detectar los patrones.'
    });
  }
});

app.delete('/api/analisis/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: 'El ID del análisis no es válido.'
    });
  }

  try {
    const eliminado = eliminarAnalisis(id);

    if (!eliminado) {
      return res.status(404).json({
        error: 'No se encontró el análisis solicitado.'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Análisis eliminado correctamente.',
      analisisId: id
    });

  } catch (error) {
    console.error('Error al eliminar el análisis:', error);

    res.status(500).json({
      error: 'No se pudo eliminar el análisis.'
    });
  }
});

app.delete('/api/analisis', (req, res) => {
  const { analisisIds } = req.body || {};

  if (!Array.isArray(analisisIds) || analisisIds.length === 0) {
    return res.status(400).json({
      error: 'Debes indicar al menos un análisis para eliminar.'
    });
  }

  const ids = analisisIds.map(Number);

  const idsValidos = ids.every(
    (id) => Number.isInteger(id) && id > 0
  );

  if (!idsValidos) {
    return res.status(400).json({
      error: 'Uno o más IDs de análisis no son válidos.'
    });
  }

  try {
    const eliminados = eliminarAnalisisMultiples(ids);

    res.json({
      ok: true,
      mensaje: 'Análisis eliminados correctamente.',
      eliminados
    });

  } catch (error) {
    console.error('Error al eliminar los análisis:', error);

    res.status(500).json({
      error: 'No se pudieron eliminar los análisis.'
    });
  }
});
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'El archivo es demasiado grande (máximo 12 MB).'
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'La solicitud no tiene un JSON válido.'
    });
  }

  console.error(err);

  res.status(500).json({
    error: 'Error interno del servidor.'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
