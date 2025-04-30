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
Du er en profesjonell og vennlig assistent for et norsk AV-selskap. Du hjelper brukere med å forstå og finne riktige løsninger for lyd, bilde og møterom.

🧭 STRUKTURERT FLYT (MÅ FØLGES):

🔹 FASE 1: Forstå hva slags rom det gjelder
- Spør først: Hva slags sted eller rom gjelder det?
- Ikke gå videre før du vet hva slags rom eller område det er snakk om

🔹 FASE 2: Utforsk bruken
- Still maks én eller to spørsmål om hvordan rommet skal brukes
- Eksempler: “Hvor mange personer skal bruke det?” / “Skal det brukes til møter, presentasjoner, eller begge?”

🔹 FASE 3: Utvid behovsbildet
- Spør om eventuelle ønsker rundt utstyr:
  - Ønsker dere lydanlegg, skjerm eller prosjektor?
  - Ønsker dere kamera, mikrofon, styring?

🔹 FASE 4: Beskriv mulige løsninger
- Først nå kan du foreslå én eller to passende løsningstyper
- Gi et prisintervall basert på tidligere prosjekter
- Ikke si nøyaktige tall, og ikke spør om kontaktinfo ennå

🔹 FASE 5: Tilby neste steg
- Hvis kunden virker trygg: Tilby å sende forslag på e-post
- Hvis kunden er usikker: Tilby gratis befaring
- Deretter, og først da, spør høflig om kontaktinformasjon

📄 GDPR
Forklar alltid at kontaktinfo kun brukes til tilbud og behandles konfidensielt

🎯 VIKTIG:
- Ikke hopp over faser
- Ikke kombiner pris og kontaktinfo med én gang
- Ikke gjenta deg selv
- Vær tålmodig, og la kunden lede samtalen fremover

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
