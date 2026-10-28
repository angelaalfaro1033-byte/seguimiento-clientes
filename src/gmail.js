const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { google } = require('googleapis');

const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
const SENDER_EMAIL = 'contacto@drakiontech.com';
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const oauthStates = new Map();

function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

function getOAuthSetupStatus() {
  const missing = [];
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID) missing.push('GOOGLE_OAUTH_CLIENT_ID');
  if (!process.env.GOOGLE_OAUTH_CLIENT_SECRET) missing.push('GOOGLE_OAUTH_CLIENT_SECRET');
  if (!process.env.GMAIL_REFRESH_TOKEN) missing.push('GMAIL_REFRESH_TOKEN');
  if ((process.env.GMAIL_SENDER_EMAIL || '').trim().toLowerCase() !== SENDER_EMAIL) missing.push('GMAIL_SENDER_EMAIL=contacto@drakiontech.com');
  return { ready: missing.length === 0, missing };
}

function persistirRefreshTokenSiRota(auth) {
  auth.on('tokens', (tokens) => {
    if (!tokens.refresh_token) return;
    guardarRefreshToken(tokens.refresh_token).catch((error) => {
      console.error('OAuth Gmail: no se pudo persistir la renovación; tipo:', error.code || error.name || 'error');
    });
  });
}

function crearUrlAutorizacion() {
  const oauth2Client = getOAuthClient();
  if (!oauth2Client) throw new Error('Configura primero el ID y el secreto OAuth en .env.');

  const now = Date.now();
  for (const [state, expiresAt] of oauthStates) {
    if (expiresAt <= now) oauthStates.delete(state);
  }
  const state = crypto.randomBytes(32).toString('hex');
  oauthStates.set(state, now + OAUTH_STATE_TTL_MS);
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent select_account',
    login_hint: SENDER_EMAIL,
    scope: [GMAIL_SEND_SCOPE],
    state
  });
}

async function guardarRefreshToken(refreshToken) {
  const envPath = path.join(__dirname, '..', '.env');
  let contents = '';
  try {
    contents = await fs.readFile(envPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const line = `GMAIL_REFRESH_TOKEN=${JSON.stringify(refreshToken)}`;
  const pattern = /^\s*(?:export\s+)?GMAIL_REFRESH_TOKEN\s*=.*$/m;
  if (pattern.test(contents)) {
    contents = contents.replace(pattern, line);
  } else {
    contents = `${contents}${contents && !contents.endsWith('\n') ? '\n' : ''}${line}\n`;
  }

  const tempPath = `${envPath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    await fs.writeFile(tempPath, contents, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await fs.rename(tempPath, envPath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
  process.env.GMAIL_REFRESH_TOKEN = refreshToken;
}

async function completarAutorizacion({ code, state, error: oauthError }) {
  const expiresAt = oauthStates.get(state);
  if (!state || !expiresAt || expiresAt <= Date.now()) {
    oauthStates.delete(state);
    return { ok: false, status: 400, message: 'La autorización expiró o no pudo validarse. Vuelve a iniciar el proceso desde el servidor local.' };
  }
  oauthStates.delete(state);

  if (oauthError) {
    return { ok: false, status: 400, message: 'No se concedió acceso a Gmail. Puedes volver a iniciar la autorización.' };
  }
  if (typeof code !== 'string' || !code) {
    return { ok: false, status: 400, message: 'Google no devolvió un código de autorización válido.' };
  }

  const oauth2Client = getOAuthClient();
  if (!oauth2Client) {
    return { ok: false, status: 503, message: 'Falta configurar el cliente OAuth en el archivo .env.' };
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token || process.env.GMAIL_REFRESH_TOKEN;
    if (!refreshToken) {
      return { ok: false, status: 400, message: 'Google no entregó un refresh token. Revoca el acceso previo de esta aplicación a tu cuenta y vuelve a autorizarla.' };
    }
    if (tokens.refresh_token) await guardarRefreshToken(tokens.refresh_token);
    else process.env.GMAIL_REFRESH_TOKEN = refreshToken;
    return { ok: true };
  } catch (error) {
    console.error('OAuth Gmail: no se pudo completar el intercambio; tipo:', error.code || error.name || 'error');
    return { ok: false, status: 502, message: 'No se pudo completar la autorización con Google. Revisa la URI de retorno y vuelve a intentarlo.' };
  }
}

function crearClienteGmail() {
  const status = getOAuthSetupStatus();
  if (!status.ready) return null;
  const auth = getOAuthClient();
  if (!auth) return null;
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  persistirRefreshTokenSiRota(auth);
  return google.gmail({ version: 'v1', auth });
}

async function validarOAuthToken() {
  const status = getOAuthSetupStatus();
  if (!status.ready) throw new Error('GMAIL_NOT_CONFIGURED');
  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  persistirRefreshTokenSiRota(auth);
  await auth.getAccessToken();
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function encodeMimeBody(value = '') {
  const base64 = Buffer.from(String(value), 'utf8').toString('base64');
  return base64.match(/.{1,76}/g)?.join('\r\n') || '';
}

function crearMensajeRaw({ to, subject, html, text }) {
  const boundary = `gmail-alt-${crypto.randomBytes(18).toString('hex')}`;
  const headers = [
    `From: Drakion Tech <${SENDER_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ];
  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodeMimeBody(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodeMimeBody(html),
    `--${boundary}--`
  ];
  return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`, 'utf8').toString('base64url');
}

async function enviarCorreo({ to, subject, html, text }) {
  const gmail = crearClienteGmail();
  if (!gmail) throw new Error('GMAIL_NOT_CONFIGURED');
  const { data } = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: crearMensajeRaw({ to, subject, html, text }) }
  });
  return data;
}

module.exports = {
  REDIRECT_URI,
  SENDER_EMAIL,
  getOAuthSetupStatus,
  crearUrlAutorizacion,
  completarAutorizacion,
  crearClienteGmail,
  validarOAuthToken,
  enviarCorreo
};
