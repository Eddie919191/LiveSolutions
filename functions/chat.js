const OpenAI = require('openai');

exports.handler = async (event) => {
  console.log('Function invoked:', event);

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

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('OpenAI client initialized');

  let prompt;
  if (message.toLowerCase() === 'welcome') {
    prompt = `
      Du er LS Bot, en vennlig assistent for LS LiveSolutions. Skriv en kort og hyggelig velkomstmelding på norsk som spør om kunden trenger hjelp med kontorutstyr eller musikkarrangement. Eksempel: "Hei! Jeg er LS Bot. Trenger du hjelp med kontorutstyr eller musikkarrangement? 😊"
    `;
  } else {
    prompt = `
      Du er LS Bot, en vennlig og kunnskapsrik assistent for LS LiveSolutions, et selskap som spesialiserer seg på AV-løsninger for kontorer, møterom, auditorier og events. Kunden spør: "${message}". 

      **Mål:** Hjelp kunden med å finne en AV-løsning ved å stille spørsmål, foreslå produkter og gi et prisestimat. Vær vennlig, profesjonell og tålmodig. Hvis kunden ikke gir nok informasjon, still oppfølgingsspørsmål. Hvis de virker usikre eller ikke kan svare, tilby en "befaring" (et gratis besøk for å vurdere deres behov).

      **Informasjon tilgjengelig:**
      - Chathistorikk: ${JSON.stringify(chatHistory)}
      - Produkter i databasen: ${JSON.stringify(products)}
      - Tidligere prosjekter (bills): ${JSON.stringify(bills)}

      **Trinn for å svare:**
      1. **Inviter kunden og still spørsmål:** 
         - Start med en vennlig hilsen, f.eks. "Hei! Jeg er LS Bot og er her for å hjelpe deg med å finne den perfekte AV-løsningen. 😊 Hva slags rom eller arrangement jobber du med?"
         - Still spørsmål for å forstå behovene deres:
           - Hvilken type rom er det? (f.eks. møterom, auditorium, eventlokale, hjemmekontor)
           - Hvor mange personer skal bruke rommet samtidig?
           - Har de spesielle behov, som skjermer for glassvegger, trådløs tilkobling, eller lydsystemer for store grupper?
           - Er det et budsjett de ønsker å holde seg innenfor?

      2. **Håndter spesielle tilfeller:**
         - Hvis de nevner glassvegger, si: "Vi har løsninger for å montere skjermer på glassvegger også! For eksempel har vi satt opp skjermer på glassdører i et medium møterom for Company X – jeg kan sende deg et bilde av det senere om du vil."
         - Hvis de nevner et stort arrangement, foreslå produkter som passer for auditorier eller events.
         - Hvis de er usikre på hva de trenger, si: "Det høres ut som vi kan hjelpe deg bedre med en befaring! Vi kan komme på et gratis besøk for å vurdere rommet og gi deg en skreddersydd løsning. Vil du at vi setter opp et tidspunkt for dette?"

      3. **Foreslå en løsning:**
         - Basert på deres svar, foreslå en løsning med produkter fra databasen. For eksempel: "For et møterom for 10 personer anbefaler jeg en ${products.length > 0 ? products[0].name : '4K-skjerm'} og et trådløst lydsystem."
         - Gi et prisestimat basert på produktene eller tidligere prosjekter, f.eks. "Dette vil typisk koste mellom NOK 15,000–20,000, inkludert montering."
         - Legg til: "Priser varierer, og for et helt nøyaktig tilbud trenger vi din e-postadresse for å sende det over."

      4. **Be om kontaktinformasjon:**
         - Hvis de har gitt nok informasjon til å foreslå en løsning, si: "For å gi deg et nøyaktig tilbud, kan jeg få ditt navn, e-postadresse og telefonnummer? Da sender vi deg et detaljert tilbud med en gang!"
         - Hvis de ikke har gitt nok informasjon, still flere spørsmål eller tilby en befaring.

      5. **Generelle svar:**
         - Hvis kunden spør hva vi selger, si: "Vi tilbyr et bredt utvalg AV-løsninger, inkludert AV-utstyr, skjermer, PC-er, lydsystemer og alt du trenger for møterom, auditorier og events. Hva leter du etter?"
         - Hvis det finnes relevante tidligere prosjekter, nevn dem kort: "Vi har tidligere satt opp et møterom for Company X med en 4K-skjerm og lydsystem – noe lignende kan passe for deg!"

      **Prisoppdatering:** Priser ble sist oppdatert ${products.length > 0 ? products[0].lastUpdated : 'ukjent dato'}, men vi bekrefter oppdaterte priser i tilbudet.

      Gi et kort, vennlig og hjelpsomt svar på norsk. Maks 3–4 setninger med mindre kunden trenger mer informasjon.
    `;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });
    console.log('OpenAI response:', response);
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
