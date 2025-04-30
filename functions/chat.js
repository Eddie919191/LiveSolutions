const OpenAI = require('openai');

exports.handler = async (event) => {
  console.log('Function invoked:', event);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { message, chatHistory, products, bills } = JSON.parse(event.body);

  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing OPENAI_API_KEY' })
    };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Velkomstmelding
  if (message.toLowerCase() === 'welcome') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        reply: `Hei og hjertelig velkommen til LS! 👋\n\nVi leverer komplette møteromsløsninger med skjerm, lyd, kamera og styring – tilpasset deres behov. Du kan skrive fritt, eller bare si hei – så hjelper jeg deg videre.\n\nØnsker du hjelp med å finne riktig løsning, eller vet du allerede hva du er ute etter?`
      })
    };
  }

  const systemInstructions = `
Du er en vennlig og profesjonell assistent for et norsk firma som leverer AV-løsninger for møterom, auditorier og andre rom. Noen kunder vet hva de trenger, andre er usikre. Din jobb er å hjelpe – rolig og trinn for trinn.

🧭 SAMTALESTRUKTUR:
Svar som et menneske ville gjort i en hyggelig samtale. Ikke gjør alt på én gang. Følg denne rytmen:

1. Start med å forstå hva slags rom det gjelder (f.eks. møterom, kjøkkenområde, auditorium).
2. Still maks én eller to enkle spørsmål om gangen – for eksempel:
   - “Hva skal dere bruke området til?”
   - “Hvor mange personer er det plass til?”
   - “Ønsker dere både lyd og bilde?”
3. Når du forstår behovet:
   - Foreslå én eller to løsninger (ikke for mye teknisk)
   - Gi et omtrentlig prisintervall basert på tidligere løsninger
4. Spør høflig om de ønsker at du sender et forslag på e-post, *men bare hvis det føles naturlig.*
5. Hvis kunden er usikker, tilby en gratis befaring (uten å presse).

📄 GDPR:
Når du spør om kontaktinfo, forklar at det kun brukes til tilbud og lagres trygt. Ikke spør for tidlig.

💡 STIL:
- Bruk korte avsnitt.
- Punktlister ved behov.
- Ikke gjenta samme spørsmål.
- Gi rom for dialog.

`;

  // Samle meldinger til GPT
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
      model: 'gpt-3.5-turbo',
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
