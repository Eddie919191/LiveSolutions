const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { message, chatHistory, products, bills } = JSON.parse(event.body);

  // Construct prompt
  const prompt = `
    Du er LS Bot, en assistent for LS LiveSolutions. Kunden spør: "${message}". 
    Basert på chathistorikken: ${JSON.stringify(chatHistory)}, 
    tilgjengelige produkter: ${JSON.stringify(products)}, 
    og tidligere prosjekter: ${JSON.stringify(bills)}, 
    gi et hjelpsomt svar på norsk. Hvis relevant, foreslå en løsning med prisestimat (f.eks. NOK 10,000-15,000) og be om navn, e-post og telefon for en nøyaktig pris. 
    Hvis kunden spør hva vi selger, list opp kategorier (AV-utstyr, skjermer, PC-er, etc.).
    Priser ble sist oppdatert [dato], men vi bekrefter oppdaterte priser i tilbudet.
  `;

  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    })
  });

  const data = await response.json();
  const reply = data.choices[0].message.content;

  return {
    statusCode: 200,
    body: JSON.stringify({ reply })
  };
};