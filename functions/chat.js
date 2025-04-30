const OpenAI = require('openai');
// const avPackages = require('./packages'); // ← Husk å opprette packages.js

exports.handler = async (event) => {
  console.log('Function invoked:', event);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { message, chatHistory, products, bills } = JSON.parse(event.body);

  if (!process.env.OPENAI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing OPENAI_API_KEY' }) };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Hvis første melding er 'welcome' → send ferdig intro
  if (message.toLowerCase() === 'welcome') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        reply: `Hei og hjertelig velkommen til LS! 👋\n\nVi leverer ferdige møteromsløsninger med alt av AV-utstyr du trenger. Du kan gjerne skrive fritt, eller bare si hei – så hjelper jeg deg steg for steg.\n\nØnsker du hjelp med å finne riktig løsning, eller vet du allerede hva du er ute etter?`
      })
    };
  }

  const systemInstructions = `
Du er en virtuell assistent for et norsk selskap som leverer AV-løsninger for kontorer og møterom. Bruk følgende stil og regler:

🧠 TONE OG STIL:
- Svar rolig, profesjonelt og vennlig.
- Maks 1–2 spørsmål om gangen.
- Bruk punktlister hvis det er flere valg.
- Del opp lange avsnitt i lesbare biter.
- Unngå gjentakelse – ikke still samme spørsmål på nytt.

🎯 FORMÅL:
- Finn ut hva kunden trenger.
- Foreslå løsninger (inkludert ferdige AV-pakker).
- Gi prisintervaller, men aldri eksakte tall.
- Når relevant, spør om navn og kontaktinfo for tilbud.
- Hvis kunden er usikker, tilby befaring.

🎁 TILGJENGELIGE AV-PAKKER:
${avPackages.map(p => `• ${p.name}: ${p.description} (${p.priceRange})`).join('\n')}
`;

  // Meldingshistorikk
  const messages = [
    { role: 'system', content: systemInstructions }
  ];

  if (products && products.length > 0) {
    messages.push({
      role: 'system',
      content: `Tilgjengelige produkter: ${products.map(p => `${p.name} (${p.price} NOK)`).join(', ')}`
    });
  }

  if (bills && bills.length > 0) {
    messages.push({
      role: 'system',
      content: `Tidligere leveranser: ${bills.map(b => `${b.roomType}: ${b.totalPrice} NOK`).join(', ')}`
    });
  }

  if (chatHistory && Array.isArray(chatHistory)) {
    chatHistory.forEach(entry => {
      if (entry.role === 'user' || entry.role === 'assistant') {
        messages.push({
          role: entry.role,
          content: entry.content
        });
      }
    });
  }

  messages.push({
    role: 'user',
    content: message
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 800
    });

    const reply = response.choices[0].message.content || 'Ingen svar fra OpenAI.';
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
