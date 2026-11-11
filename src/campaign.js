const { getOpenAIClient } = require('./openai');
const fs = require('node:fs/promises');
const path = require('node:path');

const WHATSAPP_URL = 'https://api.whatsapp.com/send/?phone=573219241873&text=Hola%2C+me+gustar%C3%ADa+obtener+m%C3%A1s+informaci%C3%B3n+sobre+sus+servicios&type=phone_number&app_absent=0';
const IMAGE_SLOT = '';
const NOMBRES_EQUIPO_INTERNO = [
  'Wilmar Alfaro',
  'Lorena Yara',
  'Jaime Mejía',
  'Diego Molina',
  'John Alfaro'
];

const COLOR_AZUL_OSCURO = '#071947';
const COLOR_PRIMARIO = '#2A3EF4';
const COLOR_FUCSIA = '#FF004F';
const COLOR_TEXTO = '#071947';
const COLOR_TITULO = '#071947';

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
        `<p style="margin:0 0 16px;color:${COLOR_TEXTO};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;text-align:center">${escaparHTML(paragraph)}</p>`
    )
    .join('');

  const nextStep = campana.next_step
    ? `<p style="margin:8px 0 22px;color:${COLOR_TITULO};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;font-weight:600;text-align:center">${escaparHTML(campana.next_step)}</p>`
    : '';

  const statistic = campana.statistic_used;
  const hasStatistic = statistic && typeof statistic === 'object';
  const statisticUrl = hasStatistic ? urlImagenSegura(statistic.url_fuente || '') : '';
  const statisticCard = hasStatistic && statisticUrl
    ? `<tr><td class="dt-pad" style="padding:4px 40px 22px"><p style="margin:0 0 16px;text-align:center"><a href="${escaparHTML(statisticUrl)}" target="_blank" rel="noopener" style="color:${COLOR_PRIMARIO};font:700 13px/1.5 Arial,Helvetica,sans-serif;text-decoration:underline">Consultar fuente ↗</a></p></td></tr>`
    : '';

  const watermark = `<img src="cid:drakion-logo" width="142" alt="Drakiontech" style="display:block;width:142px;max-width:100%;height:auto;border:0;opacity:0.24">`;

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
      .dt-title { font-size:29px!important; line-height:1.16!important }
      .dt-figure { font-size:32px!important }
      .dt-logo { width:158px!important }
    }
  </style>
</head>
<body style="margin:0;padding:24px 8px;background:${COLOR_AZUL_OSCURO};font-family:Arial,Helvetica,sans-serif;color:${COLOR_TITULO}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${COLOR_AZUL_OSCURO}" style="width:100%;background:${COLOR_AZUL_OSCURO}">
    <tr>
      <td align="center">
        <table class="dt-card" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#E4E5F2" style="width:100%;max-width:600px;background:#E4E5F2;border-radius:18px;overflow:hidden">

          <tr>
            <td align="center" bgcolor="${COLOR_AZUL_OSCURO}" style="padding:16px 24px;background:${COLOR_AZUL_OSCURO};border-bottom:3px solid ${COLOR_FUCSIA}">
              <img class="dt-logo" src="cid:drakion-logo" width="174" alt="Drakiontech" style="display:block;width:174px;max-width:100%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none">
            </td>
          </tr>

          <!-- DT_GREETING_SLOT -->
          <tr>
            <td class="dt-pad" align="center" style="padding:30px 48px 20px">
              <h1 class="dt-title" style="margin:0;color:${COLOR_AZUL_OSCURO};font:700 34px/1.18 Arial,Helvetica,sans-serif;letter-spacing:-0.7px;text-align:center">${resaltarCifra(campana.headline || '')}</h1>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px auto 0"><tr><td width="34" height="4" bgcolor="${COLOR_PRIMARIO}" style="width:34px;height:4px;background:${COLOR_PRIMARIO};font-size:0;line-height:0">&nbsp;</td><td width="9" style="width:9px;font-size:0;line-height:0">&nbsp;</td><td width="14" height="4" bgcolor="${COLOR_FUCSIA}" style="width:14px;height:4px;background:${COLOR_FUCSIA};font-size:0;line-height:0">&nbsp;</td><td width="9" style="width:9px;font-size:0;line-height:0">&nbsp;</td><td width="6" height="4" bgcolor="#000000" style="width:6px;height:4px;background:#000000;font-size:0;line-height:0">&nbsp;</td></tr></table>
            </td>
          </tr>

          ${statisticCard}

          <!-- DT_IMAGE_SLOT -->
          ${imageBlock}

          <!-- CUERPO -->
          <tr>
            <td class="dt-pad" align="center" style="padding:16px 56px 8px">
              ${paragraphs}
              ${nextStep}
            </td>
          </tr>

          <!-- LLAMADO A LA ACCIÓN -->
          <tr>
            <td class="dt-pad" align="center" style="padding:12px 40px 28px">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto">
                <tr>
                  <td align="center" bgcolor="${COLOR_PRIMARIO}" style="border:1px solid ${COLOR_PRIMARIO};border-radius:8px">
                    <a href="${WHATSAPP_URL}" target="_blank" rel="noopener" style="display:inline-block;padding:15px 28px;background:${COLOR_PRIMARIO};border:1px solid ${COLOR_PRIMARIO};border-radius:8px;color:#E4E5F2;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.3;font-weight:700;text-align:center">${escaparHTML(campana.cta_text || '')} &nbsp;→</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td bgcolor="${COLOR_AZUL_OSCURO}" style="padding:18px 24px;background:${COLOR_AZUL_OSCURO};border-top:3px solid ${COLOR_FUCSIA}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="left" valign="middle" style="color:#E4E5F2;font:10px/1.5 Arial,Helvetica,sans-serif;letter-spacing:1px">TECNOLOGÍA CON PROPÓSITO</td><td align="right" valign="middle" style="width:150px;padding:6px 0 6px 12px;">${watermark}</td></tr></table></td></tr>

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
1) TITULAR: una idea breve y atractiva sobre el problema u oportunidad general del cliente; no copies literalmente el dato completo.
2) ENLACE DE FUENTE: la aplicación añade el enlace "Consultar fuente". No escribas nombre de fuente, año, metodología, aclaración o URL en ningún campo del correo.
3) DESARROLLO: varios párrafos breves que expliquen por qué importa el problema, qué limita o dificulta y cuál sería una oportunidad razonable de mejora.
4) CIERRE: una pregunta natural que invite a conversar, seguida del botón de WhatsApp.

El correo debe sentirse como una reflexión comercial escrita para una persona, no como un reporte. El ejemplo de estilo es una referencia de ritmo y propósito, no texto para copiar. Varía el ángulo, la redacción y la pregunta según la estadística y el contexto general del cliente.

ESTADÍSTICA DE APERTURA:
Revisa todos los registros incluidos en estadisticas_disponibles. Selecciona la estadística más pertinente para la necesidad real del cliente, su sector, el proceso mencionado y el objetivo del correo. No favorezcas automáticamente ningún registro ni selecciones siempre el dato 1.4. Todas las estadísticas deben poder ser elegidas si su contenido resulta pertinente.

CRITERIOS DE SELECCIÓN:
Compara el dato, servicio y temas de los registros disponibles. Relaciona el contenido de cada estadística con la situación concreta del destinatario. Para ventas, considera datos sobre productividad comercial; para atención al cliente, datos sobre servicio o tiempos de respuesta; para documentación, homologaciones o procesamiento de datos, considera datos relacionados con esas actividades. Son ejemplos orientativos, no categorías obligatorias. Escoge el dato que aporte mayor valor y permita una conexión natural con el problema del cliente. No elijas una estadística solo porque sea llamativa.

VARIEDAD:
Evita repetir la misma estadística en correos consecutivos cuando existan otras opciones igualmente pertinentes. No cambies de estadística de forma artificial ni sacrifiques relevancia para generar variedad. Si ninguna estadística tiene relación clara con el caso, redacta un titular sin cifras. No inventes datos ni combines cifras de registros diferentes.

PRECISIÓN:
Utiliza exactamente una cifra estadística en todo el correo. Si el registro contiene varias métricas, elige solo la más pertinente y no menciones las demás. El headline debe expresar esa única cifra de manera breve y fiel al registro, sin añadir otras cifras. No copies el dato completo si incluye métricas adicionales. La aplicación añade por separado un único enlace "Consultar fuente". No escribas metodología, muestra, aclaraciones, nombre de la fuente, año ni URL en el titular, cuerpo o cierre.

PROHIBIDO ABSOLUTAMENTE (datos internos que el cliente no debe ver):
- Fechas, días de la semana u horas (por ejemplo "el viernes", "2:30 p.m.", "la próxima semana").
- Referencias a la reunión ("en la reunión", "nuestra reunión", "reunión del viernes").
- Documentos que el cliente enviará o debe enviar, pendientes, compromisos o acuerdos.
- Nombres de personas, empleados o terceros.
Habla solo de la necesidad general del negocio y de una oportunidad, como si fuera un primer mensaje claro y cercano. No menciones detalles identificables o demasiado puntuales de la reunión: nombres de sistemas, proyectos concretos, cantidades de registros, migraciones específicas, fechas, decisiones ni situaciones particulares. Generaliza el contexto en términos como calidad de datos, procesos o reportería.

CONTEXTO COMERCIAL:
Habla directamente de una necesidad empresarial y de una oportunidad relevante. El análisis de la reunión sirve solo para elegir el tema general; no reproduzcas detalles concretos ni ejemplos identificables de esa conversación. No inventes problemas, procesos, compromisos, fechas, documentos pendientes ni próximos pasos. No conviertas notas internas en preguntas para el cliente.

REDACCIÓN DEL CUERPO:
Escribe un texto natural, cálido, coherente y persuasivo en español sencillo, como lo diría una persona. Usa de dos a cuatro párrafos de máximo 30 palabras cada uno. Explica por qué el problema importa, qué puede dificultar y cuál es una oportunidad realista de mejora, con una transición lógica entre ideas. Evita jerga, siglas y nombres de plataformas o herramientas (por ejemplo GCP, ETL, jobs, ERP, MVP, analítica predictiva); explica las ideas con palabras cotidianas como datos desordenados, tareas manuales, reportes poco confiables y decisiones más difíciles. No afirmes que una acción específica resolverá el problema si no está respaldada por el contexto. El nombre de la empresa es exactamente "Drakiontech"; puedes incluirlo con naturalidad si ayuda, sin presentación corporativa ni variantes del nombre. No propongas reuniones, levantamientos de procesos, MVP ni otros pasos específicos que no estén acordados. Cierra con una pregunta sencilla y relacionada con la idea anterior, sin repetir el CTA de WhatsApp. Adapta cada mensaje a la estadística y al tema general del cliente, sin repetir la cifra. No repitas ideas entre párrafos.

Evita lenguaje técnico o distante como "consolidación para analítica", "enfocar el análisis de viabilidad", "levantamiento de requerimientos" o "definir alcance". No uses listas de servicios, beneficios acumulados, títulos decorativos ni frases genéricas que podrían enviarse a cualquier empresa. No afirmes resultados, volúmenes, problemas actuales ni ahorros que no estén respaldados. No inventes cifras, pérdidas, plazos, testimonios, garantías ni capacidades concretas como OCR, integraciones, tableros o interfaces que las notas no confirmen.

CAMPOS:
- headline: si hay estadística, menciona solo una cifra del registro seleccionado, la más pertinente para el contexto; no incluyas las otras cifras del mismo registro. Si no hay estadística pertinente, una frase breve sin cifras.
- body_paragraphs: arreglo de dos a cuatro párrafos breves que avancen la reflexión, relacionen el problema con la oportunidad y terminen en una pregunta conversacional.
- solution_title: cadena vacía.
- solution_description: cadena vacía.
- next_step: pregunta final breve y natural que invite a conversar sobre la oportunidad. Máximo 20 palabras. No ofrezcas agendar reuniones, levantamientos de procesos, MVP ni compromisos.
- cta_text: llamada a la acción de 2 a 5 palabras, por ejemplo "Escríbenos por WhatsApp".
- cta_url: utiliza exactamente el whatsapp_url proporcionado.
- statistic_used: ID exacto de la estadística seleccionada o null si no se usa ninguna.

No añadas saludos innecesarios ni presentación corporativa. La aplicación incluye solamente el enlace "Consultar fuente" usando url_fuente del JSON; no escribas texto de atribución, año, desglose, metodología ni enlace en los campos generados.

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

function normalizarNombreEmpresa(value = '') {
  return String(value).replace(/\bDrakion\s*Tech\b|\bDrakiontec\b/gi, 'Drakiontech');
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

    const registrosEstadisticos = Array.isArray(banco.estadisticas)
      ? banco.estadisticas
      : Array.isArray(banco.servicios)
        ? banco.servicios.flatMap((servicio) =>
            Array.isArray(servicio?.estadisticas) ? servicio.estadisticas : []
          )
        : null;

    if (registrosEstadisticos) {
      // El esquema vigente agrupa estadísticas en servicios[].estadisticas[].
      // Servicio y temas son metadatos opcionales; no condicionan la validez.
      estadisticasDisponibles = registrosEstadisticos
        .filter((item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.dato === 'string'
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

  const detallesEstadisticosRepetibles = selectedStatistic
    ? [
        selectedStatistic.dato,
        selectedStatistic.muestra,
        selectedStatistic.aclaracion,
        selectedStatistic.fuente,
        selectedStatistic.url_fuente,
        String(selectedStatistic.anio || '')
      ].filter(Boolean)
    : [];
  const bodyParagraphs = Array.isArray(copy.body_paragraphs)
    ? copy.body_paragraphs
        .map((paragraph) => {
          let limpio = limpiarTextoComercial(paragraph)
            .replace(/https?:\/\/\S+/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          for (const detalle of detallesEstadisticosRepetibles) {
            const literal = String(detalle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            limpio = limpio.replace(new RegExp(literal, 'gi'), '').trim();
          }
          if (selectedStatistic) {
            limpio = limpio
              .split(/(?<=[.!?])\s+/)
              .filter((sentence) => !/\b(?:fuente|encuesta|estimaciones propias|consultar fuente)\b/i.test(sentence))
              .join(' ');
          }
          return limpio.replace(/\s+/g, ' ').trim();
        })
        .filter(Boolean)
        .slice(0, 4)
    : [];

  const headline = normalizarNombreEmpresa(limpiarTextoComercial(copy.headline));

  const result = {
    subject: asunto,
    asunto,
    headline,
    titular: headline,
    body_paragraphs: bodyParagraphs.map(normalizarNombreEmpresa),
    solution_title: '',
    solution_description: '',
    next_step: normalizarNombreEmpresa(limpiarTextoComercial(copy.next_step)),
    cta_text: normalizarNombreEmpresa(limpiarTextoComercial(copy.cta_text)),
    cta_url: WHATSAPP_URL,
    statistic_used: selectedStatistic
      ? {
          id: selectedStatistic.id,
          dato: selectedStatistic.dato,
          cifra_clave: selectedStatistic.cifra_clave,
          fuente: selectedStatistic.fuente,
          anio: selectedStatistic.anio,
          url_fuente: selectedStatistic.url_fuente,
          muestra: selectedStatistic.muestra,
          aclaracion: selectedStatistic.aclaracion
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

  if (result.statistic_used) {
    const cifrasEnTitular = result.headline.match(/(?:US\$|\$)?\d+(?:[.,]\d+)?\s?%?/g) || [];
    if (cifrasEnTitular.length !== 1) {
      throw new Error('El titular debe mencionar exactamente una cifra estadística. Regenera el correo.');
    }
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

  result.html = plantillaHTML(result);

  result.text = [
    result.headline,
    ...(result.statistic_used && result.statistic_used.url_fuente
      ? [`Consultar fuente: ${result.statistic_used.url_fuente}`]
      : []),
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
