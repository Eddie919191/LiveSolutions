const { Configuration, OpenAIApi } = require('openai');

exports.handler = async (event) => {
  console.log('Function invoked with event:', event);
  if (event.httpMethod !== 'POST') {
    console.log('Method not allowed');
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { message, chatHistory, products, bills } = JSON.parse(event.body);
  console.log('Parsed body:', { message, chatHistory, products, bills });

  if (!process.env.OPENAI_API_KEY) {
    console.log('Missing OPENAI_API_KEY');
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing OPENAI_API_KEY' }) };
  }

  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(configuration);
  console.log('OpenAI configuration set');

  const prompt = `
    Du er LS Bot, en assistent for LS LiveSolutions. Kunden spør: "${message}". 
    Basert på chathistorikken: ${JSON.stringify(chatHistory)}, 
    tilgjengelige produkter: ${JSON.stringify(products)}, 
    og tidligere prosjekter: ${JSON.stringify(bills)}, 
    gi et hjelpsomt svar på norsk. Hvis relevant, foreslå en løsning med prisestimat (f.eks. NOK 10,000-15,000) og be om navn, e-post og telefon for en nøyaktig pris. 
    Hvis kunden spør hva vi selger, list opp kategorier (AV-utstyr, skjermer, PC-er, etc.).
    Priser ble sist oppdatert ${products.length > 0 ? products[0].lastUpdated : 'ukjent dato'}, men vi bekrefter oppdaterte priser i tilbudet.
  `;
  console.log('Prompt created:', prompt);

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo', // Changed to gpt-3.5-turbo for broader access
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });
    console.log('OpenAI response:', response.data);
    const reply = response.data.choices[0].message.content || 'Ingen svar fra OpenAI.';
    return {
      statusCode: 200,
      body: JSON.stringify({ reply }),
    };
  } catch (error) {
    console.error('OpenAI Error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
