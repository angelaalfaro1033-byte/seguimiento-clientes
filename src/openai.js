// Cliente del SDK oficial de OpenAI.
// La API key se lee ÚNICAMENTE desde process.env.OPENAI_API_KEY (archivo .env).
// Nunca se escribe en el código ni se envía al frontend.

const { OpenAI } = require('openai');

let client = null;

// El cliente se crea la primera vez que se necesita (y no al arrancar),
// así el servidor funciona aunque todavía no hayas configurado la API key.
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Falta OPENAI_API_KEY. Configúrala en el archivo .env.');
  }

  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return client;
}

module.exports = { getOpenAIClient };
