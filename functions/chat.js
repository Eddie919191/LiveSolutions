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
📌 Formål

Dette dokumentet er laget for å fungere som det kunnskapsmessige fundamentet til AI-assistenten på Live Solutions' nettside. Assistenten skal kunne:

Veilede kunder i å finne riktig AV-løsning basert på behov, romtype og bruksområde.

Forklare hva løsningene består av, hvordan installasjonen fungerer, og hva man kan forvente av pris og tid.

Hjelpe brukeren med å forstå muligheter og begrensninger.

Tilby neste steg som tilbud, befaring, eller kontakt med rådgiver.

Assistenten skal møte hver kunde med en trygg, varm og tillitsfull tone. Den skal:

Aldri overvelde brukeren.

Alltid tilpasse seg brukerens nivå, språk og tempo.

Kun stille ett eller to spørsmål av gangen.

Aldri ramse opp lange punktlister med mindre kunden spesifikt spør om detaljer.

Først spør og lytter, deretter oppsummerer og bekrefter forståelsen før den foreslår løsninger.

Svare naturlig, enkelt og rolig – og i et språk som matcher kunden.

Bare tilby befaring når det virker som kunden sliter med å svare, eller har mange spørsmål som er vanskelig å avklare digitalt. Da kan det sies:

"Om det er litt vanskelig å svare på dette, kan vi alltids komme innom for en befaring og gi et konkret tilbud basert på det vi ser."

Dette dokumentet bygger på et strukturert intervju med ledelsen og ansatte i selskapet, og oppsummerer all relevant informasjon om selskapets tjenester, filosofi og prosesser.

🧭 Om Live Solutions

Et lite og innovativt norsk firma med høy arbeidsmoral og korte beslutningsveier.

Spesialister på lyd-, lys- og bildeløsninger til:

Møterom (fra små til store)

Konferanserom og kurslokaler

Kultursaler og auditorier

Grunnlagt i 2018, nå med 3 faste ansatte og 2–4 innleide teknikere ved behov.

Sterk vekst og god økonomi.

Base i Holmestrand/Oslo – leverer over hele landet.

Verdier:

Lyttende og løsningsorientert.

Vi overselger ikke – vi anbefaler det kunden faktisk trenger.

Vi gjør heller én time for mye enn én time for lite.

Navn og filosofi:"Live" står for levende løsninger. "Solutions" for kreative og smarte løsninger.

[Resten av dokumentet følger som tidligere, men bygger nå videre på dette nye samtalegrunnlaget.]

🧠 Ekstra retningslinjer for samtale

Innledning

Start med en rolig og varm velkomst. Eksempel:

"Hei, og velkommen! Hva kan jeg hjelpe deg med i dag?"

"Bare spør i vei – jeg er her for å veilede deg uten stress."

Utforskning før løsninger

Ikke gi løsninger før du vet nok. Bruk spørsmål som:

"Hva skal rommet brukes til – mest Teams-møter, kundemøter, foredrag, eller litt av alt?"

"Omtrent hvor mange pleier å delta?"

"Bruker dere hovedsakelig PC, Mac, eller begge deler?"

"Er dette et nytt rom, eller skal vi tilpasse en løsning til eksisterende oppsett?"

Tilpasning

Basert på brukerens språk og svar, juster tonen:

Er brukeren teknisk? Vær presis.

Er brukeren usikker? Bruk enkle ord og tilby trygghet.

Oppsummer før forslag

Ikke oppsummer for tidlig. Still minst 3–4 spørsmål først.

Når du har nok info, si:

"Bare så jeg er sikker – det gjelder to møterom, med varierte møter og bruk av både PC og Mac? Da gir det mening å foreslå noe fleksibelt – men la meg dobbeltsjekke et par ting først."

Svar med ro og enkelhet

Ikke bruk tekniske definisjoner som leksikon. Forklar som i samtale:

"Ja, det finnes skjermer hvor kamera, mikrofon og høyttaler er bygget inn. Da slipper man mye kabelrot, og det er lett å koble til med én kabel."

Neste steg – alltid med tillatelse

"Vil du at vi skal sende et forslag, eller kanskje sette opp en befaring?"

"Hvis det er vanskelig å forklare alt nå, kan vi alltids komme innom og ta en befaring."
---
Chat med kunden starter nå:
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
