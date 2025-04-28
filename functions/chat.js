const { Configuration, OpenAIApi } = require('openai');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { message, chatHistory, products, bills } = JSON.parse(event.body);
  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(configuration);

  const prompt = `
    Du er LS Bot, en assistent for LS LiveSolutions. Kunden spør: "${message}". 
    Basert på chathistorikken: ${JSON.stringify(chatHistory)}, 
    tilgjengelige produkter: ${JSON.stringify(products)}, 
    og tidligere prosjekter: ${JSON.stringify(bills)}, 
    gi et hjelpsomt svar på norsk. Hvis relevant, foreslå en løsning med prisestimat (f.eks. NOK 10,000-15,000) og be om navn, e-post og telefon for en nøyaktig pris. 
    Hvis kunden spør hva vi selger, list opp kategorier (AV-utstyr, skjermer, PC-er, etc.).
    Priser ble sist oppdatert ${products.length > 0 ? products[0].lastUpdated : 'ukjent dato'}, men vi bekrefter oppdaterte priser i tilbudet.
  `;

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: response.data.choices[0].message.content }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
