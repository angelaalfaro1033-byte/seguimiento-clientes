# Analizador de Reuniones

Aplicación sencilla que recibe transcripciones de reuniones con clientes (archivos `.txt`) y las analiza con la API de OpenAI.

## 1. Requisitos

- Node.js 20 o superior
- npm
- Una API key de OpenAI (solo será necesaria cuando se implemente el análisis real)

## 2. Instalación

```bash
cd analizador-reuniones
npm install
```

## 3. Configuración del `.env`

Copia el archivo de ejemplo y complétalo:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=tu_clave_aqui
PORT=3000
```

La clave vive únicamente en `.env`, que está en `.gitignore`. Nunca se envía al frontend.

## 4. Cómo ejecutar el proyecto

```bash
npm start        # ejecución normal
npm run dev      # se reinicia automáticamente al guardar cambios
```

Abre http://localhost:3000 en el navegador.

## 5. Cómo probar `/api/health`

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:

```json
{ "status": "ok", "timestamp": "2026-01-01T00:00:00.000Z" }
```

## 6. Qué hace actualmente el proyecto

- Sirve una interfaz web simple desde `public/`.
- Permite seleccionar archivos `.txt`, `.pdf` y Word `.docx` (máximo 12 MB) y enviarlos con el botón "Analizar reunión". Los PDF escaneados sin texto seleccionable no se pueden extraer automáticamente.
- `POST /api/analyze` acepta `.txt`, `.pdf` y `.docx`, extrae el texto, genera un análisis de reunión y lo conserva en el historial.
- El análisis mantiene las categorías existentes (`resumen`, `problemas`, `necesidades`, `miedos`, `objeciones`, `valoraciones`, `expectativas`) y añade cliente, contacto, cargo, necesidad principal, dolor específico, enfoque de seguimiento y un asunto recomendado personalizado.
- `GET /api/health` confirma que el servidor está activo.
- `src/openai.js` deja listo el cliente del SDK oficial de OpenAI (aún no se usa).
- Desde un análisis puedes elegir uno de sus asuntos, generar una propuesta de seguimiento personalizada y revisar/editar el HTML y el texto plano antes de enviar.
- La vista previa usa la identidad visual de Drakion Tech y un CTA funcional a WhatsApp. No hay un generador ni alojamiento de imágenes conectado; se muestra un marcador y se puede añadir una URL HTTPS pública con texto alternativo.
- El envío utiliza la API de Gmail con OAuth 2.0 y el alcance `https://www.googleapis.com/auth/gmail.send`. Configura `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth2callback` y `GMAIL_SENDER_EMAIL=contacto@drakiontech.com` en `.env`. Habilita Gmail API en Google Cloud y registra exactamente `http://localhost:3000/oauth2callback` en URI de redireccionamiento autorizados.
- Para la autorización inicial, ejecuta `npm start` y abre `http://localhost:3000/auth/google` en este equipo. Inicia sesión con `contacto@drakiontech.com` y concede permiso para enviar correos. El callback guarda el refresh token en el `.env` local, que está excluido de Git; nunca se devuelve al navegador. El remitente queda fijado a `contacto@drakiontech.com`. Al pulsar «Enviar correo», el formulario muestra el estado de carga mientras espera la respuesta de Gmail y solo informa éxito tras recibir confirmación del servidor.
- En Render, configura `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GMAIL_SENDER_EMAIL=contacto@drakiontech.com` y `GMAIL_REFRESH_TOKEN` en Environment. Para obtener o renovar el refresh token, autoriza Gmail en el entorno local desde `http://localhost:3000/auth/google`, copia únicamente el valor de `GMAIL_REFRESH_TOKEN` del `.env` local a Render y reinicia el servicio. El sistema no puede guardar ese secreto de forma persistente en el filesystem efímero del despliegue. Si el consentimiento OAuth está en modo Testing, los refresh tokens de scopes de Gmail caducan a los 7 días; revisa el estado de publicación de la app en Google Cloud.
- El `.env` local debe permanecer privado. `gmail.send` es un alcance sensible; para distribución pública puede ser necesaria la verificación OAuth de Google. La ruta de autorización implementada está limitada al equipo local y la URI HTTP de localhost es solo para desarrollo.

Los campos comerciales nuevos se guardan en columnas aditivas de SQLite. Los análisis previos siguen disponibles; los campos nuevos aparecen vacíos en registros creados antes de la funcionalidad.
