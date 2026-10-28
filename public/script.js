const archivoInput = document.getElementById('archivo');
const botonAnalizar = document.getElementById('analizar');
const estado = document.getElementById('estado');
const estadoCampana = document.getElementById('estado-campana');
const estadoEnvio = document.getElementById('estado-envio');
const selectorAsuntoCampana = document.getElementById('asunto-campana');
const botonGenerarCampana = document.getElementById('generar-campana');
const editorCampana = document.getElementById('editor-campana');
const iframeCampana = document.getElementById('vista-previa-campana');
const botonEnviarCampana = document.getElementById('enviar-campana');
const etiquetaBotonEnvio = botonEnviarCampana.querySelector('[data-label]');
const selectorRemitente = document.getElementById('cuenta-remitente');
let configuracionCorreoDisponible = false;
let envioCorreoEnCurso = false;

function limpiarEtiquetaEnfoqueAsunto(asunto) {
  return String(asunto || '').replace(/^(?:Urgencia|Curiosidad|Dolor específico|Oportunidad)\s*[—–:-]\s*/i, '').trim();
}

function actualizarEstadoBotonEnvio(cargando) {
  botonEnviarCampana.classList.toggle('is-loading', cargando);
  botonEnviarCampana.setAttribute('aria-busy', String(cargando));
  etiquetaBotonEnvio.textContent = cargando ? 'Enviando correo…' : 'Enviar correo';
}

const resultado = document.getElementById('resultado');
const analisisId = document.getElementById('analisis-id');
const resumen = document.getElementById('resumen');
const camposComerciales = {
  cliente: document.getElementById('cliente'),
  contactoCargo: document.getElementById('contacto-cargo'),
  necesidad: document.getElementById('necesidad-principal'),
  dolor: document.getElementById('dolor-especifico'),
  enfoque: document.getElementById('enfoque-correo'),
  asuntos: document.getElementById('asuntos-recomendados')
};

const listaAnalisis = document.getElementById('lista-analisis');
const historialVacio = document.getElementById('historial-vacio');

const botonSeleccionarTodos = document.getElementById(
  'seleccionar-todos'
);

const botonLimpiarSeleccion = document.getElementById(
  'limpiar-seleccion'
);

const botonPatrones = document.getElementById(
  'analizar-patrones'
);

const botonEliminarSeleccionados = document.getElementById(
  'eliminar-seleccionados'
);

const seleccionadosTexto = document.getElementById(
  'seleccionados'
);

const patrones = document.getElementById('patrones');

const resumenPatrones = document.getElementById(
  'resumen-patrones'
);

const cantidadReunionesPatrones = document.getElementById(
  'cantidad-reuniones-patrones'
);

const contenedores = {
  problemas: document.getElementById('problemas'),
  necesidades: document.getElementById('necesidades'),
  miedos: document.getElementById('miedos'),
  objeciones: document.getElementById('objeciones'),
  valoraciones: document.getElementById('valoraciones'),
  expectativas: document.getElementById('expectativas')
};

const contenedoresPatrones = {
  problemas_recurrentes: document.getElementById(
    'problemas-recurrentes'
  ),

  necesidades_recurrentes: document.getElementById(
    'necesidades-recurrentes'
  ),

  objeciones_preocupaciones_recurrentes:
    document.getElementById(
      'objeciones-preocupaciones-recurrentes'
    ),

  valoraciones_recurrentes: document.getElementById(
    'valoraciones-recurrentes'
  ),

  posibles_diferenciadores_percibidos:
    document.getElementById(
      'diferenciadores-percibidos'
    ),

  oportunidades_contenido: document.getElementById(
    'oportunidades-contenido'
  )
};

let analisisGuardados = [];

let analisisMostradoId = null;


/* ================================
   UTILIDADES
================================ */

function mostrarEstado(mensaje, esError = false) {
  estado.textContent = mensaje;

  estado.classList.toggle(
    'error',
    esError
  );
}


function escaparHTML(texto) {
  const div = document.createElement('div');

  div.textContent = texto || '';

  return div.innerHTML;
}


function formatearFecha(fecha) {
  if (!fecha) {
    return 'Fecha no disponible';
  }

  const fechaObjeto = new Date(fecha);

  if (Number.isNaN(fechaObjeto.getTime())) {
    return fecha;
  }

  return fechaObjeto.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}


/* ================================
   RESULTADO INDIVIDUAL
================================ */

function mostrarCategoria(elemento, items) {
  elemento.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    elemento.innerHTML = `
      <p class="sin-datos">
        No se identificaron elementos explícitos.
      </p>
    `;

    return;
  }

  items.forEach((item) => {
    const tarjeta = document.createElement('div');

    tarjeta.className = 'item';

    tarjeta.innerHTML = `
      <h4>
        ${escaparHTML(item.tema)}
      </h4>

      <p class="descripcion-item">
        ${escaparHTML(item.descripcion)}
      </p>

      <div class="evidencia">
        <span>Evidencia</span>

        <p>
          “${escaparHTML(item.evidencia)}”
        </p>
      </div>
    `;

    elemento.appendChild(tarjeta);
  });
}


function mostrarResultado(analisis) {
  analisisMostradoId = analisis.id;

  resumen.textContent =
    analisis.resumen ||
    'Sin resumen disponible.';

  analisisId.textContent = analisis.id
    ? `Análisis #${analisis.id}`
    : '';

  camposComerciales.cliente.textContent = analisis.cliente || 'No identificado en las notas.';
  camposComerciales.contactoCargo.textContent = [analisis.contacto, analisis.cargo_contacto].filter(Boolean).join(' · ') || 'No identificado en las notas.';
  camposComerciales.necesidad.textContent = analisis.necesidad_principal || 'No se identificó información suficiente.';
  camposComerciales.dolor.textContent = analisis.dolor_especifico || 'No se identificó información suficiente.';
  camposComerciales.enfoque.textContent = analisis.enfoque_correo || 'No se identificó información suficiente.';
  const asuntos = Array.isArray(analisis.asunto_recomendado)
    ? analisis.asunto_recomendado
    : (analisis.asunto_recomendado ? [analisis.asunto_recomendado] : []);
  camposComerciales.asuntos.replaceChildren();
  if (asuntos.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No hay asuntos disponibles.';
    camposComerciales.asuntos.appendChild(item);
  } else {
    asuntos.forEach((asunto) => {
      const item = document.createElement('li');
      item.textContent = limpiarEtiquetaEnfoqueAsunto(asunto);
      camposComerciales.asuntos.appendChild(item);
    });
  }
  selectorAsuntoCampana.replaceChildren();
  asuntos.forEach((asunto) => {
    const asuntoLimpio = limpiarEtiquetaEnfoqueAsunto(asunto);
    const option = document.createElement('option');
    option.value = asuntoLimpio;
    option.textContent = asuntoLimpio;
    selectorAsuntoCampana.appendChild(option);
  });
  editorCampana.classList.add('oculto');
  estadoCampana.textContent = '';

  Object.entries(contenedores).forEach(
    ([categoria, elemento]) => {
      mostrarCategoria(
        elemento,
        analisis[categoria]
      );
    }
  );

  resultado.classList.remove('oculto');

  resultado.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function escaparAtributoHTML(texto) {
  return String(texto || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function actualizarVistaPreviaCampana() {
  let html = document.getElementById('html-campana').value;
  const imageUrl = document.getElementById('url-imagen-campana').value.trim();
  const imageAlt = document.getElementById('alt-imagen-campana').value.trim() || 'Imagen relacionada con el tema del correo';
  let elementosPosterioresAlTitular = '';
  if (imageUrl) {
    try {
      if (new URL(imageUrl).protocol !== 'https:') throw new Error('La imagen debe usar una URL HTTPS pública.');
      elementosPosterioresAlTitular += '<p style="margin:20px 0 0"><img src="' + escaparAtributoHTML(imageUrl) + '" width="576" alt="' + escaparAtributoHTML(imageAlt) + '" style="display:block;width:100%;max-width:576px;height:auto;border:0;border-radius:8px"></p>';
      document.getElementById('nota-imagen-campana').textContent = 'La vista previa utiliza la URL HTTPS indicada; confirma que sea accesible para los destinatarios.';
    } catch (error) {
      document.getElementById('nota-imagen-campana').textContent = error.message;
    }
  } else {
    document.getElementById('nota-imagen-campana').textContent = 'No se generó una imagen: puedes añadir una URL HTTPS pública opcional, que aparecerá debajo del titular.';
  }
  const nombre = document.getElementById('nombre-destinatario').value.trim();
  if (nombre) {
    const saludo = '<p style="margin:0 0 18px;font-size:16px">Hola ' + escaparAtributoHTML(nombre) + ',</p>';
    elementosPosterioresAlTitular = saludo + elementosPosterioresAlTitular;
  }
  html = html.replace('</h1>', '</h1>' + elementosPosterioresAlTitular);
  iframeCampana.srcdoc = html;
  return html;
}

async function cargarConfiguracionCorreo() {
  try {
    const response = await fetch('/api/mail/config');
    const config = await response.json();
    selectorRemitente.replaceChildren();
    configuracionCorreoDisponible = response.ok && config.configured && Array.isArray(config.senders) && config.senders.length > 0;
    if (configuracionCorreoDisponible) {
      config.senders.forEach((sender) => {
        const option = document.createElement('option');
        option.value = sender;
        option.textContent = sender;
        selectorRemitente.appendChild(option);
      });
      document.getElementById('nota-remitente').textContent = `Cuenta Gmail conectada: ${config.senders[0]}. El correo saldrá desde esta dirección.`;
    } else {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No hay cuenta autorizada conectada';
      selectorRemitente.appendChild(option);
      document.getElementById('nota-remitente').textContent = `${config.message || 'Configura OAuth de Gmail para habilitar el envío.'} El envío está deshabilitado hasta que exista una cuenta autorizada.`;
    }
    actualizarDisponibilidadEnvio();
  } catch (error) {
    document.getElementById('nota-remitente').textContent = 'No se pudo verificar la conexión de correo.';
    configuracionCorreoDisponible = false;
    actualizarDisponibilidadEnvio();
  }
}

function actualizarDisponibilidadEnvio() {
  botonEnviarCampana.disabled = !configuracionCorreoDisponible || envioCorreoEnCurso;
}


/* ================================
   ANÁLISIS GLOBAL
================================ */

function mostrarPatron(elemento, item) {
  const tarjeta = document.createElement('div');

  tarjeta.className = 'item';

  const cantidad =
    Number(item.cantidad_reuniones) || 0;

  const reuniones =
    Array.isArray(item.analisis_ids)
      ? item.analisis_ids.join(', ')
      : '';

  tarjeta.innerHTML = `
    <h4>
      ${escaparHTML(item.tema)}
    </h4>

    <p class="descripcion-item">
      ${escaparHTML(item.descripcion)}
    </p>

    <div class="patron-meta">

      <span>
        Aparece en
        ${cantidad}
        reunión${cantidad === 1 ? '' : 'es'}
      </span>

      ${
        reuniones
          ? `
            <span>
              Análisis:
              ${escaparHTML(reuniones)}
            </span>
          `
          : ''
      }

    </div>
  `;

  elemento.appendChild(tarjeta);
}


function mostrarDiferenciador(elemento, item) {
  const tarjeta = document.createElement('div');

  tarjeta.className =
    'item diferenciador-item';

  const cantidad =
    Number(item.cantidad_reuniones) || 0;

  const reuniones =
    Array.isArray(item.analisis_ids)
      ? item.analisis_ids.join(', ')
      : '';

  const nivel =
    item.nivel_recurrencia || 'No determinado';

  tarjeta.innerHTML = `
    <h4>
      ${escaparHTML(item.tema)}
    </h4>

    <p class="descripcion-item">
      ${escaparHTML(item.descripcion)}
    </p>

    <div class="patron-meta">

      <span>
        Aparece en
        ${cantidad}
        reunión${cantidad === 1 ? '' : 'es'}
      </span>

      <span>
        Recurrencia:
        ${escaparHTML(nivel)}
      </span>

      ${
        reuniones
          ? `
            <span>
              Análisis:
              ${escaparHTML(reuniones)}
            </span>
          `
          : ''
      }

    </div>

    ${
      item.por_que_puede_ser_relevante
        ? `
          <div class="relevancia">
            <span>
              Por qué puede ser relevante
            </span>

            <p>
              ${escaparHTML(
                item.por_que_puede_ser_relevante
              )}
            </p>
          </div>
        `
        : ''
    }
  `;

  elemento.appendChild(tarjeta);
}


function mostrarOportunidadContenido(
  elemento,
  item
) {
  const tarjeta = document.createElement('div');

  tarjeta.className =
    'item oportunidad-item';

  const cantidad =
    Number(item.cantidad_reuniones) || 0;

  const reuniones =
    Array.isArray(item.analisis_ids)
      ? item.analisis_ids.join(', ')
      : '';

  tarjeta.innerHTML = `
    <h4>
      ${escaparHTML(item.tema)}
    </h4>

    <p class="descripcion-item">
      ${escaparHTML(item.descripcion)}
    </p>

    <div class="patron-meta">

      <span>
        Aparece en
        ${cantidad}
        reunión${cantidad === 1 ? '' : 'es'}
      </span>

      ${
        reuniones
          ? `
            <span>
              Análisis:
              ${escaparHTML(reuniones)}
            </span>
          `
          : ''
      }

    </div>
  `;

  elemento.appendChild(tarjeta);
}


function mostrarPatronesGlobales(datos) {
  const analisisPatrones =
    datos.patrones;

  resumenPatrones.textContent =
    analisisPatrones.resumen ||
    'No se encontró un resumen general.';

  cantidadReunionesPatrones.textContent =
    `${datos.cantidadAnalisis} reuniones analizadas`;


  Object.entries(contenedoresPatrones).forEach(
    ([categoria, elemento]) => {
      elemento.innerHTML = '';

      const items =
        analisisPatrones[categoria];

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        elemento.innerHTML = `
          <p class="sin-datos">
            No se identificaron elementos
            recurrentes.
          </p>
        `;

        return;
      }

      items.forEach((item) => {

        if (
          categoria ===
          'posibles_diferenciadores_percibidos'
        ) {
          mostrarDiferenciador(
            elemento,
            item
          );

          return;
        }

        if (
          categoria ===
          'oportunidades_contenido'
        ) {
          mostrarOportunidadContenido(
            elemento,
            item
          );

          return;
        }

        mostrarPatron(
          elemento,
          item
        );
      });
    }
  );


  patrones.classList.remove('oculto');

  patrones.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}


/* ================================
   SELECCIÓN DEL HISTORIAL
================================ */

function obtenerIdsSeleccionados() {
  const checkboxes =
    document.querySelectorAll(
      '.checkbox-analisis:checked'
    );

  return Array.from(checkboxes).map(
    (checkbox) => Number(checkbox.value)
  );
}


function actualizarSeleccion() {
  const ids =
    obtenerIdsSeleccionados();

  const cantidad =
    ids.length;

  seleccionadosTexto.textContent =
    `${cantidad} análisis seleccionado${
      cantidad === 1 ? '' : 's'
    }`;

  botonPatrones.disabled =
    cantidad < 2;

  botonEliminarSeleccionados.disabled =
    cantidad === 0;
}


/* ================================
   HISTORIAL
================================ */

function mostrarHistorial(analisis) {
  listaAnalisis.innerHTML = '';

  if (
    !Array.isArray(analisis) ||
    analisis.length === 0
  ) {
    historialVacio.classList.remove(
      'oculto'
    );

    actualizarSeleccion();

    return;
  }

  historialVacio.classList.add(
    'oculto'
  );


  analisis.forEach((item) => {
    const tarjeta =
      document.createElement('article');

    tarjeta.className =
      'historial-item';

    tarjeta.innerHTML = `
      <div class="historial-seleccion">

        <input
          type="checkbox"
          class="checkbox-analisis"
          value="${escaparHTML(
            String(item.id)
          )}"
          aria-label="Seleccionar análisis ${escaparHTML(
            String(item.id)
          )}"
        >

      </div>


      <div class="historial-info">

        <span class="historial-id">
          Análisis #${escaparHTML(
            String(item.id)
          )}
        </span>

        <h3>
          ${escaparHTML(item.archivo)}
        </h3>

        <p>
          ${escaparHTML(
            formatearFecha(item.fecha)
          )}
        </p>

      </div>


      <div class="historial-botones-item">

        <button
          type="button"
          class="boton-ver"
          data-id="${escaparHTML(
            String(item.id)
          )}"
        >
          Ver análisis
        </button>


        <button
          type="button"
          class="boton-eliminar-item"
          data-id="${escaparHTML(
            String(item.id)
          )}"
        >
          Eliminar
        </button>

      </div>
    `;

    listaAnalisis.appendChild(
      tarjeta
    );
  });


  actualizarSeleccion();
}


async function cargarHistorial() {
  try {
    const respuesta =
      await fetch('/api/analisis');

    const datos =
      await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.error ||
        'No se pudo cargar el historial.'
      );
    }

    analisisGuardados =
      datos.analisis || [];

    mostrarHistorial(
      analisisGuardados
    );

  } catch (error) {
    console.error(error);

    listaAnalisis.innerHTML = `
      <p class="historial-error">
        No se pudo cargar el historial.
      </p>
    `;
  }
}


/* ================================
   VER ANÁLISIS
================================ */

listaAnalisis.addEventListener(
  'click',
  (evento) => {

    const boton =
      evento.target.closest(
        '.boton-ver'
      );

    if (!boton) {
      return;
    }

    const id =
      Number(boton.dataset.id);

    const analisis =
      analisisGuardados.find(
        (item) =>
          item.id === id
      );

    if (!analisis) {
      return;
    }

    mostrarResultado(
      analisis
    );
  }
);


/* ================================
   SELECCIÓN
================================ */

listaAnalisis.addEventListener(
  'change',
  (evento) => {

    if (
      !evento.target.classList.contains(
        'checkbox-analisis'
      )
    ) {
      return;
    }

    actualizarSeleccion();
  }
);


/* ================================
   SELECCIONAR TODOS
================================ */

botonSeleccionarTodos.addEventListener(
  'click',
  () => {

    const checkboxes =
      document.querySelectorAll(
        '.checkbox-analisis'
      );

    checkboxes.forEach(
      (checkbox) => {
        checkbox.checked = true;
      }
    );

    actualizarSeleccion();
  }
);


/* ================================
   LIMPIAR SELECCIÓN
================================ */

botonLimpiarSeleccion.addEventListener(
  'click',
  () => {

    const checkboxes =
      document.querySelectorAll(
        '.checkbox-analisis'
      );

    checkboxes.forEach(
      (checkbox) => {
        checkbox.checked = false;
      }
    );

    actualizarSeleccion();
  }
);


/* ================================
   ELIMINAR UNO
================================ */

listaAnalisis.addEventListener(
  'click',
  async (evento) => {

    const boton =
      evento.target.closest(
        '.boton-eliminar-item'
      );

    if (!boton) {
      return;
    }

    const id =
      Number(boton.dataset.id);

    const analisis =
      analisisGuardados.find(
        (item) =>
          item.id === id
      );

    if (!analisis) {
      return;
    }


    const confirmar =
      window.confirm(
        `¿Quieres eliminar el Análisis #${id}?\n\nEsta acción eliminará el análisis guardado de la base de datos.`
      );

    if (!confirmar) {
      return;
    }


    boton.disabled = true;

    try {

      const respuesta =
        await fetch(
          `/api/analisis/${id}`,
          {
            method: 'DELETE'
          }
        );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
          'No se pudo eliminar el análisis.'
        );
      }


      analisisGuardados =
        analisisGuardados.filter(
          (item) =>
            item.id !== id
        );


      if (
        analisisMostradoId === id
      ) {
        resultado.classList.add(
          'oculto'
        );

        analisisMostradoId = null;
      }


      patrones.classList.add(
        'oculto'
      );


      mostrarHistorial(
        analisisGuardados
      );


      mostrarEstado(
        `Análisis #${id} eliminado correctamente.`
      );

    } catch (error) {

      console.error(error);

      mostrarEstado(
        error.message ||
        'No se pudo eliminar el análisis.',
        true
      );

      boton.disabled = false;
    }
  }
);


/* ================================
   ELIMINAR SELECCIONADOS
================================ */

botonEliminarSeleccionados.addEventListener(
  'click',
  async () => {

    const analisisIds =
      obtenerIdsSeleccionados();

    if (
      analisisIds.length === 0
    ) {
      return;
    }


    const confirmar =
      window.confirm(
        `¿Quieres eliminar ${analisisIds.length} análisis seleccionados?\n\nEsta acción no se puede deshacer.`
      );

    if (!confirmar) {
      return;
    }


    botonEliminarSeleccionados.disabled =
      true;

    botonPatrones.disabled =
      true;


    mostrarEstado(
      'Eliminando análisis...'
    );


    try {

      const respuesta =
        await fetch(
          '/api/analisis',
          {
            method: 'DELETE',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              analisisIds
            })
          }
        );


      const datos =
        await respuesta.json();


      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
          'No se pudieron eliminar los análisis.'
        );
      }


      analisisGuardados =
        analisisGuardados.filter(
          (item) =>
            !analisisIds.includes(
              item.id
            )
        );


      if (
        analisisMostradoId &&
        analisisIds.includes(
          analisisMostradoId
        )
      ) {
        resultado.classList.add(
          'oculto'
        );

        analisisMostradoId = null;
      }


      patrones.classList.add(
        'oculto'
      );


      mostrarHistorial(
        analisisGuardados
      );


      mostrarEstado(
        `${datos.eliminados} análisis eliminados correctamente.`
      );

    } catch (error) {

      console.error(error);

      mostrarEstado(
        error.message ||
        'No se pudieron eliminar los análisis.',
        true
      );

      actualizarSeleccion();
    }
  }
);


/* ================================
   ANALIZAR PATRONES
================================ */

botonPatrones.addEventListener(
  'click',
  async () => {

    const analisisIds =
      obtenerIdsSeleccionados();


    if (
      analisisIds.length < 2
    ) {
      mostrarEstado(
        'Selecciona al menos 2 análisis.',
        true
      );

      return;
    }


    botonPatrones.disabled =
      true;

    botonEliminarSeleccionados.disabled =
      true;


    mostrarEstado(
      'Analizando patrones entre las reuniones...'
    );


    patrones.classList.add(
      'oculto'
    );


    try {

      const respuesta =
        await fetch(
          '/api/patrones',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              analisisIds
            })
          }
        );


      const datos =
        await respuesta.json();


      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
          'No se pudieron detectar los patrones.'
        );
      }


      mostrarPatronesGlobales(
        datos
      );


      mostrarEstado(
        'Análisis global completado correctamente.'
      );

    } catch (error) {

      console.error(error);

      mostrarEstado(
        error.message ||
        'Ocurrió un error al detectar patrones.',
        true
      );

    } finally {

      actualizarSeleccion();
    }
  }
);


/* ================================
   ANALIZAR NUEVA REUNIÓN
================================ */

botonAnalizar.addEventListener(
  'click',
  async () => {

    const archivo =
      archivoInput.files[0];


    if (!archivo) {
      mostrarEstado(
        'Selecciona un archivo TXT, PDF o Word (.docx).',
        true
      );

      return;
    }


    const extension = archivo.name.split('.').pop().toLowerCase();
    if (!['txt', 'pdf', 'docx'].includes(extension)) {
      mostrarEstado(
        'El archivo debe ser TXT, PDF o Word (.docx).',
        true
      );

      return;
    }

    if (archivo.size > 12 * 1024 * 1024) {
      mostrarEstado('El archivo supera el límite de 12 MB.', true);
      return;
    }


    botonAnalizar.disabled =
      true;


    resultado.classList.add(
      'oculto'
    );

    patrones.classList.add(
      'oculto'
    );


    mostrarEstado(
      'Analizando reunión...'
    );


    try {

      let contenido;
      if (extension === 'txt') {
        contenido = await archivo.text();
      } else {
        const bytes = new Uint8Array(await archivo.arrayBuffer());
        let binario = '';
        const tamanoBloque = 0x8000;
        for (let inicio = 0; inicio < bytes.length; inicio += tamanoBloque) {
          binario += String.fromCharCode(...bytes.subarray(inicio, inicio + tamanoBloque));
        }
        contenido = btoa(binario);
      }


      const respuesta =
        await fetch(
          '/api/analyze',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              nombreArchivo:
                archivo.name,

              contenido,
              codificacion: extension === 'txt' ? 'texto' : 'base64'
            })
          }
        );


      const datos =
        await respuesta.json();


      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
          'Error al analizar la reunión.'
        );
      }


      mostrarResultado({
        ...datos.resultado,

        id: datos.analisisId,

        fecha: datos.fecha,

        archivo: datos.archivo
      });


      mostrarEstado(
        'Análisis completado y guardado correctamente.'
      );


      await cargarHistorial();


    } catch (error) {

      console.error(error);

      mostrarEstado(
        error.message ||
        'Ocurrió un error.',
        true
      );

    } finally {

      botonAnalizar.disabled =
        false;
    }
  }
);


/* ================================
   INICIO
================================ */

botonGenerarCampana.addEventListener('click', async () => {
  const asunto = selectorAsuntoCampana.value;
  if (!analisisMostradoId || !asunto) {
    estadoCampana.textContent = 'Selecciona un análisis y un asunto disponible.';
    return;
  }
  botonGenerarCampana.disabled = true;
  estadoCampana.textContent = 'Preparando contenido personalizado…';
  try {
    const response = await fetch('/api/campaign/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analisisId: analisisMostradoId, asunto })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo generar el correo.');
    document.getElementById('asunto-final').value = asunto;
    document.getElementById('html-campana').value = data.campana.html;
    document.getElementById('texto-campana').value = data.campana.text;
    document.getElementById('alt-imagen-campana').value = data.campana.alt_imagen || '';
    document.getElementById('nota-imagen-campana').textContent = `Dirección visual sugerida: ${data.campana.concepto_visual}. La aplicación no tiene generación o alojamiento de imágenes conectado; añade una URL HTTPS real si quieres incluir una.`;
    editorCampana.classList.remove('oculto');
    estadoCampana.textContent = [
      'Propuesta generada. Edita y revisa el mensaje antes del envío.',
      data.campana.nota_estadistica
    ].filter(Boolean).join(' ');
    estadoEnvio.textContent = '';
    actualizarVistaPreviaCampana();
  } catch (error) {
    estadoCampana.textContent = error.message || 'No se pudo generar el correo.';
  } finally {
    botonGenerarCampana.disabled = false;
  }
});

document.getElementById('actualizar-previa').addEventListener('click', actualizarVistaPreviaCampana);
document.getElementById('nombre-destinatario').addEventListener('input', actualizarVistaPreviaCampana);
document.getElementById('url-imagen-campana').addEventListener('input', actualizarVistaPreviaCampana);
document.getElementById('alt-imagen-campana').addEventListener('input', actualizarVistaPreviaCampana);
selectorRemitente.addEventListener('change', actualizarDisponibilidadEnvio);

botonEnviarCampana.addEventListener('click', async () => {
  if (envioCorreoEnCurso) return;
  const to = document.getElementById('correo-destinatario').value.trim();
  const from = selectorRemitente.value;
  const subject = document.getElementById('asunto-final').value.trim();
  const html = document.getElementById('html-campana').value;
  const imageUrl = document.getElementById('url-imagen-campana').value.trim();
  const bodyText = document.getElementById('texto-campana').value;
  const text = bodyText;
  const campoDestinatario = document.getElementById('correo-destinatario');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!to || !emailPattern.test(to)) {
    estadoEnvio.classList.remove('exito', 'procesando');
    estadoEnvio.classList.add('error');
    estadoEnvio.textContent = 'Escribe una dirección completa, por ejemplo nombre@empresa.com, en «Correo del destinatario». Se acepta un destinatario por envío.';
    campoDestinatario.focus();
    return;
  }
  if (!from || !subject || !html.trim()) {
    estadoEnvio.classList.remove('exito', 'procesando');
    estadoEnvio.classList.add('error');
    estadoEnvio.textContent = 'Completa remitente, asunto y contenido antes de enviar.';
    return;
  }
  if (imageUrl) {
    try {
      if (new URL(imageUrl).protocol !== 'https:') throw new Error();
    } catch {
      estadoEnvio.classList.remove('exito', 'procesando');
      estadoEnvio.classList.add('error');
      estadoEnvio.textContent = 'La imagen debe usar una URL HTTPS pública válida.';
      return;
    }
  }
  const htmlFinal = actualizarVistaPreviaCampana();
  envioCorreoEnCurso = true;
  botonEnviarCampana.disabled = true;
  actualizarEstadoBotonEnvio(true);
  estadoEnvio.classList.remove('error', 'exito');
  estadoEnvio.classList.add('procesando');
  estadoEnvio.setAttribute('aria-busy', 'true');
  estadoEnvio.setAttribute('aria-live', 'assertive');
  estadoEnvio.textContent = `Enviando el correo a ${to}… No cierres esta ventana.`;
  const controladorEnvio = new AbortController();
  const timeoutEnvio = setTimeout(() => controladorEnvio.abort(), 60000);
  try {
    const response = await fetch('/api/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, from, subject, html: htmlFinal, text }),
      signal: controladorEnvio.signal
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || `El servidor rechazó el envío (HTTP ${response.status}). Revisa la configuración e inténtalo de nuevo.`);
    if (!data || data.ok !== true || typeof data.messageId !== 'string' || !data.messageId.trim()) {
      throw new Error('El servidor no confirmó que Gmail aceptara el correo. No se mostrará como enviado.');
    }
    estadoEnvio.classList.remove('procesando');
    estadoEnvio.classList.add('exito');
    estadoEnvio.textContent = `Correo enviado correctamente a ${to}.`;
  } catch (error) {
    estadoEnvio.classList.remove('procesando');
    estadoEnvio.classList.add('error');
    estadoEnvio.textContent = error.name === 'AbortError'
      ? 'La solicitud tardó más de un minuto. No se confirmó el envío; revisa la carpeta Enviados de Gmail antes de reintentar.'
      : error instanceof TypeError
        ? 'No se pudo conectar con el servidor local. Comprueba que la aplicación siga abierta e inténtalo de nuevo.'
        : error.message || 'No se pudo enviar el correo. Revisa la conexión y vuelve a intentarlo.';
  } finally {
    clearTimeout(timeoutEnvio);
    envioCorreoEnCurso = false;
    estadoEnvio.setAttribute('aria-busy', 'false');
    actualizarEstadoBotonEnvio(false);
    actualizarDisponibilidadEnvio();
  }
});

cargarConfiguracionCorreo();

cargarHistorial();
