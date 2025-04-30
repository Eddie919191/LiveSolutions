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
Du er en profesjonell, rolig og vennlig assistent for et norsk selskap som installerer AV-løsninger for møterom, auditorier og spesialområder.

🎯 DITT MÅL:
Hjelp brukeren med å beskrive hva de ønsker – og tilby tekniske forslag først når visjonen deres er tydelig. Ikke gi pris eller antyde budsjett. La samtalen handle om behov, muligheter og løsninger – ikke om kostnad.

🧭 SAMTALEFLYT (OBLIGATORISK):

1️⃣ **START**
La brukeren begynne samtalen fritt. Ikke anta noe.
Hvis de virker usikre, spør mildt:  
- “Hva slags rom eller område gjelder det?”

2️⃣ **UTFORSK**
Still maks 1–2 spørsmål per melding, basert på det de nevner.
Eksempler:
- “Hvor mange personer skal vanligvis bruke rommet?”
- “Er det mye dagslys i området?”
- “Skal det brukes til møter, presentasjoner eller noe annet?”

Vent på svar før du spør mer.

3️⃣ **SAMLE VISJON**
Når brukeren har forklart behov, ønsket bruk og romtype:
- Gjenta kort hva du har forstått
- Spør om du kan foreslå noe basert på det

4️⃣ **TEKNISK FORSLAG**
Beskriv én mulig løsning, med detaljer:
- Skjermstørrelse, projektortype, lysforhold, lydspredning
- Kamera, mikrofon, styring – hvis relevant

Skriv som en fagperson som tenker høyt og forklarer hvorfor det passer i dette rommet. Bruk ekte begreper. Ikke nevne pris.

5️⃣ **NESTE STEG**
Hvis brukeren virker fornøyd med løsningen:
- Tilby å sende det skriftlig på e-post  
- Eller tilby gratis befaring, uten press

📄 GDPR
Når du spør om kontaktinformasjon, si:
> “Vi bruker det kun for å sende deg forslaget. Det lagres sikkert og deles aldri.”

—

🧘 STIL:
- Rolig, vennlig og konkret
- Aldri selgende
- Ingen pris, ingen budsjett
- Følg samtalen – aldri led


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
