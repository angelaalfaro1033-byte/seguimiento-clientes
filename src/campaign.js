const { getOpenAIClient } = require('./openai');
const fs = require('node:fs/promises');
const path = require('node:path');

const WHATSAPP_URL = 'https://api.whatsapp.com/send/?phone=573118852679&text=Hola%2C+me+gustar%C3%ADa+obtener+m%C3%A1s+informaci%C3%B3n+sobre+sus+servicios&type=phone_number&app_absent=0';
const IMAGE_SLOT = '';
const NOMBRES_EQUIPO_INTERNO = ['Wilmar Alfaro', 'Lorena Yara', 'Jaime Mejía', 'Diego Molina', 'John Alfaro'];

function escaparHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function resaltarTexto(value = '') {
  const texto = escaparHTML(value);
  const frases = [
    String.raw`\b\d+\s+de\s+cada\s+\d+\b`,
    String.raw`\b\d+(?:[.,]\d+)?\s?%`,
    String.raw`\b(?:revisi[oó]n|comprobaci[oó]n) manual\b`,
    String.raw`\bdocumentos? (?:hist[oó]ricos?|de homologaci[oó]n|de postulación)\b`,
    String.raw`\bprocesamiento de datos\b`,
    String.raw`\b(?:automatizaci[oó]n|automatizarse|tareas manuales|capacidad operativa|tiempo del equipo)\b`
  ];
  const patron = new RegExp(`(${frases.join('|')})`, 'gi');
  return texto.replace(patron, '<strong style="color:#FF004F;font-weight:700">$1</strong>');
}

function urlImagenSegura(value = '') {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function plantillaHTML(campana, options = {}) {
  const imageUrl = urlImagenSegura(options.imageUrl || '');
  const alt = escaparHTML(options.imageAlt || campana.alt_imagen || 'Imagen relacionada con la oportunidad comercial');
  const imageBlock = imageUrl
    ? `<tr><td style="padding:0 32px 24px"><img src="${escaparHTML(imageUrl)}" width="576" alt="${alt}" style="display:block;width:100%;max-width:576px;height:auto;border:0;border-radius:8px"></td></tr>`
    : '';
  const paragraphs = (campana.body_paragraphs || []).map((paragraph) =>
    `<p style="margin:0 auto 16px;max-width:540px;color:#34415D;font-size:16px;line-height:1.65;text-align:center">${resaltarTexto(paragraph)}</p>`
  ).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escaparHTML(campana.subject || campana.asunto || '')}</title></head><body style="margin:0;padding:20px 8px;background:#E4E5F2;font-family:Arial,Helvetica,sans-serif;color:#071947"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#E4E5F2" style="width:100%;background:#E4E5F2"><tr><td align="center" style="padding:12px 8px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="width:100%;max-width:640px;background:#FFFFFF"><tr><td style="height:5px;background:#2A3EF4;font-size:0;line-height:0">&nbsp;</td></tr><tr><td align="center" style="padding:42px 32px 28px;text-align:center"><h1 style="margin:0;color:#071947;font-family:Arial,Helvetica,sans-serif;font-size:42px;line-height:1.12;font-weight:700;letter-spacing:-.7px;text-align:center">${resaltarTexto(campana.headline || '')}</h1></td></tr>${imageBlock}<tr><td align="center" style="padding:0 32px 12px;text-align:center">${paragraphs}<h2 style="margin:28px 0 12px;color:#2A3EF4;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:700;text-align:center">${resaltarTexto(campana.solution_title || '')}</h2><p style="margin:0 auto 20px;max-width:540px;color:#34415D;font-size:16px;line-height:1.65;text-align:center">${resaltarTexto(campana.solution_description || '')}</p><p style="margin:0 auto 26px;max-width:540px;color:#071947;font-size:16px;line-height:1.6;font-weight:600;text-align:center">${resaltarTexto(campana.next_step || '')}</p><a href="${WHATSAPP_URL}" target="_blank" rel="noopener" style="display:inline-block;padding:15px 22px;background:#071947;border-left:5px solid #FF004F;color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.25;font-weight:700;text-align:center">${escaparHTML(campana.cta_text || '')} &nbsp;→</a></td></tr><tr><td style="height:30px;font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr></table></body></html>`;
}

const instruccionesCampanaFinal = [
  'Eres copywriter B2B de reactivación comercial. Transforma el análisis interno de una reunión previa en un correo comercial listo para enviar, nunca en un informe, minuta, lista de requisitos o resumen.',
  'ESTADÍSTICA DE APERTURA: elige el registro más relacionado con la necesidad real. Para validación documental, homologaciones, postulaciones o procesamiento de datos, prioriza el dato 1.4 cuando esté disponible. El JSON es fuente autorizada; no inventes ni combines cifras. Devuelve statistic_used con el id exacto, o null. No muestres id, título, fuente, organización, publicación ni año. Usa como máximo una cifra estadística en todo el correo. Para el dato 1.4, expresa solo "Casi 7 de cada 10 actividades de procesamiento de datos tienen potencial técnico de automatización"; omite el dato de recolección (64 de cada 100) aunque aparezca en la fuente. Convierte el dato en una frase inicial breve y natural; conecta inmediatamente con la necesidad real. No repitas la cifra en el cuerpo ni en otra sección. Sin estadística pertinente, crea un titular sin cifras inventadas.',
  'REDACTA EL MENSAJE: habla directamente al destinatario de una necesidad empresarial y una oportunidad; el análisis solo sirve como contexto, no lo reproduzcas como expediente comercial. Escribe un correo natural, claro y breve: procura que el texto antes del botón no supere unas 80 palabras. Usa uno o dos párrafos de máximo 22 palabras cada uno. Explica qué gana el cliente con palabras concretas: menos trabajo manual, identificación de tareas repetitivas o datos más confiables para decidir, solo cuando la conversación respalde esa conexión. Evita frases técnicas y distantes como "consolidación para analítica" si puedes expresar el beneficio para su operación. Cuando las notas mencionen una salida en vivo o transición (por ejemplo, S/4HANA), relaciónala con oportunidades de mejora sin afirmar que la operación sigue inestable. No describas la reunión. No incluyas nombres de empleados, asistentes o terceros ni quién debe enviar, elegir, aprobar o confirmar algo; solo puedes nombrar al destinatario explícito si es natural y necesario. No incluyas fechas internas, instrucciones al equipo, fórmulas, variables, datos faltantes ni pendientes, ni los conviertas en preguntas mecánicas. No afirmes resultados, volúmenes o problemas actuales que no estén respaldados. No inventes cifras, pérdidas, ahorros, plazos, testimonios, garantías ni capacidades concretas (OCR, integración, tableros o interfaces) que las notas no confirmen.',
  'ESTRUCTURA: headline inicial claro; body_paragraphs conecta la estadística con un detalle real del negocio y explica en lenguaje sencillo cómo identificar tareas repetitivas puede reducir trabajo manual o ayudar a preparar datos confiables para decisiones, sin repetir la cifra. solution_title (2 a 6 palabras) nombra la oportunidad de mejora; solution_description (máximo 15 palabras) explica qué permitiría identificar o priorizar, en términos de beneficio para el cliente. No describas tareas de Drakion Tech ni prometas resultados. next_step (máximo 12 palabras) invita a identificar oportunidades concretas y conversar sobre por dónde empezar, sin compromiso de proyecto ni lenguaje de tareas internas como "definir alcance" o "levantamiento". Si hay un piloto pendiente, puede mencionarse como posibilidad futura, pero el CTA inicial debe seguir siendo exploratorio. Termina con cta_text (2 a 5 palabras), por ejemplo "Conversemos sobre oportunidades". No uses saludo innecesario, presentación corporativa, etiquetas internas ni la frase en Drakion Tech. El CTA debe llevar al whatsapp_url proporcionado.',
  'Devuelve únicamente JSON válido, sin Markdown, con estas claves: subject (asunto exacto recibido), headline (titular si no se eligió estadística), body_paragraphs (arreglo de uno o dos párrafos finales al cliente), solution_title, solution_description, next_step, cta_text, cta_url (whatsapp_url recibido), statistic_used (ID exacto o null), alt_imagen (descripción objetiva breve), concepto_visual (dirección visual breve). Ningún dato interno puede aparecer en los campos de texto del correo.'
].join('\n\n');

function limpiarTextoComercial(value) {
  return String(value || '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/\x60([^\x60]+)\x60/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function contarPalabras(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function extraerNombresExcluidos(informacion = []) {
  const palabrasGenericas = new Set(['Nombres', 'Persona', 'Personas', 'Equipo', 'Cliente', 'Proveedor', 'Pendiente', 'Reunion', 'Correo', 'Fecha', 'Siguiente', 'Documento', 'Documentos', 'Definir', 'Enviar', 'Confirmar', 'Priorizar', 'Seleccionar', 'Propuesta', 'Piloto', 'Validacion', 'Revision']);
  return informacion.flatMap((detalle) => {
    const nombres = [];
    const texto = String(detalle || '');
    const patron = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/g;
    for (const coincidencia of texto.matchAll(patron)) {
      if (!palabrasGenericas.has(coincidencia[1]) && !palabrasGenericas.has(coincidencia[2])) {
        nombres.push(`${coincidencia[1]} ${coincidencia[2]}`);
      }
    }
    return nombres;
  });
}

async function generarCampana(analisis, asunto) {
  const openai = getOpenAIClient();
  let estadisticasDisponibles = [];
  let pudoLeerEstadisticas = false;
  try {
    const contenido = await fs.readFile(path.join(__dirname, '..', 'data', 'estadisticas.json'), 'utf8');
    const banco = JSON.parse(contenido);
    if (Array.isArray(banco.estadisticas)) {
      estadisticasDisponibles = banco.estadisticas
        .filter((item) => item && typeof item.id === 'string' && typeof item.dato === 'string' && Array.isArray(item.servicio) && Array.isArray(item.temas))
        .map((item) => ({ ...item }));
      pudoLeerEstadisticas = true;
    }
  } catch {
    // Se genera sin estadística y la interfaz informa el motivo fuera del correo.
  }

  const contexto = {
    cliente: analisis.cliente || '',
    contacto: analisis.contacto || '',
    cargo_contacto: analisis.cargo_contacto || '',
    necesidad_principal: analisis.necesidad_principal || '',
    dolor_especifico: analisis.dolor_especifico || '',
    consecuencia_empresarial: analisis.consecuencia_empresarial || '',
    solucion_pertinente: analisis.solucion_pertinente || '',
    iniciativa_priorizada: analisis.iniciativa_priorizada || '',
    estado_comercial: analisis.estado_comercial || '',
    proximo_paso_acordado: analisis.proximo_paso_acordado || '',
    pendientes_internos: Array.isArray(analisis.pendientes_internos) ? analisis.pendientes_internos : [],
    datos_faltantes: Array.isArray(analisis.datos_faltantes) ? analisis.datos_faltantes : [],
    informacion_excluir_correo: Array.isArray(analisis.informacion_excluir_correo) ? analisis.informacion_excluir_correo : [],
    enfoque_correo: analisis.enfoque_correo || '',
    datos_cuantitativos: (analisis.datos_cuantitativos || [])
      .filter((dato) => dato && dato.atribucion === 'cliente externo')
      .map(({ dato, evidencia, contexto: proceso }) => ({ dato, evidencia, contexto: proceso })),
    problemas: (analisis.problemas || []).map(({ tema, descripcion, evidencia }) => ({ tema, descripcion, evidencia })),
    necesidades: (analisis.necesidades || []).map(({ tema, descripcion, evidencia }) => ({ tema, descripcion, evidencia })),
    miedos: (analisis.miedos || []).map(({ tema, descripcion, evidencia }) => ({ tema, descripcion, evidencia })),
    objeciones: (analisis.objeciones || []).map(({ tema, descripcion, evidencia }) => ({ tema, descripcion, evidencia })),
    valoraciones: (analisis.valoraciones || []).map(({ tema, descripcion, evidencia }) => ({ tema, descripcion, evidencia })),
    expectativas: (analisis.expectativas || []).map(({ tema, descripcion, evidencia }) => ({ tema, descripcion, evidencia })),
    estadisticas_disponibles: estadisticasDisponibles,
    whatsapp_url: WHATSAPP_URL
  };

  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    text: { verbosity: 'low' },
    instructions: instruccionesCampanaFinal,
    input: JSON.stringify({ asunto, contexto })
  });

  let copy;
  try {
    copy = JSON.parse(String(response.output_text || '').trim());
  } catch {
    throw new Error('La IA no devolvió el contenido comercial en formato válido. Inténtalo de nuevo.');
  }
  if (!copy || typeof copy !== 'object' || Array.isArray(copy)) {
    throw new Error('La IA no devolvió un objeto comercial válido. Inténtalo de nuevo.');
  }

  const statisticId = typeof copy.statistic_used === 'string'
    ? copy.statistic_used
    : copy.statistic_used && typeof copy.statistic_used.id === 'string'
      ? copy.statistic_used.id
      : null;
  const selectedStatistic = statisticId
    ? estadisticasDisponibles.find((item) => item.id === statisticId)
    : null;
  const bodyParagraphs = Array.isArray(copy.body_paragraphs)
    ? copy.body_paragraphs.map(limpiarTextoComercial).filter(Boolean).slice(0, 2)
    : [];
  let headline = limpiarTextoComercial(copy.headline);
  if (selectedStatistic && selectedStatistic.id === '1.4') {
    headline = 'Casi 7 de cada 10 tareas de procesamiento podrían automatizarse.';
  }
  const result = {
    subject: asunto,
    asunto,
    headline,
    titular: headline,
    body_paragraphs: bodyParagraphs,
    solution_title: limpiarTextoComercial(copy.solution_title),
    solution_description: limpiarTextoComercial(copy.solution_description),
    next_step: limpiarTextoComercial(copy.next_step),
    cta_text: limpiarTextoComercial(copy.cta_text),
    cta_url: WHATSAPP_URL,
    statistic_used: selectedStatistic ? { id: selectedStatistic.id, dato: selectedStatistic.dato } : null,
    alt_imagen: limpiarTextoComercial(copy.alt_imagen),
    concepto_visual: limpiarTextoComercial(copy.concepto_visual),
    nota_estadistica: selectedStatistic
      ? ''
      : pudoLeerEstadisticas
        ? 'No se encontró una estadística pertinente; el correo se generó sin estadística.'
        : 'No se pudo leer estadisticas.json; el correo se generó sin estadística.'
  };
  const estadoYProximoPaso = [analisis.estado_comercial, analisis.proximo_paso_acordado, analisis.iniciativa_priorizada].filter(Boolean).join(' ');
  if (/piloto/i.test(estadoYProximoPaso) && /defin|seleccion|prioriz/i.test(estadoYProximoPaso)) {
    result.cta_text = 'Definamos el piloto';
  }
  const contextoSolucion = [analisis.necesidad_principal, analisis.dolor_especifico, analisis.solucion_pertinente, analisis.iniciativa_priorizada].filter(Boolean).join(' ');
  if (/piloto/i.test(estadoYProximoPaso) && /validaci[oó]n documental/i.test(contextoSolucion) && /inteligencia artificial|\bIA\b/i.test(contextoSolucion)) {
    if (selectedStatistic && selectedStatistic.id === '1.4') {
      result.headline = 'Casi 7 de cada 10 tareas de procesamiento podrían automatizarse.';
    }
    result.solution_title = 'Oportunidades de mejora';
    result.body_paragraphs = [
      'Identificar tareas repetitivas puede reducir trabajo manual y ayudar a preparar datos confiables para tomar decisiones.'
    ];
    result.solution_description = 'Una evaluación inicial ayudaría a priorizar procesos y mejoras en la gestión de datos.';
    result.next_step = '¿Identificamos oportunidades y vemos por dónde empezar?';
    result.cta_text = 'Conversemos sobre oportunidades';
  }

  if (selectedStatistic && selectedStatistic.id === '1.4') {
    result.body_paragraphs = result.body_paragraphs.filter((paragraph) => !/(?:64\s?(?:%|por ciento)|64\s+de\s+cada\s+100|recolecci[oó]n de datos)/i.test(paragraph));
    if (!result.body_paragraphs.length) {
      result.body_paragraphs = ['Este potencial podría apoyar parte de la revisión manual de documentos históricos.'];
    }
    if (/definir alcance|levantamiento|iniciar (?:un )?proyecto/i.test(result.next_step)) {
      result.next_step = '¿Identificamos oportunidades y vemos por dónde empezar?';
    }
    result.cta_text = 'Conversemos sobre oportunidades';
  }

  for (const key of ['headline', 'solution_title', 'solution_description', 'next_step', 'cta_text']) {
    if (!result[key]) throw new Error('Falta el contenido comercial esencial: ' + key + '. Regenera el correo.');
  }
  if (!result.body_paragraphs.length) throw new Error('Falta el argumento dirigido al cliente. Regenera el correo.');
  if (result.cta_url !== WHATSAPP_URL) throw new Error('El enlace de llamada a la acción no es válido.');
  if (result.body_paragraphs.some((paragraph) => contarPalabras(paragraph) > 22)
    || contarPalabras(result.solution_title) > 6
    || contarPalabras(result.solution_description) > 15
    || contarPalabras(result.next_step) > 12
    || contarPalabras(result.cta_text) > 5) {
    throw new Error('El contenido generado excede la extensión comercial prevista. Vuelve a generarlo.');
  }

  const contenidoCliente = [
    result.headline,
    ...result.body_paragraphs,
    result.solution_title,
    result.solution_description,
    result.next_step,
    result.cta_text
  ].join(' ');
  if (/dolor específico|estadística [a-z]|resumen de la reunión|pendiente de seguimiento|ahorro_horas|\b(?:N|T)\s*[×x*]/i.test(contenidoCliente)) {
    throw new Error('La IA incluyó notas internas en el correo. Regenera el mensaje.');
  }
  const contenidoNormalizado = contenidoCliente.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const contactoNormalizado = String(analisis.contacto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const nombresProhibidos = [...NOMBRES_EQUIPO_INTERNO, ...extraerNombresExcluidos(analisis.informacion_excluir_correo || [])]
    .filter((nombre) => nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() !== contactoNormalizado);
  const mencionaNombreProhibido = nombresProhibidos.some((nombre) => contenidoNormalizado.includes(nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  const incluyeLenguajeInterno = /\bquedo de (?:enviar|confirmar|priorizar|elegir)|\bpendiente de seguimiento\b|\b(?:coordinar|preparar) (?:la )?(?:definicion|propuesta)|\ben nuestra reunion\b|\bel cliente debe\b|\bcuando .{0,50}priorice\b/i.test(contenidoNormalizado);
  if (mencionaNombreProhibido || incluyeLenguajeInterno) {
    throw new Error('El contenido incluye nombres o instrucciones internas de la reunión. Regenera el correo.');
  }
  if (result.statistic_used && result.headline === result.statistic_used.dato) {
    throw new Error('El titular debe expresar la estadística en lenguaje claro y conectarla con la necesidad del cliente. Regenera el correo.');
  }

  result.html = plantillaHTML(result);
  result.text = [
    result.headline,
    ...result.body_paragraphs,
    result.solution_title,
    result.solution_description,
    result.next_step,
    result.cta_text + ': ' + result.cta_url
  ].filter(Boolean).join('\n\n');
  return result;
}
module.exports = { generarCampana, plantillaHTML, urlImagenSegura, WHATSAPP_URL, IMAGE_SLOT };
