const path = require('path');
const Database = require('better-sqlite3');

const dataDirectory = path.join(__dirname, '..', 'data');
const databasePath = path.join(dataDirectory, 'analisis.db');

const db = new Database(databasePath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS analisis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    archivo TEXT NOT NULL,
    resumen TEXT NOT NULL,
    problemas TEXT NOT NULL,
    necesidades TEXT NOT NULL,
    miedos TEXT NOT NULL,
    objeciones TEXT NOT NULL,
    valoraciones TEXT NOT NULL,
    expectativas TEXT NOT NULL
  )
`);

// Columnas aditivas: las filas existentes permanecen intactas y se leen con valores vacíos.
const columnasExistentes = new Set(
  db.prepare('PRAGMA table_info(analisis)').all().map((columna) => columna.name)
);
for (const columna of [
  'cliente', 'contacto', 'cargo_contacto', 'necesidad_principal',
  'dolor_especifico', 'consecuencia_empresarial', 'solucion_pertinente',
  'iniciativa_priorizada', 'estado_comercial', 'proximo_paso_acordado',
  'pendientes_internos', 'datos_faltantes', 'informacion_excluir_correo',
  'enfoque_correo', 'asunto_recomendado', 'datos_cuantitativos'
]) {
  if (!columnasExistentes.has(columna)) {
    db.exec(`ALTER TABLE analisis ADD COLUMN ${columna} TEXT NOT NULL DEFAULT ''`);
  }
}

function guardarAnalisis(archivo, resultado) {
  const stmt = db.prepare(`
    INSERT INTO analisis (
      fecha,
      archivo,
      resumen,
      problemas,
      necesidades,
      miedos,
      objeciones,
      valoraciones,
      expectativas,
      cliente,
      contacto,
      cargo_contacto,
      necesidad_principal,
      dolor_especifico,
      consecuencia_empresarial,
      solucion_pertinente,
      iniciativa_priorizada,
      estado_comercial,
      proximo_paso_acordado,
      pendientes_internos,
      datos_faltantes,
      informacion_excluir_correo,
      enfoque_correo,
      asunto_recomendado,
      datos_cuantitativos
    )
    VALUES (
      @fecha,
      @archivo,
      @resumen,
      @problemas,
      @necesidades,
      @miedos,
      @objeciones,
      @valoraciones,
      @expectativas,
      @cliente,
      @contacto,
      @cargo_contacto,
      @necesidad_principal,
      @dolor_especifico,
      @consecuencia_empresarial,
      @solucion_pertinente,
      @iniciativa_priorizada,
      @estado_comercial,
      @proximo_paso_acordado,
      @pendientes_internos,
      @datos_faltantes,
      @informacion_excluir_correo,
      @enfoque_correo,
      @asunto_recomendado,
      @datos_cuantitativos
    )
  `);

  const datos = {
    fecha: new Date().toISOString(),
    archivo,
    resumen: resultado.resumen || '',
    problemas: JSON.stringify(resultado.problemas || []),
    necesidades: JSON.stringify(resultado.necesidades || []),
    miedos: JSON.stringify(resultado.miedos || []),
    objeciones: JSON.stringify(resultado.objeciones || []),
    valoraciones: JSON.stringify(resultado.valoraciones || []),
    expectativas: JSON.stringify(resultado.expectativas || []),
    cliente: resultado.cliente || '',
    contacto: resultado.contacto || '',
    cargo_contacto: resultado.cargo_contacto || '',
    necesidad_principal: resultado.necesidad_principal || '',
    dolor_especifico: resultado.dolor_especifico || '',
    consecuencia_empresarial: resultado.consecuencia_empresarial || '',
    solucion_pertinente: resultado.solucion_pertinente || '',
    iniciativa_priorizada: resultado.iniciativa_priorizada || '',
    estado_comercial: resultado.estado_comercial || '',
    proximo_paso_acordado: resultado.proximo_paso_acordado || '',
    pendientes_internos: JSON.stringify(resultado.pendientes_internos || []),
    datos_faltantes: JSON.stringify(resultado.datos_faltantes || []),
    informacion_excluir_correo: JSON.stringify(resultado.informacion_excluir_correo || []),
    enfoque_correo: resultado.enfoque_correo || '',
    asunto_recomendado: JSON.stringify(resultado.asunto_recomendado || []),
    datos_cuantitativos: JSON.stringify(resultado.datos_cuantitativos || [])
  };

  const info = stmt.run(datos);

  return {
    id: info.lastInsertRowid,
    fecha: datos.fecha
  };
}

function obtenerAnalisis() {
  const rows = db.prepare(`
    SELECT *
    FROM analisis
    ORDER BY fecha DESC
  `).all();

  return rows.map((row) => ({
    id: row.id,
    fecha: row.fecha,
    archivo: row.archivo,
    resumen: row.resumen,
    problemas: JSON.parse(row.problemas),
    necesidades: JSON.parse(row.necesidades),
    miedos: JSON.parse(row.miedos),
    objeciones: JSON.parse(row.objeciones),
    valoraciones: JSON.parse(row.valoraciones),
    expectativas: JSON.parse(row.expectativas),
    cliente: row.cliente || '',
    contacto: row.contacto || '',
    cargo_contacto: row.cargo_contacto || '',
    necesidad_principal: row.necesidad_principal || '',
    dolor_especifico: row.dolor_especifico || '',
    consecuencia_empresarial: row.consecuencia_empresarial || '',
    solucion_pertinente: row.solucion_pertinente || '',
    iniciativa_priorizada: row.iniciativa_priorizada || '',
    estado_comercial: row.estado_comercial || '',
    proximo_paso_acordado: row.proximo_paso_acordado || '',
    pendientes_internos: parseArray(row.pendientes_internos),
    datos_faltantes: parseArray(row.datos_faltantes),
    informacion_excluir_correo: parseArray(row.informacion_excluir_correo),
    enfoque_correo: row.enfoque_correo || '',
    datos_cuantitativos: (() => {
      try {
        const decodificado = JSON.parse(row.datos_cuantitativos || '[]');
        return Array.isArray(decodificado) ? decodificado : [];
      } catch {
        return [];
      }
    })(),
    asunto_recomendado: (() => {
      const valor = row.asunto_recomendado || '';
      try {
        const decodificado = JSON.parse(valor);
        return Array.isArray(decodificado) ? decodificado : valor;
      } catch {
        return valor;
      }
    })()
  }));
}

function parseArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function eliminarAnalisis(id) {
  const stmt = db.prepare(`
    DELETE FROM analisis
    WHERE id = ?
  `);

  const resultado = stmt.run(id);

  return resultado.changes > 0;
}

function eliminarAnalisisMultiples(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return 0;
  }

  const placeholders = ids.map(() => '?').join(', ');

  const stmt = db.prepare(`
    DELETE FROM analisis
    WHERE id IN (${placeholders})
  `);

  const resultado = stmt.run(...ids);

  return resultado.changes;
}
module.exports = {
   guardarAnalisis,
  obtenerAnalisis,
  eliminarAnalisis,
  eliminarAnalisisMultiples
};
