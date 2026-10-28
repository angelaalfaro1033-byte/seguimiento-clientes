const { getOpenAIClient } = require('./openai');
const fs = require('node:fs/promises');
const path = require('node:path');

const WHATSAPP_URL = 'https://api.whatsapp.com/send/?phone=573118852679&text=Hola%2C+me+gustar%C3%ADa+obtener+m%C3%A1s+informaci%C3%B3n+sobre+sus+servicios&type=phone_number&app_absent=0';
const IMAGE_SLOT = '';
const NOMBRES_EQUIPO_INTERNO = [
  'Wilmar Alfaro',
  'Lorena Yara',
  'Jaime Mejía',
  'Diego Molina',
  'John Alfaro'
];

const COLOR_PRIMARIO = '#2A3EF4';
const COLOR_TEXTO = '#34415D';
const COLOR_TITULO = '#17213D';

function escaparHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

// Resalta SOLO la cifra del gancho (porcentaje o "X de cada Y")
function resaltarCifra(value = '') {
  const texto = escaparHTML(value);
  const patron = /(\b\d+\s+de\s+cada\s+\d+\b|\b\d+(?:[.,]\d+)?\s?%)/i;

  return texto.replace(
    patron,
    (cifra) =>
      `<span style="color:${COLOR_PRIMARIO};font-size:36px;font-weight:800;line-height:1.1;white-space:nowrap">${cifra.replace(/\s/g, '&nbsp;')}</span>`
  );
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
  const alt = escaparHTML(
    options.imageAlt ||
    campana.alt_imagen ||
    'Imagen relacionada con la oportunidad comercial'
  );

  const imageBlock = imageUrl
    ? `<tr><td class="dt-pad" style="padding:0 40px 24px"><img src="${escaparHTML(imageUrl)}" width="520" alt="${alt}" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:8px"></td></tr>`
    : '';

  const paragraphs = (campana.body_paragraphs || [])
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:${COLOR_TEXTO};font-family:Poppins,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;text-align:left">${escaparHTML(paragraph)}</p>`
    )
    .join('');

  const nextStep = campana.next_step
    ? `<p style="margin:8px 0 22px;color:${COLOR_TITULO};font-family:Poppins,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;font-weight:600;text-align:left">${escaparHTML(campana.next_step)}</p>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escaparHTML(campana.subject || campana.asunto || '')}</title>
  <style>
    @media screen and (max-width:600px) {
      .dt-card { width:100%!important; border-radius:0!important }
      .dt-pad { padding-left:22px!important; padding-right:22px!important }
      .dt-hook { font-size:19px!important }
    }
  </style>
</head>
<body style="margin:0;padding:24px 8px;background:#F2F3FA;font-family:Poppins,Arial,Helvetica,sans-serif;color:${COLOR_TITULO}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#F2F3FA">
    <tr>
      <td align="center">
        <table class="dt-card" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden">

          <tr><td style="height:5px;background:${COLOR_PRIMARIO};font-size:0;line-height:0">&nbsp;</td></tr>

          <!-- GANCHO: estadística -->
          <tr>
            <td class="dt-pad" style="padding:36px 40px 24px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:#F3F4FF;border-left:4px solid ${COLOR_PRIMARIO};border-radius:0 8px 8px 0;padding:20px 22px">
                    <p class="dt-hook" style="margin:0;color:${COLOR_TITULO};font-family:Poppins,Arial,Helvetica,sans-serif;font-size:21px;line-height:1.4;font-weight:600;text-align:left">${resaltarCifra(campana.headline || '')}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${imageBlock}

          <!-- CUERPO -->
          <tr>
            <td class="dt-pad" style="padding:0 40px 8px">
              ${paragraphs}
              ${nextStep}
            </td>
          </tr>

          <!-- LLAMADO A LA ACCIÓN -->
          <tr>
            <td class="dt-pad" style="padding:0 40px 40px">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" bgcolor="${COLOR_PRIMARIO}" style="border-radius:8px">
                    <a href="${WHATSAPP_URL}" target="_blank" rel="noopener" style="display:inline-block;padding:15px 28px;background:${COLOR_PRIMARIO};border-radius:8px;color:#FFFFFF;text-decoration:none;font-family:Poppins,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.3;font-weight:700;text-align:center">${escaparHTML(campana.cta_text || '')} &nbsp;→</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const instruccionesCampanaFinal = [
  `Eres copywriter B2B de reactivación comercial. Transforma el análisis interno de una reunión previa en un correo comercial listo para enviar, nunca en un informe, minuta, lista de requisitos o resumen.

ESTRUCTURA DEL CORREO (siempre en este orden):
1) GANCHO: una estadística convertida en una frase inicial breve y natural.
2) CUERPO: uno o dos párrafos muy naturales que conectan ese gancho con la necesidad real del cliente.
3) LLAMADO A LA ACCIÓN: una invitación breve a escribir por WhatsApp.

ESTADÍSTICA DE APERTURA:
Revisa todos los registros incluidos en estadisticas_disponibles. Selecciona la estadística más pertinente para la necesidad real del cliente, su sector, el proceso mencionado y el objetivo del correo. No favorezcas automáticamente ningún registro ni selecciones siempre el dato 1.4. Todas las estadísticas deben poder ser elegidas si su contenido resulta pertinente.

CRITERIOS DE SELECCIÓN:
Compara el dato, servicio y temas de los registros disponibles. Relaciona el contenido de cada estadística con la situación concreta del destinatario. Para ventas, considera datos sobre productividad comercial; para atención al cliente, datos sobre servicio o tiempos de respuesta; para documentación, homologaciones o procesamiento de datos, considera datos relacionados con esas actividades. Son ejemplos orientativos, no categorías obligatorias. Escoge el dato que aporte mayor valor y permita una conexión natural con el problema del cliente. No elijas una estadística solo porque sea llamativa.

VARIEDAD:
Evita repetir la misma estadística en correos consecutivos cuando existan otras opciones igualmente pertinentes. No cambies de estadística de forma artificial ni sacrifiques relevancia para generar variedad. Si ninguna estadística tiene relación clara con el caso, redacta un titular sin cifras. No inventes datos ni combines cifras de registros diferentes.

PRECISIÓN:
Utiliza como máximo una cifra estadística en todo el correo. Respeta el significado original del registro y no añadas conclusiones que la fuente no respalde. El gancho debe ser una sola frase clara y breve que exprese el dato. No repitas la cifra en el cuerpo ni en otra sección. No impongas una frase fija para el dato 1.4 ni para ningún otro registro.

PROHIBIDO ABSOLUTAMENTE (datos internos que el cliente no debe ver):
- Fechas, días de la semana u horas (por ejemplo "el viernes", "2:30 p.m.", "la próxima semana").
- Referencias a la reunión ("en la reunión", "nuestra reunión", "reunión del viernes").
- Documentos que el cliente enviará o debe enviar, pendientes, compromisos o acuerdos.
- Nombres de personas, empleados o terceros.
Habla solo de la necesidad del negocio y de la oportunidad, como si fuera un primer mensaje claro y cercano.

CONTEXTO COMERCIAL:
Habla directamente de una necesidad empresarial y de una oportunidad relevante. El análisis de la reunión sirve como contexto, pero no debe reproducirse como expediente comercial. No inventes problemas, procesos, compromisos, fechas, documentos pendientes ni próximos pasos. No conviertas notas internas en preguntas para el cliente.

REDACCIÓN DEL CUERPO:
Escribe un texto natural, cálido, claro y persuasivo, como lo diría una persona. El texto del cuerpo no debe superar unas 60 palabras en total. Usa uno o dos párrafos de máximo 25 palabras cada uno. Primer párrafo: conecta el gancho con el negocio del cliente. Segundo párrafo (opcional): explica el beneficio concreto en palabras simples (menos trabajo manual, tareas repetitivas identificadas, información más confiable para decidir), solo si el contexto lo respalda. No repitas ideas entre párrafos.

Evita lenguaje técnico o distante como "consolidación para analítica", "enfocar el análisis de viabilidad", "levantamiento de requerimientos" o "definir alcance". No uses listas de servicios, beneficios acumulados, títulos decorativos ni frases genéricas que podrían enviarse a cualquier empresa. No afirmes resultados, volúmenes, problemas actuales ni ahorros que no estén respaldados. No inventes cifras, pérdidas, plazos, testimonios, garantías ni capacidades concretas como OCR, integraciones, tableros o interfaces que las notas no confirmen.

CAMPOS:
- headline: el gancho (la estadística en una frase breve y natural). Si no hay estadística pertinente, una frase breve sin cifras.
- body_paragraphs: arreglo de uno o dos párrafos según lo indicado.
- solution_title: cadena vacía.
- solution_description: cadena vacía.
- next_step: invitación breve y natural a escribir por WhatsApp para ver por dónde empezar. Máximo 12 palabras. No presupongas compromisos ni una reunión futura.
- cta_text: llamada a la acción de 2 a 5 palabras, por ejemplo "Escríbenos por WhatsApp".
- cta_url: utiliza exactamente el whatsapp_url proporcionado.
- statistic_used: ID exacto de la estadística seleccionada o null si no se usa ninguna.

No añadas saludos innecesarios, presentación corporativa ni la frase "en Drakion Tech". No expongas ID, título, fuente, organización, publicación ni año de la estadística.

SALIDA:
Devuelve únicamente JSON válido, sin Markdown, con estas claves exactas:
subject, headline, body_paragraphs, solution_title, solution_description, next_step, cta_text, cta_url, statistic_used, alt_imagen, concepto_visual.

subject debe ser exactamente el asunto recibido. solution_title y solution_description deben ser cadenas vacías. cta_url debe ser exactamente el whatsapp_url del contexto. alt_imagen debe ser una descripción objetiva y breve. concepto_visual debe ser una dirección visual breve. Ningún dato interno puede aparecer en los campos de texto visibles para el destinatario.

Antes de elegir la estadística, compara todos los registros recibidos en estadisticas_disponibles. No asumas que un registro es mejor por su ID ni por haber sido usado anteriormente. Selecciona solo un registro que exista en esa lista. Si hay varios igualmente pertinentes, elige el que aporte el ángulo más útil para este caso.`
].join('\n\n');

function limpiarTextoComercial(value) {
  return String(value || '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extraerNombresExcluidos(informacion = []) {
  const palabrasGenericas = new Set([
    'Nombres', 'Persona', 'Personas', 'Equipo', 'Cliente',
    'Proveedor', 'Pendiente', 'Reunion', 'Correo', 'Fecha',
    'Siguiente', 'Documento', 'Documentos', 'Definir',
    'Enviar', 'Confirmar', 'Priorizar', 'Seleccionar',
    'Propuesta', 'Piloto', 'Validacion', 'Revision'
  ]);

  return informacion.flatMap((detalle) => {
    const nombres = [];
    const texto = String(detalle || '');
    const patron = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b/g;

    for (const coincidencia of texto.matchAll(patron)) {
      if (
        !palabrasGenericas.has(coincidencia[1]) &&
        !palabrasGenericas.has(coincidencia[2])
      ) {
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
    const contenido = await fs.readFile(
      path.join(__dirname, '..', 'data', 'estadisticas.json'),
      'utf8'
    );

    const banco = JSON.parse(contenido);

    if (Array.isArray(banco.estadisticas)) {
      estadisticasDisponibles = banco.estadisticas
        .filter((item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.dato === 'string' &&
          Array.isArray(item.servicio) &&
          Array.isArray(item.temas)
        )
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
    pendientes_internos: Array.isArray(analisis.pendientes_internos)
      ? analisis.pendientes_internos
      : [],
    datos_faltantes: Array.isArray(analisis.datos_faltantes)
      ? analisis.datos_faltantes
      : [],
    informacion_excluir_correo: Array.isArray(analisis.informacion_excluir_correo)
      ? analisis.informacion_excluir_correo
      : [],
    enfoque_correo: analisis.enfoque_correo || '',
    datos_cuantitativos: (analisis.datos_cuantitativos || [])
      .filter((dato) => dato && dato.atribucion === 'cliente externo')
      .map(({ dato, evidencia, contexto: proceso }) => ({
        dato,
        evidencia,
        contexto: proceso
      })),
    problemas: (analisis.problemas || []).map(({ tema, descripcion, evidencia }) => ({
      tema,
      descripcion,
      evidencia
    })),
    necesidades: (analisis.necesidades || []).map(({ tema, descripcion, evidencia }) => ({
      tema,
      descripcion,
      evidencia
    })),
    miedos: (analisis.miedos || []).map(({ tema, descripcion, evidencia }) => ({
      tema,
      descripcion,
      evidencia
    })),
    objeciones: (analisis.objeciones || []).map(({ tema, descripcion, evidencia }) => ({
      tema,
      descripcion,
      evidencia
    })),
    valoraciones: (analisis.valoraciones || []).map(({ tema, descripcion, evidencia }) => ({
      tema,
      descripcion,
      evidencia
    })),
    expectativas: (analisis.expectativas || []).map(({ tema, descripcion, evidencia }) => ({
      tema,
      descripcion,
      evidencia
    })),
    estadisticas_disponibles: estadisticasDisponibles,
    instrucciones_seleccion_estadistica:
      `Hay ${estadisticasDisponibles.length} estadísticas disponibles. ` +
      `Evalúa todas; no selecciones automáticamente una por su ID. ` +
      `IDs disponibles: ${estadisticasDisponibles.map((item) => item.id).join(', ')}.`,
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
    throw new Error(
      'La IA no devolvió el contenido comercial en formato válido. Inténtalo de nuevo.'
    );
  }

  if (!copy || typeof copy !== 'object' || Array.isArray(copy)) {
    throw new Error(
      'La IA no devolvió un objeto comercial válido. Inténtalo de nuevo.'
    );
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
    ? copy.body_paragraphs
        .map(limpiarTextoComercial)
        .filter(Boolean)
        .slice(0, 2)
    : [];

  const headline = limpiarTextoComercial(copy.headline);

  const result = {
    subject: asunto,
    asunto,
    headline,
    titular: headline,
    body_paragraphs: bodyParagraphs,
    solution_title: '',
    solution_description: '',
    next_step: limpiarTextoComercial(copy.next_step),
    cta_text: limpiarTextoComercial(copy.cta_text),
    cta_url: WHATSAPP_URL,
    statistic_used: selectedStatistic
      ? {
          id: selectedStatistic.id,
          dato: selectedStatistic.dato
        }
      : null,
    alt_imagen: limpiarTextoComercial(copy.alt_imagen),
    concepto_visual: limpiarTextoComercial(copy.concepto_visual),
    nota_estadistica: selectedStatistic
      ? ''
      : pudoLeerEstadisticas
        ? 'No se encontró una estadística pertinente; el correo se generó sin estadística.'
        : 'No se pudo leer estadisticas.json; el correo se generó sin estadística.'
  };

  for (const key of ['headline', 'next_step', 'cta_text']) {
    if (!result[key]) {
      throw new Error(
        'Falta el contenido comercial esencial: ' + key + '. Regenera el correo.'
      );
    }
  }

  if (!result.body_paragraphs.length) {
    throw new Error('Falta el argumento dirigido al cliente. Regenera el correo.');
  }

  if (result.cta_url !== WHATSAPP_URL) {
    throw new Error('El enlace de llamada a la acción no es válido.');
  }

  const contenidoCliente = [
    result.headline,
    ...result.body_paragraphs,
    result.solution_title,
    result.solution_description,
    result.next_step,
    result.cta_text
  ].join(' ');

  if (
    /dolor específico|estadística [a-z]|resumen de la reunión|pendiente de seguimiento|ahorro_horas|\b(?:N|T)\s\*[×x*]/i
      .test(contenidoCliente)
  ) {
    throw new Error(
      'La IA incluyó notas internas en el correo. Regenera el mensaje.'
    );
  }

  const contenidoNormalizado = contenidoCliente
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const contactoNormalizado = String(analisis.contacto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const nombresProhibidos = [
    ...NOMBRES_EQUIPO_INTERNO,
    ...extraerNombresExcluidos(analisis.informacion_excluir_correo || [])
  ].filter((nombre) =>
    nombre.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase() !== contactoNormalizado
  );

  const mencionaNombreProhibido = nombresProhibidos.some((nombre) =>
    contenidoNormalizado.includes(
      nombre.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    )
  );

  const incluyeLenguajeInterno =
    /\bquedo de (?:enviar|confirmar|priorizar|elegir)|\bpendiente de seguimiento\b|\b(?:coordinar|preparar) (?:la )?(?:definicion|propuesta)|\ben nuestra reunion\b|\bel cliente debe\b|\bcuando .{0,50}priorice\b/i
      .test(contenidoNormalizado);

  // Fechas, horas, días de la semana y menciones a la reunión
  const incluyeFechaOReunion =
    /\b(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b|\b\d{1,2}:\d{2}\b|\b\d{1,2}\s?(?:a\.?\s?m\.?|p\.?\s?m\.?)(?=\s|$|[.,;])|\breunion\b|\bproxima semana\b|\bantes de la\b.*\bdocumentacion\b/i
      .test(contenidoNormalizado);

  if (mencionaNombreProhibido || incluyeLenguajeInterno || incluyeFechaOReunion) {
    throw new Error(
      'El contenido incluye nombres, fechas o instrucciones internas de la reunión. Regenera el correo.'
    );
  }

  if (result.statistic_used && result.headline === result.statistic_used.dato) {
    throw new Error(
      'El titular debe expresar la estadística en lenguaje claro y conectarla con la necesidad del cliente. Regenera el correo.'
    );
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

module.exports = {
  generarCampana,
  plantillaHTML,
  urlImagenSegura,
  WHATSAPP_URL,
  IMAGE_SLOT
};