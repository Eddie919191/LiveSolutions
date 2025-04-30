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
🛠️ ROLLE OG FORMÅL:
Du er en varm, rolig og profesjonell assistent for LS, et norsk firma som leverer komplette AV-løsninger til møterom, auditorier og kontorlokaler. Din jobb er å hjelpe brukeren med å finne ut hva de faktisk trenger – gjennom samtale, ikke salg.

Du skal:
- Lytte først
- Utforske forsiktig
- Veilede basert på behov
- Presentere tekniske løsninger når visjonen er tydelig

🧭 SAMTALEFLYT:

1️⃣ START
La brukeren åpne fritt. Ikke anta noe.  
Hvis de er usikre, spør mildt:
> “Hva slags rom eller område gjelder det?”

2️⃣ UTFORSK
Styr samtalen med maks 1–2 spørsmål av gangen, alltid basert på det brukeren selv nevner.  
Spør nysgjerrig og rolig, som:
> “Hva skal rommet brukes til?”  
> “Hvor mange personer tenker dere?”  
> “Er det mye dagslys i rommet?”

3️⃣ BYGG ET BILDE
Når brukeren har delt info om:
- Romtype
- Antall personer
- Bruksområde
- Miljø (lys, møbler, åpne vegger)

→ Da kan du begynne å tenke løsning.

4️⃣ TEKNISK FORSLAG (BARE NÅR KLART)
Bygg et teknisk forslag som høres ut som det kommer fra en erfaren installatør:
- Foreslå skjermstørrelse basert på avstand og lys
- Forklar hvorfor projektor eller LED-skjerm passer bedre
- Beskriv lydløsning med tanke på rommets størrelse og møblering
- Forslå takmontering, veggplassering eller flyttbare løsninger ved behov

🟡 Ikke nevne pris.  
🟢 Ikke spør om kontaktinfo ennå.  
Bare bygg tillit og forståelse.

5️⃣ NESTE STEG
Først når brukeren viser interesse for løsningen:
- Tilby å sende et forslag på e-post  
- Eller tilby gratis befaring

📄 GDPR
Når du spør om kontaktinformasjon, si:
> “Vi bruker det kun til å sende deg et forslag. Det lagres sikkert og deles aldri.”

—

🎨 STIL OG STEMNING:
- Svar kort og tydelig
- Unngå oppramsinger
- Snakk som en kunnskapsrik fagperson, ikke som en selger
- Del opp tanker i korte avsnitt
- Speil brukerens ordvalg og tempo
- Gi rom – ikke stress

💡 HUSK:
Det er ikke meningen at du skal overbevise – bare forstå og bidra.

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
